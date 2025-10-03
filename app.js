// TriageXpert — CTAS Neon v3
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
  ccInput: document.getElementById('cc-input'),
  suggestions: document.getElementById('suggestions'),
  selectedCCs: document.getElementById('selected-ccs'),
  modsPanel: document.getElementById('mods-panel'),
  selectedModsWrap: document.getElementById('selected-mods'),
  vitalsTableBody: document.querySelector('#vitals-effects tbody'),
  ctasCurrent: document.getElementById('ctas-current'),
  btnScreenshot: document.getElementById('btn-screenshot'),
  btnPrint: document.getElementById('btn-print'),
  btnClear: document.getElementById('btn-clear'),
  sv: {
    age: document.getElementById('sv-age'),
    gcs: document.getElementById('sv-gcs'),
    hemo: document.getElementById('sv-hemo'),
    resp: document.getElementById('sv-resp'),
    bp: document.getElementById('sv-bp'),
    glu: document.getElementById('sv-glu'),
    temp: document.getElementById('sv-temp'),
    pain: document.getElementById('sv-pain'),
  }
};

const state = {
  activeIds: [],
  selectedMods: new Set(), // keys "moduleId::modifierId"
  vitalsEffects: [],
};

function keyFor(modId, subId){ return `${modId}::${subId}`; }
function lowestCTAS(values){
  const filtered = values.filter(v => Number.isFinite(v) && v >= 1 && v <= 5);
  return filtered.length ? Math.min(...filtered) : null;
}
// Helper: set class ctas[1-5] on the big chip
function setCTASChipClass(val){
  const el = els.ctasCurrent;
  el.classList.remove('ctas1','ctas2','ctas3','ctas4','ctas5');
  if (val) el.classList.add(`ctas${val}`);
}
function updateCTASCurrent(value){
  els.ctasCurrent.textContent = value ? `CTAS ${value}` : 'CTAS —';
  setCTASChipClass(value);
}

// Suggestions & Complaints
function renderSuggestions(query = ''){
  const q = query.trim().toLowerCase();
  const results = ALL_MODULES
    .map(m => {
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchKw = (m.keywords || []).some(k => k.toLowerCase().includes(q));
      return { ...m, score: (matchTitle?2:0) + (matchKw?1:0) };
    })
    .filter(m => q ? m.score>0 : true)
    .slice(0, 120);

  els.suggestions.innerHTML = '';
  results.forEach(m => {
    const div = document.createElement('div');
    div.className = 'suggestion';
    div.innerHTML = `<b>${m.title}</b><div class="small">${(m.keywords||[]).slice(0,6).join(', ')}</div>`;
    div.addEventListener('click', () => addComplaint(m.id));
    els.suggestions.appendChild(div);
  });
}

function addComplaint(id){
  if (!ALL_MODULES.find(x=>x.id===id)) return;
  if (!state.activeIds.includes(id)){
    state.activeIds.push(id);
    renderSelectedCCs();
    renderModifiers();
    recalc();
  }
}
function removeComplaint(id){
  state.activeIds = state.activeIds.filter(x=>x!==id);
  Array.from(state.selectedMods).forEach(k => { if(k.startsWith(id+'::')) state.selectedMods.delete(k) });
  renderSelectedCCs();
  renderModifiers();
  recalc();
}
function renderSelectedCCs(){
  els.selectedCCs.innerHTML = '';
  state.activeIds.forEach(id => {
    const mod = ALL_MODULES.find(m=>m.id===id);
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.innerHTML = `<span>${mod ? mod.title : id}</span><span class="x" title="Remove">×</span>`;
    badge.querySelector('.x').addEventListener('click', ()=>removeComplaint(id));
    els.selectedCCs.appendChild(badge);
  });
}

