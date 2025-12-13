// TriageXpert — Test Lab
import registry from './modules/ctas_full_registry.js';

function loadCustomModules(){
  try{
    const raw = localStorage.getItem('TX_CUSTOM_MODULES');
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => x && x.id && x.title && Array.isArray(x.modifiers)) : [];
  }catch(e){ return [] }
}

const ALL_MODULES = [...registry, ...loadCustomModules()];

const els = {
  file: document.getElementById('file'),
  fileHint: document.getElementById('fileHint'),
  run: document.getElementById('run'),
  reset: document.getElementById('reset'),
  status: document.getElementById('status'),

  optAutoModule: document.getElementById('optAutoModule'),
  optAutoMods: document.getElementById('optAutoMods'),
  optStrictApp: document.getElementById('optStrictApp'),
  optSafetyMin: document.getElementById('optSafetyMin'),

  kpiRows: document.getElementById('kpiRows'),
  kpiValid: document.getElementById('kpiValid'),
  kpiAcc: document.getElementById('kpiAcc'),
  kpiBAcc: document.getElementById('kpiBAcc'),
  kpiUnder: document.getElementById('kpiUnder'),
  kpiOver: document.getElementById('kpiOver'),

  topPatterns: document.getElementById('topPatterns'),
  tbody: document.getElementById('tbody'),

  filterMismatch: document.getElementById('filterMismatch'),
  filterUnder: document.getElementById('filterUnder'),
  filterOver: document.getElementById('filterOver'),
  search: document.getElementById('search'),

  dlJson: document.getElementById('dlJson'),
  dlCsv: document.getElementById('dlCsv'),
  dlHtml: document.getElementById('dlHtml'),

  chartDist: document.getElementById('chartDist'),
  chartMismatch: document.getElementById('chartMismatch'),
};

let RAW_ROWS = [];
let RESULTS = [];
let REPORT = null;

let chartDist = null;
let chartMismatch = null;

// --- Prevent “runaway” page scrolling when interacting with charts (mobile / touch screens) ---
// iOS/Safari can start scrolling on touchstart BEFORE touchmove, so stopping touchmove alone is not enough.
// We solve it in a way that doesn't affect your other pages:
// 1) test_lab.html uses a local #scrollRoot overflow container (inline CSS) so body doesn't scroll.
// 2) While touching a chart canvas, we temporarily disable scrolling on #scrollRoot (fallback: lock <body>).

const __TX_SCROLL_LOCK = {
  locked: false,
  y: 0,
  root: null,
  prev: null,
  globalHooksInstalled: false,
};

function getScrollRoot(){
  if(__TX_SCROLL_LOCK.root !== null) return __TX_SCROLL_LOCK.root;
  const el = document.getElementById('scrollRoot');
  __TX_SCROLL_LOCK.root = el || null;
  return __TX_SCROLL_LOCK.root;
}
function getScrollY(){
  const r = getScrollRoot();
  if(r) return r.scrollTop;
  return window.scrollY || document.documentElement.scrollTop || 0;
}
function setScrollY(y){
  const r = getScrollRoot();
  if(r) r.scrollTop = y;
  else window.scrollTo(0, y);
}

function lockPageScroll(){
  if(__TX_SCROLL_LOCK.locked) return;
  __TX_SCROLL_LOCK.locked = true;
  __TX_SCROLL_LOCK.y = getScrollY();

  const r = getScrollRoot();
  if(r){
    __TX_SCROLL_LOCK.prev = {
      overflow: r.style.overflow,
      touchAction: r.style.touchAction,
      overscrollBehavior: r.style.overscrollBehavior,
    };
    r.style.overflow = 'hidden';
    r.style.touchAction = 'none';
    r.style.overscrollBehavior = 'none';
  }else{
    // Fallback (if #scrollRoot isn't present): lock <body> (iOS-safe)
    const body = document.body;
    const html = document.documentElement;
    __TX_SCROLL_LOCK.prev = {
      bodyPos: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${__TX_SCROLL_LOCK.y}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
  }

  if(!__TX_SCROLL_LOCK.globalHooksInstalled){
    __TX_SCROLL_LOCK.globalHooksInstalled = true;
    const unlock = ()=> unlockPageScroll();
    window.addEventListener('touchend', unlock, {passive:true});
    window.addEventListener('touchcancel', unlock, {passive:true});
    window.addEventListener('pointerup', unlock, {passive:true});
    window.addEventListener('pointercancel', unlock, {passive:true});
    window.addEventListener('blur', unlock);
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) unlock(); });
  }
}

function unlockPageScroll(){
  if(!__TX_SCROLL_LOCK.locked) return;
  const y = __TX_SCROLL_LOCK.y || 0;
  const r = getScrollRoot();
  const prev = __TX_SCROLL_LOCK.prev || {};

  if(r){
    r.style.overflow = prev.overflow || '';
    r.style.touchAction = prev.touchAction || '';
    r.style.overscrollBehavior = prev.overscrollBehavior || '';
    __TX_SCROLL_LOCK.locked = false;
    __TX_SCROLL_LOCK.prev = null;
    setScrollY(y);
    return;
  }

  // fallback restore
  const body = document.body;
  const html = document.documentElement;
  body.style.position = prev.bodyPos || '';
  body.style.top = prev.bodyTop || '';
  body.style.left = prev.bodyLeft || '';
  body.style.right = prev.bodyRight || '';
  body.style.width = prev.bodyWidth || '';
  body.style.overflow = prev.bodyOverflow || '';
  html.style.overflow = prev.htmlOverflow || '';
  __TX_SCROLL_LOCK.locked = false;
  __TX_SCROLL_LOCK.prev = null;
  window.scrollTo(0, y);
}