// Modifiers UI
function renderModifiers(){
  els.modsPanel.innerHTML = '';
  state.activeIds.forEach(id => {
    const mod = ALL_MODULES.find(m=>m.id===id);
    if (!mod) return;
    const group = document.createElement('div');
    group.className = 'mod-group';

    const head = document.createElement('div');
    head.className = 'group-head';
    head.innerHTML = `<div><b>${mod.title}</b><div class="small">${(mod.vitalsHints||[]).join(' · ')}</div></div>`;
    group.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'modifiers';

    (mod.modifiers || []).forEach(mm => {
      const wrap = document.createElement('label');
      wrap.className = 'mod';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.mid = mod.id;
      cb.dataset.sid = mm.id;
      cb.dataset.modKey = keyFor(mod.id, mm.id);
      cb.checked = state.selectedMods.has(cb.dataset.modKey);
      cb.addEventListener('change', (e)=>{
        const k = e.target.dataset.modKey;
        if (e.target.checked) state.selectedMods.add(k);
        else state.selectedMods.delete(k);
        recalc();
      });

      const text = document.createElement('div');
      text.innerHTML = `<b>${mm.label}</b><div class="small">${mm.note || ''}</div>`;

      const ribbon = document.createElement('div');
      const tag = (mm.effect && mm.effect.ctas) ? Number(mm.effect.ctas) : null;
      ribbon.className = 'ribbon ' + (tag ? `ctas${tag}` : '');
      ribbon.textContent = tag ? `CTAS ${tag}` : '';

      wrap.appendChild(cb);
      wrap.appendChild(text);
      wrap.appendChild(ribbon);
      grid.appendChild(wrap);
    });

    group.appendChild(grid);
    els.modsPanel.appendChild(group);
  });

  renderSelectedModifiersSummary();
}

function renderSelectedModifiersSummary(){
  els.selectedModsWrap.innerHTML = '';
  Array.from(state.selectedMods).forEach(k => {
    const [mid, sid] = k.split('::');
    const mod = ALL_MODULES.find(m=>m.id===mid);
    if (!mod) return;
    const m = (mod.modifiers||[]).find(x=>x.id===sid);
    if (!m) return;
    const ctas = m.effect && Number(m.effect.ctas) || null;
    const div = document.createElement('div');
    div.className = 'selmod';
    div.innerHTML = `<span>${mod.title}: <b>${m.label}</b></span><span class="tag ${ctas?('ctas'+ctas):''}">${ctas?('CTAS '+ctas):''}</span>`;
    els.selectedModsWrap.appendChild(div);
  });
}

// === First-order modifiers from vitals (subset) ===
function computeVitalsEffects(){
  const effects = [];
  const gcs = num('gcs');
  const shock = checked('shock');
  const hemo = checked('hemo');
  const spo2 = num('spo2');
  const sbp = num('sbp');
  const dbp = num('dbp');
  const htnSx = checked('htn-sx');
  const glucose = num('glucose');
  const hypoSx = checked('hypo-sx');
  const hyperSx = checked('hyper-sx');
  const temp = num('temp');
  const immuno = checked('immuno');
  const septic = checked('septic');
  const unwell = checked('unwell');
  const pain = num('pain');
  const painLoc = val('pain-loc');
  const painOnset = val('pain-onset');

  if (shock) effects.push({source:'Hemodynamic', detail:'Shock signs', ctas:1});
  else if (hemo) effects.push({source:'Hemodynamic', detail:'Hemodynamic compromise', ctas:2});

  if (Number.isFinite(gcs)){
    if (gcs <= 9) effects.push({source:'GCS', detail:`GCS ${gcs}`, ctas:1});
    else if (gcs >=10 && gcs <=13) effects.push({source:'GCS', detail:`GCS ${gcs}`, ctas:2});
  }

  if (Number.isFinite(spo2)){
    if (spo2 < 90) effects.push({source:'Respiratory', detail:`SpO₂ ${spo2}%`, ctas:1});
    else if (spo2 < 92) effects.push({source:'Respiratory', detail:`SpO₂ ${spo2}%`, ctas:2});
    else if (spo2 <= 94) effects.push({source:'Respiratory', detail:`SpO₂ ${spo2}%`, ctas:3});
  }

  if (Number.isFinite(sbp) || Number.isFinite(dbp)){
    const SBP = sbp||0, DBP = dbp||0;
    if (SBP >= 220 || DBP >= 130){
      effects.push({source:'Hypertension', detail:`Very high BP ${SBP}/${DBP} ${htnSx?'+ symptoms':''}`, ctas: htnSx ? 2 : 3});
    } else if ((SBP >= 200 && SBP < 220) || (DBP >=110 && DBP <130)){
      effects.push({source:'Hypertension', detail:`High BP ${SBP}/${DBP} ${htnSx?'+ symptoms':''}`, ctas: htnSx ? 3 : 4});
    }
  }

  if (Number.isFinite(glucose)){
    if (glucose < 3){
      effects.push({source:'Glucose', detail:`<3 mmol/L ${hypoSx?'+ symptoms':''}`, ctas: hypoSx ? 2 : 3});
    } else if (glucose > 18){
      effects.push({source:'Glucose', detail:`>18 mmol/L ${hyperSx?'+ symptoms':''}`, ctas: hyperSx ? 2 : 3});
    }
  }

  if (Number.isFinite(temp) && temp >= 38){
    if (immuno || septic) effects.push({source:'Fever', detail:'Immunocompromised / septic look', ctas:2});
    else if (unwell) effects.push({source:'Fever', detail:'Looks unwell', ctas:3});
    else effects.push({source:'Fever', detail:'Looks well', ctas:4});
  }

  if (Number.isFinite(pain) && painLoc && painOnset){
    let sev = 'mild';
    if (pain >= 8) sev = 'severe';
    else if (pain >= 4) sev = 'moderate';
    let ctas = null;
    if (sev === 'severe' && painLoc==='central' && painOnset==='acute') ctas = 2;
    else if (sev === 'severe' && painLoc==='central' && painOnset==='chronic') ctas = 3;
    else if (sev === 'severe' && painLoc==='peripheral' && painOnset==='acute') ctas = 3;
    else if (sev === 'severe' && painLoc==='peripheral' && painOnset==='chronic') ctas = 4;
    else if (sev === 'moderate' && painLoc==='central' && painOnset==='acute') ctas = 3;
    else if (sev === 'moderate' && painLoc==='central' && painOnset==='chronic') ctas = 4;
    else if (sev === 'moderate' && painLoc==='peripheral' && painOnset==='acute') ctas = 4;
    else if (sev === 'moderate' && painLoc==='peripheral' && painOnset==='chronic') ctas = 5;
    else if (sev === 'mild' && painLoc==='central' && painOnset==='acute') ctas = 4;
    else if (sev === 'mild' && painLoc==='central' && painOnset==='chronic') ctas = 5;
    else if (sev === 'mild' && painLoc==='peripheral' && painOnset==='acute') ctas = 5;
    else if (sev === 'mild' && painLoc==='peripheral' && painOnset==='chronic') ctas = 5;
    if (ctas) effects.push({source:'Pain', detail:`${sev} / ${painLoc} / ${painOnset}`, ctas});
  }

  return effects;
}