function bindChartScrollGuards(canvas){
  if(!canvas) return;

  // CSS hint (also set in HTML, but keep it here as a safety net)
  try{
    canvas.style.touchAction = 'none';
    canvas.style.overscrollBehavior = 'contain';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.userSelect = 'none';
  }catch(_e){}

  const start = (e)=>{
    // prevent the browser from starting a scroll chain from this touch
    if(e && e.cancelable) e.preventDefault();
    lockPageScroll();
  };
  const end = ()=> unlockPageScroll();

  // Touch (iOS)
  canvas.addEventListener('touchstart', start, {passive:false});
  canvas.addEventListener('touchmove', (e)=>{ if(e.cancelable) e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchend', end, {passive:true});
  canvas.addEventListener('touchcancel', end, {passive:true});

  // Pointer events (modern browsers)
  canvas.addEventListener('pointerdown', start, {passive:false});
  canvas.addEventListener('pointerup', end, {passive:true});
  canvas.addEventListener('pointercancel', end, {passive:true});

  // Trackpad / mouse wheel
  canvas.addEventListener('wheel', (e)=>{ if(e.cancelable) e.preventDefault(); }, {passive:false});
}

// --- XLSX loader (prevents "XLSX is not defined" when a CDN is blocked) ---
function loadScriptOnce(src){
  return new Promise((resolve, reject)=>{
    // Don't inject duplicates
    if([...(document.scripts||[])].some(s => (s.src||'') === src)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(s);
  });
}

async function ensureXLSX(){
  // If the library is already there, use it
  if(window.XLSX) return window.XLSX;

  // Try a few CDNs (some hospital networks block jsdelivr)
  const sources = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.3/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.3/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.3/xlsx.full.min.js',
  ];

  for(const src of sources){
    try{
      await loadScriptOnce(src);
      if(window.XLSX) return window.XLSX;
    }catch(_e){
      // try next source
    }
  }

  throw new Error(
    'XLSX library is not available. Your network may be blocking CDNs. ' +
    'Fix: upload a CSV instead (Excel → Save As → CSV), or host xlsx.full.min.js locally and include it in test_lab.html.'
  );
}

function setStatus(msg){ els.status.textContent = msg; }

function toStr(x){ return (x===null||x===undefined) ? '' : String(x); }

function yes(v){
  const s = toStr(v).trim().toLowerCase();
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}
function no(v){
  const s = toStr(v).trim().toLowerCase();
  return s === 'no' || s === 'n' || s === 'false' || s === '0';
}
function num(v){
  const s = toStr(v).replace(/[^\d.\-]/g,'').trim();
  if(!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function parseBP(v){
  const s = toStr(v).trim();
  if(!s || s==='-' ) return {sbp:null, dbp:null};
  const m = s.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if(!m) return {sbp:null, dbp:null};
  return {sbp: Number(m[1]), dbp: Number(m[2])};
}
function parseCTAS(v){
  const s = toStr(v).trim().toUpperCase();
  if(!s) return null;
  const m = s.match(/CTAS\s*([1-5])/i);
  if(m) return Number(m[1]);
  const n = Number(s);
  if(Number.isFinite(n) && n>=1 && n<=5) return n;
  return null;
}

function tokenizeComplaint(text){
  const s = toStr(text).toLowerCase();
  if(!s) return [];
  return s
    .replace(/[._]/g,' ')
    .replace(/\s+/g,' ')
    .split(/[,/;]+|\band\b|\+|\&/g)
    .map(t=>t.trim())
    .filter(Boolean);
}

function suspectedInfectionFromCC(cc){
  const s = toStr(cc).toLowerCase();
  return /(fever|shiver|rigor|cough|sore\s*throat|flu|pneum|uti|urinary|sepsis|diarrh|vomit|abdominal)/i.test(s);
}

/** Module matching (best-effort) */
function scoreModule(mod, q){
  const title = toStr(mod.title).toLowerCase();
  const kws = (mod.keywords||[]).map(k=>toStr(k).toLowerCase());
  let score = 0;

  if(title.includes(q)) score += 6;
  // keyword exact-ish boost
  for(const k of kws){
    if(k === q) score += 8;
    else if(k.includes(q) && q.length>=3) score += 4;
  }
  // word boundary boost
  if(new RegExp(`\\b${escapeRegExp(q)}\\b`).test(title)) score += 2;
  for(const k of kws){
    if(new RegExp(`\\b${escapeRegExp(q)}\\b`).test(k)) score += 2;
  }
  return score;
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function pickBestModulesFromComplaint(cc, max=2){
  const tokens = tokenizeComplaint(cc);
  const candidates = new Map(); // id -> score
  for(const t of (tokens.length? tokens : [toStr(cc).toLowerCase().trim()])){
    const q = t.trim();
    if(!q) continue;
    for(const m of ALL_MODULES){
      const s = scoreModule(m, q);
      if(s<=0) continue;
      candidates.set(m.id, (candidates.get(m.id)||0) + s);
    }
  }
  // fallback: whole string search
  if(candidates.size===0){
    const q = toStr(cc).toLowerCase().trim();
    for(const m of ALL_MODULES){
      const s = scoreModule(m, q);
      if(s>0) candidates.set(m.id, s);
    }
  }
  const ranked = Array.from(candidates.entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0, max)
    .map(([id,score])=>{
      const mod = ALL_MODULES.find(x=>x.id===id);
      return { id, score, title: mod?.title||id, mod };
    });
  return ranked;
}

/** Choose a “default” modifier when data doesn't provide it (optional). */
function chooseDefaultModifiers(primaryMod, rec){
  const out = [];
  if(!primaryMod || !Array.isArray(primaryMod.modifiers) || !primaryMod.modifiers.length) return out;

  const mid = primaryMod.id;
  const mods = primaryMod.modifiers;

  // 1) Very obvious "cardiac arrest" override (dataset spelling variants)
  const cc = toStr(rec.cc).toLowerCase();
  if(/carda?iac\s+arrest|carrdiac\s+arrest/.test(cc)){
    out.push({ mid: 'OVERRIDE', sid: 'cardiac_arrest', label: 'Cardiac arrest (override)', ctas: 1, assumed: false });
    return out;
  }

  // 2) Chest pain: use cardiac hx if available, else pick low-risk
  if(mid.includes('chest_pain')){
    const cardiacHx = !!rec.hxCardiac;
    const pickId = cardiacHx ? findFirst(mods, ['cardiac_features','ischemia_signs']) : findFirst(mods, ['cardiac_mild','pleuritic','msk']);
    const pick = pickId ? mods.find(x=>x.id===pickId) : null;
    if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
    return out;
  }

  // 3) Trauma/fracture: use deformity/pain if we have them
  if(/fracture|trauma|laceration|puncture|burn/.test(mid)){
    if(rec.deformity){
      const id = findFirst(mods, ['open_fracture','open_or_nv_compromise','deformity_pain_high','deformity_severe_pain']);
      const pick = id ? mods.find(x=>x.id===id) : null;
      if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
      return out;
    }
    // if bleeding keywords in CC → active bleeding
    if(/bleed|cut|lacer|wound/.test(cc)){
      const id = findFirst(mods, ['active_bleeding','neurovasc','sutures_required']);
      const pick = id ? mods.find(x=>x.id===id) : null;
      if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
      return out;
    }
    // otherwise pick the most “stable” modifier (max CTAS)
    const pick = pickStable(mods);
    if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
    return out;
  }

  // 4) Seizure: use GCS if low; else “now well”
  if(mid === 'seizure'){
    if(rec.gcs !== null && rec.gcs <= 13){
      const id = findFirst(mods, ['status','ongoing','post_ictal_unwell','first_seizure_unwell','gcs_low']);
      const pick = id ? mods.find(x=>x.id===id) : null;
      if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
      return out;
    }
    const id = findFirst(mods, ['first_seizure_well','known_now_well','resolved']);
    const pick = id ? mods.find(x=>x.id===id) : null;
    if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
    return out;
  }

  // Default: pick stable
  const pick = pickStable(mods);
  if(pick) out.push({ mid, sid: pick.id, label: pick.label, ctas: Number(pick.effect?.ctas), assumed: true });
  return out;
}

function findFirst(mods, ids){
  for(const id of ids){
    if(mods.some(x=>x.id===id)) return id;
  }
  return null;
}
function pickStable(mods){
  const withCtas = mods
    .map(m => ({...m, ctas: Number(m.effect?.ctas)}))
    .filter(m => Number.isFinite(m.ctas));
  if(!withCtas.length) return null;
  // stable = least urgent = max CTAS
  withCtas.sort((a,b)=>b.ctas-a.ctas);
  return withCtas[0];
}

function lowestCTAS(values){
  const filtered = values.filter(v => Number.isFinite(v) && v >= 1 && v <= 5);
  return filtered.length ? Math.min(...filtered) : null;
}

/** Vitals effects (includes Shock Index + qSOFA + SIRS) */
function computeVitalsEffectsFromRecord(rec){
  const effects = [];

  // Basic: GCS
  if(rec.gcs !== null){
    if(rec.gcs <= 9) effects.push({source:'GCS', detail:`GCS ${rec.gcs}`, ctas:1});
    else if(rec.gcs >=10 && rec.gcs <=13) effects.push({source:'GCS', detail:`GCS ${rec.gcs}`, ctas:2});
  }

  // SpO2
  if(rec.spo2 !== null){
    if(rec.spo2 < 90) effects.push({source:'Respiratory', detail:`SpO₂ ${rec.spo2}%`, ctas:1});
    else if(rec.spo2 < 92) effects.push({source:'Respiratory', detail:`SpO₂ ${rec.spo2}%`, ctas:2});
    else if(rec.spo2 <= 94) effects.push({source:'Respiratory', detail:`SpO₂ ${rec.spo2}%`, ctas:3});
  }

  // Hypertension (no symptom flag in dataset)
  if(rec.sbp !== null || rec.dbp !== null){
    const SBP = rec.sbp||0, DBP = rec.dbp||0;
    if(SBP >= 220 || DBP >= 130) effects.push({source:'Hypertension', detail:`Very high BP ${SBP}/${DBP}`, ctas:3});
    else if((SBP >= 200 && SBP < 220) || (DBP >=110 && DBP <130)) effects.push({source:'Hypertension', detail:`High BP ${SBP}/${DBP}`, ctas:4});
  }

  // Glucose (RBS assumed mmol/L)
  if(rec.glucose !== null){
    if(rec.glucose < 3) effects.push({source:'Glucose', detail:`<3 mmol/L`, ctas:3});
    else if(rec.glucose > 18) effects.push({source:'Glucose', detail:`>18 mmol/L`, ctas:3});
  }

  // Fever (appearance flags not available → default CTAS4)
  if(rec.temp !== null){
    if(rec.temp >= 38) effects.push({source:'Fever', detail:`Temp ${rec.temp}°C`, ctas:4});
    else if(rec.temp < 36) effects.push({source:'Hypothermia', detail:`Temp ${rec.temp}°C`, ctas:3});
  }

  // Shock Index
  if(rec.hr !== null && rec.sbp !== null && rec.sbp > 0){
    const si = rec.hr / rec.sbp;
    if(si >= 1.3) effects.push({source:'Shock Index', detail:`SI ${si.toFixed(2)} (high)`, ctas:1});
    else if(si >= 1.0) effects.push({source:'Shock Index', detail:`SI ${si.toFixed(2)} (elevated)`, ctas:2});
    else if(si >= 0.9) effects.push({source:'Shock Index', detail:`SI ${si.toFixed(2)} (borderline)`, ctas:3});
  }

  // qSOFA & SIRS (if suspected infection)
  const infect = suspectedInfectionFromCC(rec.cc);

  // qSOFA: RR>=22, SBP<=100, GCS<15
  let q = 0;
  if(rec.rr !== null && rec.rr >= 22) q++;
  if(rec.sbp !== null && rec.sbp <= 100) q++;
  if(rec.gcs !== null && rec.gcs < 15) q++;
  if(infect && q >= 2) effects.push({source:'qSOFA', detail:`qSOFA ${q} + suspected infection`, ctas:2});
  else if(infect && q === 1) effects.push({source:'qSOFA', detail:`qSOFA 1 + suspected infection`, ctas:3});

  // SIRS: Temp>38 or <36, HR>90, RR>20, WBC not available here
  let sirs = 0;
  if(rec.temp !== null && (rec.temp > 38 || rec.temp < 36)) sirs++;
  if(rec.hr !== null && rec.hr > 90) sirs++;
  if(rec.rr !== null && rec.rr > 20) sirs++;
  if(infect && sirs >= 3) effects.push({source:'SIRS', detail:`SIRS ${sirs} + suspected infection`, ctas:2});
  else if(infect && sirs >= 2) effects.push({source:'SIRS', detail:`SIRS ${sirs} + suspected infection`, ctas:3});

  return effects;
}

function predict(rec, opts){
  // base record fields already parsed
  const trace = {
    mrno: rec.mrno,
    chiefComplaint: rec.cc,
    pickedModules: [],
    selectedModifiers: [],
    vitalsEffects: [],
    mode: '',
    notes: [],
  };

  // override: cardiac arrest keywords → CTAS 1
  const cc = toStr(rec.cc).toLowerCase();
  if(/carda?iac\s+arrest|carrdiac\s+arrest/.test(cc)){
    trace.notes.push('Override rule: cardiac arrest keyword');
    return { predicted: 1, vitalsCTAS: lowestCTAS([]), modifiersCTAS: 1, trace };
  }

  // 1) modules
  if(opts.autoModule){
    trace.pickedModules = pickBestModulesFromComplaint(rec.cc, 2);
    if(!trace.pickedModules.length) trace.notes.push('No module matched from chief complaint keywords');
  }

  const primary = trace.pickedModules[0]?.mod || null;

  // 2) modifiers (optional)
  let modifiers = [];
  if(opts.autoMods && primary){
    modifiers = chooseDefaultModifiers(primary, rec);
    trace.selectedModifiers = modifiers;
  }

  const modifiersCTAS = lowestCTAS(modifiers.map(m=>m.ctas));

  // 3) vitals effects
  const vitals = computeVitalsEffectsFromRecord(rec);
  trace.vitalsEffects = vitals;
  const vitalsCTAS = lowestCTAS(vitals.map(v=>v.ctas));

  // 4) final
  let final = null;
  if(opts.safetyMin){
    final = lowestCTAS([modifiersCTAS, vitalsCTAS].filter(v=>v!==null));
    trace.mode = 'Safety override: min(modifiers, vitals)';
    if(modifiersCTAS!==null && vitalsCTAS!==null && vitalsCTAS < modifiersCTAS){
      trace.notes.push('Vitals suggested higher acuity than modifier (safety override applied).');
    }
  } else if(opts.strictApp){
    final = (modifiersCTAS !== null) ? modifiersCTAS : vitalsCTAS;
    trace.mode = 'Strict app logic: modifiers override vitals';
    if(modifiersCTAS!==null && vitalsCTAS!==null && vitalsCTAS < modifiersCTAS){
      trace.notes.push('Vitals suggested higher acuity but would be ignored in strict mode.');
    }
  } else {
    // default: min anyway
    final = lowestCTAS([modifiersCTAS, vitalsCTAS].filter(v=>v!==null));
    trace.mode = 'Default: min(modifiers, vitals)';
  }

  // if still null, assume CTAS 4 (no data)
  if(final === null) {
    final = 4;
    trace.notes.push('No modifier/vitals trigger → defaulted to CTAS 4');
  }

  return { predicted: final, vitalsCTAS, modifiersCTAS, trace };
}

function computeMetrics(rows){
  const valid = rows.filter(r => Number.isFinite(r.actual));
  const n = valid.length;
  const correct = valid.filter(r => r.pred === r.actual).length;
  const acc = n ? correct/n : 0;

  // confusion matrix [actual-1][pred-1]
  const M = Array.from({length:5}, ()=>Array.from({length:5}, ()=>0));
  for(const r of valid){
    const a = r.actual-1, p = r.pred-1;
    if(a>=0 && a<5 && p>=0 && p<5) M[a][p] += 1;
  }

  // per-class recall
  const recalls = [];
  for(let c=0;c<5;c++){
    const rowSum = M[c].reduce((s,x)=>s+x,0);
    const tp = M[c][c];
    recalls.push(rowSum ? tp/rowSum : null);
  }
  const bAcc = recalls.filter(x=>x!==null).reduce((s,x)=>s+x,0) / recalls.filter(x=>x!==null).length || 0;

  const under = valid.filter(r => r.pred > r.actual).length;
  const over  = valid.filter(r => r.pred < r.actual).length;

  // top patterns
  const pat = new Map();
  for(const r of valid){
    if(r.pred === r.actual) continue;
    const k = `${r.actual}→${r.pred}`;
    pat.set(k, (pat.get(k)||0) + 1);
  }
  const top = Array.from(pat.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);

  return { nRows: rows.length, nValid: n, acc, bAcc, under, over, matrix: M, topPatterns: top };
}

function distCounts(validRows, key){
  const out = {1:0,2:0,3:0,4:0,5:0};
  for(const r of validRows){
    const v = r[key];
    if(out[v] !== undefined) out[v] += 1;
  }
  return out;
}

function updateKPIs(metrics){
  els.kpiRows.textContent = metrics.nRows;
  els.kpiValid.textContent = metrics.nValid;
  els.kpiAcc.textContent = (metrics.acc*100).toFixed(1) + '%';
  els.kpiBAcc.textContent = (metrics.bAcc*100).toFixed(1) + '%';
  els.kpiUnder.textContent = metrics.under;
  els.kpiOver.textContent = metrics.over;
}

function buildTopPatternsHTML(top){
  if(!top.length) return `<span class="tag2 ok">No mismatches 🎉</span>`;
  return top.map(([k,v]) => `<div class="kpi"><div><div class="l">${k}</div><div class="tiny muted">${v} cases</div></div><div class="tag2 warn">pattern</div></div>`).join('');
}

function fmtVitals(rec){
  const parts = [];
  if(rec.sbp!==null || rec.dbp!==null) parts.push(`BP ${rec.sbp??'-'}/${rec.dbp??'-'}`);
  if(rec.temp!==null) parts.push(`T ${rec.temp}`);
  if(rec.hr!==null) parts.push(`HR ${rec.hr}`);
  if(rec.rr!==null) parts.push(`RR ${rec.rr}`);
  if(rec.spo2!==null) parts.push(`SpO₂ ${rec.spo2}`);
  if(rec.glucose!==null) parts.push(`RBS ${rec.glucose}`);
  if(rec.gcs!==null) parts.push(`GCS ${rec.gcs}`);
  if(rec.pain!==null) parts.push(`Pain ${rec.pain}`);
  return parts.join(' • ') || '—';
}

function buildRowHTML(r){
  const delta = (Number.isFinite(r.actual) && Number.isFinite(r.pred)) ? (r.pred - r.actual) : null;
  const badgeClass = (r.pred === r.actual) ? 'tag2 ok' : (delta>0 ? 'tag2 warn' : 'tag2 bad');
  const deltaTxt = (delta===null) ? '—' : (delta===0 ? '0' : (delta>0 ? `+${delta}` : `${delta}`));

  const vitalsSummary = fmtVitals(r);
  const shock = r.trace?.vitalsEffects?.find(x=>x.source==='Shock Index');
  const qsofa = r.trace?.vitalsEffects?.find(x=>x.source==='qSOFA');
  const sirs = r.trace?.vitalsEffects?.find(x=>x.source==='SIRS');
  const shockTxt = [
    shock ? shock.detail : null,
    qsofa ? qsofa.detail : null,
    sirs ? sirs.detail : null,
  ].filter(Boolean).join(' • ') || '—';

  const picked = (r.trace?.pickedModules||[]).slice(0,2).map(x=>x.title).join(' | ') || '—';
  const mods = (r.trace?.selectedModifiers||[]).map(m => `${m.label} (CTAS ${m.ctas})${m.assumed?'*':''}`).join(' • ') || '—';
  const vitEff = (r.trace?.vitalsEffects||[]).map(v => `${v.source}: ${v.detail} (CTAS ${v.ctas})`).join(' • ') || '—';
  const notes = (r.trace?.notes||[]).join(' • ') || '—';

  return `
    <tr>
      <td class="mono">${escapeHtml(r.mrno||'')}</td>
      <td>${escapeHtml(r.cc||'')}</td>
      <td><span class="tag2">${escapeHtml(r.actual??'—')}</span></td>
      <td><span class="${badgeClass}">${escapeHtml(r.pred??'—')}</span></td>
      <td><span class="tag2">${escapeHtml(deltaTxt)}</span></td>
      <td class="tiny muted">${escapeHtml(vitalsSummary)}</td>
      <td class="tiny muted">${escapeHtml(shockTxt)}</td>
      <td class="tiny">
        <details>
          <summary class="tag2">Details</summary>
          <div class="tiny muted" style="margin-top:8px">
            <div><b>Mode:</b> ${escapeHtml(r.trace?.mode||'—')}</div>
            <div><b>Picked modules:</b> ${escapeHtml(picked)}</div>
            <div><b>Modifiers:</b> ${escapeHtml(mods)}</div>
            <div><b>Vitals effects:</b> ${escapeHtml(vitEff)}</div>
            <div><b>Notes:</b> ${escapeHtml(notes)}</div>
          </div>
        </details>
      </td>
    </tr>
  `;
}

function escapeHtml(s){
  return toStr(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function applyFilters(){
  let rows = RESULTS.slice();

  const mismatch = els.filterMismatch.checked;
  const under = els.filterUnder.checked;
  const over = els.filterOver.checked;
  const q = toStr(els.search.value).trim().toLowerCase();

  rows = rows.filter(r => {
    const isMismatch = Number.isFinite(r.actual) ? (r.pred !== r.actual) : false;
    const isUnder = Number.isFinite(r.actual) ? (r.pred > r.actual) : false;
    const isOver = Number.isFinite(r.actual) ? (r.pred < r.actual) : false;

    if(mismatch && !isMismatch) return false;
    if(under && !isUnder) return false;
    if(over && !isOver) return false;

    if(q){
      const hay = `${r.mrno||''} ${r.cc||''}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  renderTable(rows);
}

function renderTable(rows){
  if(!rows.length){
    els.tbody.innerHTML = `<tr><td colspan="8" class="muted">No rows match your filters.</td></tr>`;
    return;
  }
  els.tbody.innerHTML = rows.map(buildRowHTML).join('');
}

function destroyCharts(){
  try{ chartDist?.destroy(); }catch(e){}
  try{ chartMismatch?.destroy(); }catch(e){}
  chartDist = null; chartMismatch = null;
}

function renderCharts(){
  destroyCharts();
  const valid = RESULTS.filter(r=>Number.isFinite(r.actual));
  const a = distCounts(valid,'actual');
  const p = distCounts(valid,'pred');

  chartDist = new Chart(els.chartDist.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['1','2','3','4','5'],
      datasets: [
        { label: 'Actual', data: [a[1],a[2],a[3],a[4],a[5]] },
        { label: 'Pred', data: [p[1],p[2],p[3],p[4],p[5]] },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  const mism = {
    correct: valid.filter(r=>r.pred===r.actual).length,
    under: valid.filter(r=>r.pred>r.actual).length,
    over: valid.filter(r=>r.pred<r.actual).length,
  };
  chartMismatch = new Chart(els.chartMismatch.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Correct','Under-triage','Over-triage'],
      datasets: [{ data: [mism.correct, mism.under, mism.over] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function buildReport(){
  const metrics = computeMetrics(RESULTS);
  const valid = RESULTS.filter(r=>Number.isFinite(r.actual));

  // per-class precision/recall/F1
  const M = metrics.matrix;
  const perClass = [];
  for(let c=0;c<5;c++){
    const tp = M[c][c];
    const fn = M[c].reduce((s,x)=>s+x,0) - tp;
    const fp = M.reduce((s,row,i)=>s + (i!==c ? row[c] : 0),0);
    const prec = (tp+fp) ? tp/(tp+fp) : null;
    const rec = (tp+fn) ? tp/(tp+fn) : null;
    const f1 = (prec!==null && rec!==null && (prec+rec)) ? 2*prec*rec/(prec+rec) : null;
    perClass.push({ctas:c+1, precision:prec, recall:rec, f1});
  }

  // common data quality issues
  const issues = [];
  const miss = (k)=> valid.filter(r=>r[k]===null).length;
  issues.push({name:'Missing BP', count: valid.filter(r=>r.sbp===null && r.dbp===null).length});
  issues.push({name:'Missing SpO₂', count: valid.filter(r=>r.spo2===null).length});
  issues.push({name:'Missing RR', count: valid.filter(r=>r.rr===null).length});
  issues.push({name:'Missing GCS', count: valid.filter(r=>r.gcs===null).length});
  issues.push({name:'Missing Pulse', count: valid.filter(r=>r.hr===null).length});
  issues.push({name:'Missing Temp', count: valid.filter(r=>r.temp===null).length});

  // mismatch reasons sampling
  const mismatchRows = valid.filter(r=>r.pred!==r.actual);
  const reasonBuckets = new Map();
  for(const r of mismatchRows){
    const tags = [];
    const ve = r.trace?.vitalsEffects||[];
    if(ve.some(x=>x.source==='Shock Index' && x.ctas<=2)) tags.push('Shock index flagged');
    if(ve.some(x=>x.source==='qSOFA')) tags.push('qSOFA flagged');
    if(ve.some(x=>x.source==='SIRS')) tags.push('SIRS flagged');
    if(r.trace?.notes?.some(n=>/ignored/i.test(n))) tags.push('Vitals ignored by modifier (strict)');
    if((r.trace?.pickedModules||[]).length>=2) tags.push('Ambiguous complaint (multi-module match)');
    if((r.trace?.selectedModifiers||[]).some(m=>m.assumed)) tags.push('Assumed modifier');
    if(!tags.length) tags.push('Other / unclear');

    for(const t of tags){
      reasonBuckets.set(t, (reasonBuckets.get(t)||0)+1);
    }
  }
  const topReasons = Array.from(reasonBuckets.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);

  return {
    generatedAt: new Date().toISOString(),
    options: readOptions(),
    metrics,
    perClass,
    issues,
    topReasons,
    topPatterns: metrics.topPatterns,
    sampleMismatches: mismatchRows.slice(0,30).map(r=>({
      mrno: r.mrno, cc: r.cc, actual: r.actual, pred: r.pred, mode: r.trace?.mode,
      notes: r.trace?.notes, vitalsEffects: r.trace?.vitalsEffects, modifiers: r.trace?.selectedModifiers, modules: r.trace?.pickedModules
    })),
    rows: RESULTS,
  };
}

function readOptions(){
  // safetyMin overrides strictApp
  const safetyMin = els.optSafetyMin.checked;
  const strictApp = els.optStrictApp.checked && !safetyMin;
  return {
    autoModule: els.optAutoModule.checked,
    autoMods: els.optAutoMods.checked,
    strictApp,
    safetyMin,
  };
}

function parseRowsFromSheet(sheet2d){
  const headerRow = findHeaderRow(sheet2d);
  const headersRaw = (sheet2d[headerRow]||[]).map(h=>toStr(h).trim());
  const headers = headersRaw.map(h=>{
    if(h==='Yes') return 'Allergy Yes';
    if(h==='No') return 'Allergy No';
    return h;
  });

  const out = [];
  for(let i=headerRow+1;i<sheet2d.length;i++){
    const row = sheet2d[i];
    if(!row || row.every(x=>toStr(x).trim()==='')) continue;

    const obj = {};
    for(let c=0;c<headers.length;c++){
      const key = headers[c] || `col_${c}`;
      obj[key] = row[c];
    }
    out.push(obj);
  }
  return out;
}

function findHeaderRow(rows){
  const MAX = Math.min(rows.length, 15);
  for(let i=0;i<MAX;i++){
    const row = (rows[i]||[]).map(x=>toStr(x).trim());
    const hasMR = row.some(x=>x.toLowerCase()==='mrno.' || x.toLowerCase()==='mrno');
    const hasCC = row.some(x=>x.toLowerCase().includes('chief'));
    const hasCTAS = row.some(x=>x.toLowerCase()==='ctas');
    if(hasMR && hasCC && hasCTAS) return i;
  }
  return 0;
}

function buildRecords(objs){
  return objs.map(o=>{
    const bp = parseBP(o['Bp']);
    return {
      mrno: toStr(o['MRNo.'] || o['MRNo'] || o['MRNo ']).trim(),
      cc: toStr(o['Chief Complaint']).trim(),
      actual: parseCTAS(o['CTAS']),
      respPath: toStr(o['Resp/Non-Resp']),
      ecgChestPain: yes(o['ECG for CHEST PAIN']),
      trauma: yes(o['Trauma']),
      deformity: yes(o['Deformity']),
      hxDM: yes(o['DM']),
      hxCardiac: yes(o['Cardiac']),
      hxOther: toStr(o['Other']).trim(),
      allergyYes: yes(o['Allergy Yes']),
      allergyNo: yes(o['Allergy No']),
      allergySpecify: toStr(o['Specify']).trim(),

      sbp: num(bp.sbp),
      dbp: num(bp.dbp),
      temp: num(o['Temp']),
      hr: num(o['Pulse']),
      rr: num(o['RR']),
      spo2: num(o['O2 Sat']),
      glucose: num(o['RBS']),
      gcs: num(o['GCS']),
      pain: num(o['Pain Scale']),
    };
  });
}

function runEvaluation(){
  const opts = readOptions();

  // mutual behavior
  if(opts.safetyMin){
    els.optStrictApp.checked = false;
  }

  setStatus('Running evaluation...');
  const recs = buildRecords(RAW_ROWS);
  RESULTS = recs.map(rec=>{
    const res = predict(rec, opts);
    return {
      ...rec,
      pred: res.predicted,
      vitalsCTAS: res.vitalsCTAS,
      modifiersCTAS: res.modifiersCTAS,
      trace: res.trace
    };
  });

  const metrics = computeMetrics(RESULTS);
  updateKPIs(metrics);
  els.topPatterns.innerHTML = buildTopPatternsHTML(metrics.topPatterns);

  renderCharts();
  applyFilters();

  REPORT = buildReport();
  enableDownloads(true);

  setStatus(`Done. Valid rows: ${metrics.nValid}. Accuracy: ${(metrics.acc*100).toFixed(1)}%.`);
}

function enableDownloads(on){
  els.dlJson.disabled = !on;
  els.dlCsv.disabled = !on;
  els.dlHtml.disabled = !on;
  els.reset.disabled = !on;
}

function resetAll(){
  RAW_ROWS = [];
  RESULTS = [];
  REPORT = null;
  els.tbody.innerHTML = `<tr><td colspan="8" class="muted">No results yet.</td></tr>`;
  els.file.value = '';
  els.fileHint.textContent = 'No file loaded yet.';
  updateKPIs({nRows:0,nValid:0,acc:0,bAcc:0,under:0,over:0,matrix:[],topPatterns:[]});
  els.topPatterns.textContent = 'Run evaluation to generate insights.';
  destroyCharts();
  enableDownloads(false);
  els.run.disabled = true;
  setStatus('Ready.');
}

function download(name, content, type='application/octet-stream'){
  const blob = new Blob([content], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 250);
}

function exportJson(){
  if(!REPORT) return;
  download(`tx_testlab_report_${Date.now()}.json`, JSON.stringify(REPORT, null, 2), 'application/json');
}

function exportCsvMismatches(){
  const rows = RESULTS.filter(r=>Number.isFinite(r.actual) && r.pred !== r.actual);
  const cols = ['mrno','cc','actual','pred','sbp','dbp','temp','hr','rr','spo2','glucose','gcs','pain','vitalsCTAS','modifiersCTAS'];
  const csv = [cols.join(',')].concat(rows.map(r=>{
    return cols.map(c => `"${toStr(r[c]).replace(/"/g,'""')}"`).join(',');
  })).join('\n');
  download(`tx_testlab_mismatches_${Date.now()}.csv`, csv, 'text/csv');
}

function openHtmlReport(){
  if(!REPORT) return;
  const m = REPORT.metrics;
  const per = REPORT.perClass;
  const topReasons = REPORT.topReasons || [];
  const issues = REPORT.issues || [];
  const patterns = REPORT.topPatterns || [];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <title>TX Test Lab Report</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin:24px; color:#0b1220;}
    h1,h2{margin:0 0 12px 0;}
    .muted{opacity:.75}
    .k{display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin:14px 0;}
    .card{border:1px solid #e5e7eb; border-radius:14px; padding:12px;}
    table{width:100%; border-collapse: collapse; margin-top:10px;}
    th,td{border-bottom:1px solid #eef2f7; padding:8px 10px; text-align:left; vertical-align:top;}
    th{background:#f8fafc;}
    code{background:#f1f5f9; padding:2px 6px; border-radius:8px;}
  </style></head><body>
  <h1>TriageXpert — Test Lab Report</h1>
  <div class="muted">Generated: ${escapeHtml(REPORT.generatedAt)} • Mode: ${escapeHtml(REPORT.options.safetyMin ? 'Safety override' : REPORT.options.strictApp ? 'Strict app' : 'Default')}</div>

  <div class="k">
    <div class="card"><div class="muted">Rows</div><div style="font-size:26px;font-weight:800">${m.nRows}</div></div>
    <div class="card"><div class="muted">Valid CTAS rows</div><div style="font-size:26px;font-weight:800">${m.nValid}</div></div>
    <div class="card"><div class="muted">Accuracy</div><div style="font-size:26px;font-weight:800">${(m.acc*100).toFixed(1)}%</div></div>
    <div class="card"><div class="muted">Balanced Accuracy</div><div style="font-size:26px;font-weight:800">${(m.bAcc*100).toFixed(1)}%</div></div>
    <div class="card"><div class="muted">Under-triage</div><div style="font-size:26px;font-weight:800">${m.under}</div></div>
    <div class="card"><div class="muted">Over-triage</div><div style="font-size:26px;font-weight:800">${m.over}</div></div>
  </div>

  <h2>Top mismatch patterns</h2>
  <table><thead><tr><th>Pattern</th><th>Count</th></tr></thead><tbody>
    ${patterns.map(([k,v])=>`<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`).join('') || `<tr><td colspan="2">No mismatches</td></tr>`}
  </tbody></table>

  <h2>Top “confusion” reasons (heuristics)</h2>
  <table><thead><tr><th>Reason</th><th>Count</th></tr></thead><tbody>
    ${topReasons.map(([k,v])=>`<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`).join('') || `<tr><td colspan="2">No reasons</td></tr>`}
  </tbody></table>

  <h2>Per-class metrics</h2>
  <table><thead><tr><th>CTAS</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>
    ${per.map(r=>`<tr><td>${r.ctas}</td><td>${r.precision===null?'—':(r.precision*100).toFixed(1)+'%'}</td><td>${r.recall===null?'—':(r.recall*100).toFixed(1)+'%'}</td><td>${r.f1===null?'—':(r.f1*100).toFixed(1)+'%'}</td></tr>`).join('')}
  </tbody></table>

  <h2>Data quality issues</h2>
  <table><thead><tr><th>Issue</th><th>Count</th></tr></thead><tbody>
    ${issues.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.count}</td></tr>`).join('')}
  </tbody></table>

  <h2>Sample mismatches (first 30)</h2>
  <table><thead><tr><th>MRNo</th><th>Complaint</th><th>Actual</th><th>Pred</th><th>Notes</th></tr></thead><tbody>
    ${REPORT.sampleMismatches.map(r=>`<tr><td><code>${escapeHtml(r.mrno)}</code></td><td>${escapeHtml(r.cc)}</td><td>${r.actual}</td><td>${r.pred}</td><td class="muted">${escapeHtml((r.notes||[]).join(' • '))}</td></tr>`).join('') || `<tr><td colspan="5">No mismatches</td></tr>`}
  </tbody></table>

  <p class="muted" style="margin-top:18px">Tip: Use this report to tune your module keywords, add missing modifiers, or decide if you want a “vitals safety override” later (without changing your current production behavior).</p>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function loadFile(file){
  const name = file.name || 'file';
  setStatus('Reading file...');
  els.run.disabled = true;

  if(name.toLowerCase().endsWith('.csv')){
    const text = await file.text();
    const rows = csvTo2D(text);
    RAW_ROWS = parseRowsFromSheet(rows);
  } else {
    try{
      const XLSXlib = await ensureXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSXlib.read(buf, {type:'array'});
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSXlib.utils.sheet_to_json(ws, {header:1, defval:''});
      RAW_ROWS = parseRowsFromSheet(rows);
    }catch(err){
      console.error(err);
      setStatus(`Failed to read XLSX: ${err?.message || err}`);
      els.fileHint.textContent = `Loaded: ${name} • XLSX failed. Try exporting to CSV and re-upload.`;
      els.run.disabled = true;
      return;
    }
  }

  els.fileHint.textContent = `Loaded: ${name} • rows: ${RAW_ROWS.length}`;
  els.run.disabled = RAW_ROWS.length === 0;
  els.reset.disabled = false;
  setStatus('File loaded. Ready to run.');
}

function csvTo2D(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length);
  return lines.map(line=>{
    // simple CSV split (works for most triage exports; Excel-saved CSV is usually simple)
    const out = [];
    let cur='', inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch === '"' ){
        if(inQ && line[i+1] === '"'){ cur+='"'; i++; }
        else inQ=!inQ;
      } else if(ch === ',' && !inQ){
        out.push(cur); cur='';
      } else {
        cur+=ch;
      }
    }
    out.push(cur);
    return out;
  });
}

// UI wiring
els.file.addEventListener('change', (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  loadFile(f);
});

els.run.addEventListener('click', runEvaluation);
els.reset.addEventListener('click', resetAll);

els.filterMismatch.addEventListener('change', applyFilters);
els.filterUnder.addEventListener('change', applyFilters);
els.filterOver.addEventListener('change', applyFilters);
els.search.addEventListener('input', applyFilters);

els.dlJson.addEventListener('click', exportJson);
els.dlCsv.addEventListener('click', exportCsvMismatches);
els.dlHtml.addEventListener('click', openHtmlReport);

els.optSafetyMin.addEventListener('change', ()=>{
  if(els.optSafetyMin.checked) els.optStrictApp.checked = false;
});

// Fix: stop chart interaction from causing page to scroll down on touch devices
bindChartScrollGuards(els.chartDist);
bindChartScrollGuards(els.chartDist?.parentElement);
bindChartScrollGuards(els.chartMismatch);
bindChartScrollGuards(els.chartMismatch?.parentElement);
resetAll();