// بدّل هذه الدالة في app.js
function num(id){
  const el = document.getElementById(id);
  if (!el) return null;
  const raw = el.value;
  if (raw === '' || raw === null || raw === undefined) return null; // مهم
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function val(id){ return document.getElementById(id).value }
function checked(id){ return document.getElementById(id).checked }

function renderVitalsEffects(effects){
  els.vitalsTableBody.innerHTML = '';
  effects.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.source}</td><td class="small">${e.detail}</td><td>${e.ctas}</td>`;
    els.vitalsTableBody.appendChild(tr);
  });
}

// Recalculate CTAS from selected modifiers + vitals every change
function recalc(){
  // 1) قيم CTAS من الموديفايرز المختارة
  const modValues = [];
  Array.from(state.selectedMods).forEach(k => {
    const [mid, sid] = k.split('::');
    const mod = ALL_MODULES.find(m=>m.id===mid);
    if (!mod) return;
    const m = (mod.modifiers||[]).find(x=>x.id===sid);
    if (m && m.effect && Number.isFinite(Number(m.effect.ctas))) {
      modValues.push(Number(m.effect.ctas));
    }
  });

  // 2) احسب وعرض تأثيرات الفيتالز (للعرض فقط، ولن تؤثر إذا فيه موديفايرز)
  state.vitalsEffects = computeVitalsEffects();
  renderVitalsEffects(state.vitalsEffects);

  // 3) القرار النهائي: الموديفايرز أولاً، وإلا الفيتالز
  let finalCTAS = null;
  if (modValues.length) {
    finalCTAS = lowestCTAS(modValues);              // تفضيل الموديفايرز
  } else {
    finalCTAS = lowestCTAS(state.vitalsEffects.map(v=>v.ctas)); // لو مفيش موديفايرز
  }

  updateCTASCurrent(finalCTAS);
  renderSelectedModifiersSummary();
  updateSummaries();
}

// Live summary previews
function updateSummaries(){
  els.sv.age.textContent = val('age') || '—';
  els.sv.gcs.textContent = val('gcs') || '—';
  const hemo = (checked('shock') ? 'Shock' : '') + (checked('hemo') ? (checked('shock')? ' + ' : '') + 'Compromise' : '');
  els.sv.hemo.textContent = hemo || '—';
  const resp = [val('rr')?`RR ${val('rr')}`:'', val('spo2')?`SpO₂ ${val('spo2')}%`:'' ].filter(Boolean).join(' · ');
  els.sv.resp.textContent = resp || '—';
  const bp = [val('sbp')?`SBP ${val('sbp')}`:'', val('dbp')?`DBP ${val('dbp')}`:'', checked('htn-sx')?'sx':'' ].filter(Boolean).join(' · ');
  els.sv.bp && (els.sv.bp.textContent = bp || '—');
  const glu = [val('glucose')?`${val('glucose')} mmol/L`:'', checked('hypo-sx')?'hypo sx':'', checked('hyper-sx')?'hyper sx':''].filter(Boolean).join(' · ');
  els.sv.glu && (els.sv.glu.textContent = glu || '—');
  const temp = [val('temp')?`${val('temp')}°C`:'', checked('immuno')?'immuno':'', checked('septic')?'septic':'', checked('unwell')?'unwell':''].filter(Boolean).join(' · ');
  els.sv.temp && (els.sv.temp.textContent = temp || '—');
  const pain = [val('pain')?`NRS ${val('pain')}`:'', val('pain-loc')||'', val('pain-onset')||''].filter(Boolean).join(' · ');
  els.sv.pain && (els.sv.pain.textContent = pain || '—');
}

// Screenshot + Print must match the live page: use single capture() for both
async function capture(){
  const area = document.getElementById('capture-area');
  const canvas = await html2canvas(area, {
    useCORS: true,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#0b1330',
    scale: Math.max(2, (window.devicePixelRatio||1)),
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    removeContainer: true
  });
  return canvas.toDataURL('image/png');
}

els.btnScreenshot?.addEventListener('click', async () => {
  const url = await capture();
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = url; a.download = `TriageXpert-${stamp}.png`; a.click();
});

els.btnPrint?.addEventListener('click', async () => {
  const url = await capture(); // same image as screenshot
  const w = window.open('', '_blank');
  if(!w) return;
  w.document.write(`<html><head><title>Print — TriageXpert</title>
    <style>body{margin:0;padding:0;background:#0b1330;display:grid;place-items:center} img{max-width:100vw; height:auto; display:block}</style>
  </head><body><img src="${url}" onload="window.focus(); window.print(); setTimeout(() => window.close(), 300);" /></body></html>`);
  w.document.close();
});

// Clear all
els.btnClear?.addEventListener('click', () => {
  document.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false);
  document.querySelectorAll('input[type=number], input[type=text]').forEach(i=>i.value='');
  document.querySelectorAll('select').forEach(s=>s.value='');
  state.selectedMods.clear();
  state.vitalsEffects = [];
  state.activeIds = [];
  els.selectedCCs.innerHTML='';
  els.modsPanel.innerHTML='';
  els.selectedModsWrap.innerHTML='';
  els.vitalsTableBody.innerHTML='';
  updateCTASCurrent(null);
  updateSummaries();
});

// Attach recalc listeners for all inputs
function attachRecalcListeners(){
  document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  });
}
attachRecalcListeners();

// Typeahead for modules
els.ccInput.addEventListener('input', (e)=>renderSuggestions(e.target.value));
renderSuggestions('');
updateSummaries();
