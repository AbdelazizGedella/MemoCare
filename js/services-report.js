// js/services-report.js
(function(){
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // Elements (تأكد IDs مطابقة للـ HTML)
  const els = {
    file: $('#fileInput'), drop: $('#dropZone'), demo: $('#btnDemo'), loading: $('#loading'),
    btnExportAll: $('#btnExportAll'),
    summary: $('#summary'),
    // charts export buttons
    expTopQty: $('#expTopQty'), expTopAmt: $('#expTopAmt'), expByDoctor: $('#expByDoctor'),
    expBySection: $('#expBySection'), expHeat: $('#expHeat'),
    // tables
    tblServices: $('#tblServices'), tblDoctors: $('#tblDoctors'),
    tblSections: $('#tblSections'), tblCoverage: $('#tblCoverage'),
    tblTopReqPerService: $('#tblTopReqPerService'),
    // counters + export per table
    servicesCountChip: $('#servicesCountChip'), doctorsCountChip: $('#doctorsCountChip'),
    sectionsCountChip: $('#sectionsCountChip'), coverageCountChip: $('#coverageCountChip'),
    expTblServices: $('#expTblServices'), expTblDoctors: $('#expTblDoctors'),
    expTblSections: $('#expTblSections'), expTblCoverage: $('#expTblCoverage'),
    expTopReqPerService: $('#expTopReqPerService'),
    // modal
    modal: $('#dataModal'), modalTitle: $('#modalTitle'),
    modalBody: $('#modalBody'), btnModalExport: $('#btnModalExport'),
  };

  // Chart.js plugins
  Chart.register(ChartDataLabels);

  // State
  let charts = {};            // chart instances
  let DATA = [];              // filtered row-level (lab only)
  let CACHE = {};             // aggregations cache for exports
  let MODAL_ROWS = [];        // rows currently shown in modal
  const DOCTOR_COLOR = new Map();

  // Helpers
  const nf = new Intl.NumberFormat('en-US');
  const cf = new Intl.NumberFormat('en-US', { style:'currency', currency:'SAR', maximumFractionDigits:2 });

  const toNumber = (val) => {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim(); let neg = false;
    if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1,-1); }
    s = s.replace(/[\s\u00A0]/g,'');
    s = s.replace(/[^0-9,.-]/g,'');
    if (s.includes(',') && s.includes('.')) s = s.replace(/,/g,'');
    else if (s.includes(',') && !s.includes('.')) s = s.replace(/,/g,'.');
    const n = parseFloat(s); return isNaN(n) ? 0 : (neg ? -n : n);
  };

  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const parseExcelDate = (v) => {
    if (v==null || v==='') return null;
    if (typeof v === 'number') return new Date(excelEpoch.getTime() + Math.round(v*86400000));
    const s = String(v).trim();
    const iso = new Date(s); if (!isNaN(iso)) return iso;
    // يدعم  dd/mm/yyyy  أو  dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (m){ const dd=+m[1], mm=+m[2], yyyy=(+m[3]<100?2000+ +m[3]:+m[3]); return new Date(yyyy,mm-1,dd); }
    return null;
  };

  const fmtDate = (d) => {
    if(!d) return '';
    // عرض yyyy-mm-dd في الجدول
    return d.toISOString().slice(0,10);
  };

  function canonicalName(name){
    if (!name) return '';
    let s = String(name).replace(/\s+/g,' ').trim();
    const tokens = s.split(' ');
    return tokens.slice(0,3).join(' ');
  }

  function gradientColors(n){
    const arr=[]; for(let i=0;i<n;i++){
      const hue = 210 - Math.round(i*(160/Math.max(1,n-1)));
      arr.push(`hsl(${hue},70%,55%)`);
    }
    return arr;
  }

  function colorForDoctor(key){
    if (!DOCTOR_COLOR.has(key)) {
      const hue = (DOCTOR_COLOR.size * 67) % 360;
      DOCTOR_COLOR.set(key, `hsl(${hue},70%,55%)`);
    }
    return DOCTOR_COLOR.get(key);
  }

// ==== REPLACE: renderTable ====
function renderTable(el, cols, rows){
  if (!el) { console.warn('renderTable: target element not found'); return; }

  // لو اللي جاي table اكتبله thead/tbody مباشرة
  const isTable = el.tagName && el.tagName.toLowerCase() === 'table';
  const thead = `<thead><tr>${cols.map(c=>`<th class="sticky top-0 bg-[#0d1a35]">${c.title}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${
    rows.map(r=>`<tr>${
      cols.map(c=>`<td>${c.format ? c.format(r[c.key], r) : (r[c.key] ?? '')}</td>`).join('')
    }</tr>`).join('')
  }</tbody>`;

  if (isTable){
    el.innerHTML = thead + tbody;
  } else {
    el.innerHTML = `<table class="table table-compact table-zebra w-full">${thead}${tbody}</table>`;
  }
}

function drawChart(id, cfg){
  if(charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if(!ctx){ console.warn('Canvas not found:', id); return; }
  charts[id] = new Chart(ctx, cfg);
}


  function aggBy(arr, keyFn){
    const map = new Map();
    for(const it of arr){
      const k = keyFn(it);
      if(!map.has(k)) map.set(k, { key:k, rows:[], count:0, qty:0, amount:0, ppart:0, cpart:0, ctax:0, ptax:0 });
      const o=map.get(k);
      o.rows.push(it); o.count++; o.qty += it.qty||0; o.amount += it.aft||0;
      o.ppart += it.ppart||0; o.cpart += it.cpart||0; o.ctax += it.ctax||0; o.ptax += it.ptax||0;
    }
    return Array.from(map.values());
  }

  function enable(btn){ btn && (btn.disabled=false); }
  function hide(el){ if(el) el.style.display='none'; }

  function exportSheet(sheetName, rows, headers){
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: headers }), sheetName);
    XLSX.writeFile(wb, `${sheetName}.xlsx`);
  }

  function attachModalFromRows(title, rows){
    els.modalTitle.textContent = title;
    MODAL_ROWS = rows;
    const cols = [
      {key:'orderDate', title:'التاريخ', format:v=>fmtDate(v)},
      {key:'serviceCode', title:'رقم الخدمة'},
      {key:'serviceName', title:'اسم الخدمة'},
      {key:'qty', title:'Qty', format:v=>nf.format(v||0)},
      {key:'aft', title:'Aft Disc', format:v=>cf.format(v||0)},
      {key:'fileNo', title:'رقم الملف'},
      {key:'patient', title:'المريض'},
      {key:'doctorDisp', title:'الطبيب'},
      {key:'section', title:'القسم'},
      {key:'coverage', title:'التغطية'},
    ];
    renderTable(els.modalBody, cols, rows.map(x=>({
      orderDate: x.orderDate, serviceCode:x.serviceCode, serviceName:x.serviceName, qty:x.qty, aft:x.aft,
      fileNo:x.fileNo, patient:x.patient, doctorDisp:x.doctorDisp, section:x.section, coverage:x.coverage,
    })));
    els.modal.showModal();
  }

  els.btnModalExport?.addEventListener('click', ()=>{
    if (!MODAL_ROWS || !MODAL_ROWS.length) return;
    exportSheet('Selection', MODAL_ROWS.map(x=>({
      Date: fmtDate(x.orderDate), ServiceCode:x.serviceCode, ServiceName:x.serviceName, Qty:x.qty, AftDisc:x.aft,
      DoctorID:x.doctorId, DoctorName:x.doctor, Section:x.section, Coverage:x.coverage, FileNo:x.fileNo, Patient:x.patient
    })), ['Date','ServiceCode','ServiceName','Qty','AftDisc','DoctorID','DoctorName','Section','Coverage','FileNo','Patient']);
  });

  // === Datalabels on Hover helper (except Pie % which is always visible)
// ==== REPLACE: hoverDL helper ====
const hoverDL = (formatter) => ({
  datalabels:{
    // تظهر فقط لما الماوس يدخل العنصر
    display: (ctx)=> ctx.active === true,
    align:'top',
    anchor:'end',
    formatter,
    listeners:{
      enter(ctx){ ctx.active = true; return true; },
      leave(ctx){ ctx.active = false; return true; }
    }
  }
});




const EXTRA_LAB_CODES = new Set(['1680011']);

async function handleFile(file){
  if(!file) return; els.loading.classList.remove('hidden');

  // re-bind داخل DOM
  ['tblServices','tblDoctors','tblSections','tblCoverage','tblTopReqPerService'].forEach(k=>{
    els[k] = document.getElementById(k);
  });

  try{
    // ... الباقي كما هو

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw = XLSX.utils.sheet_to_json(ws, { header:'A', defval:null, raw:false, blankrows:false });

      // ===== إجمالي كل الفواتير في الملف (كل الخدمات) لحساب نسبة المعمل =====
      let totalAft_AllServices = 0;
      for(const r of rowsRaw){
        totalAft_AllServices += toNumber(r.P); // After Discount إجمالي الملف كله
      }

      // ===== Map & filter: فقط الخدمات التي يبدأ كودها بـ 4 (المعمل) =====
      const data = [];
      const docNameByKey = new Map(); // key -> best display name
      for(const r of rowsRaw){
const svcCode = String(r.L ?? '').trim();
if (!svcCode || !(svcCode.startsWith('4') || EXTRA_LAB_CODES.has(svcCode))) continue;

        const docId   = (r.A ?? '').toString().trim();
        const docName = (r.B ?? '').toString().trim();
        const docKey  = docId || canonicalName(docName) || 'غير محدد';
        if(docName){
          const prev = docNameByKey.get(docKey) || '';
          if(docName.length > prev.length) docNameByKey.set(docKey, docName);
        }

        const qty  = toNumber(r.Z);
        const bef  = toNumber(r.O); // Before Discount
        const aft  = toNumber(r.P); // After Discount
        const ppart= toNumber(r.Q);
        const cpart= toNumber(r.R);
        const ctax = toNumber(r.S);
        const ptax = toNumber(r.T);
        const dt   = parseExcelDate(r.K);
        const section = (r.AC ?? '').toString().trim() || 'غير محدد';

        data.push({
          doctorId: docId || '',
          doctor: docName || '',
          doctorKey: docKey,
          doctorDisp: (docId? docId+' — ' : '') + (docName || docNameByKey.get(docKey) || docKey),
          fileNo: (r.D ?? '').toString().trim(),
          patient: (r.E ?? '').toString().trim(),
          coverage: (r.H ?? '').toString().trim() || 'غير محدد',
          orderDate: dt,
          orderDay: fmtDate(dt),
          serviceCode: svcCode,
          serviceName: (r.M ?? '').toString().trim() || svcCode,
          qty, section, bef, aft, ppart, cpart, ctax, ptax,
          raw: { O:r.O, P:r.P, Q:r.Q, R:r.R, S:r.S, T:r.T }
        });
      }

      if (data.length === 0) throw new Error('لم يتم العثور على سجلات تبدأ بـ 4 في عمود L.');

      // Cache original
      DATA = data;

      // Aggregations
      const byService = aggBy(DATA, x=> x.serviceCode + ' | ' + (x.serviceName||x.serviceCode))
                          .sort((a,b)=> b.qty - a.qty);
      const byDoctor  = aggBy(DATA, x=> x.doctorKey)
                          .map(o=> ({...o, disp: (o.rows[0]?.doctorId ? (o.rows[0].doctorId+' — ') : '') + (docNameByKey.get(o.key) || o.rows[0]?.doctor || o.key)}))
                          .sort((a,b)=> b.count - a.count);
      const bySection = aggBy(DATA, x=> x.section)
                          .sort((a,b)=> b.count - a.count);
      const byCover   = aggBy(DATA, x=> x.coverage)
                          .sort((a,b)=> b.count - a.count);

      // ===== إحصاءات + ملاحظة نسبة المعمل من إجمالي الفواتير =====
      const stats = {
        totalOrders: DATA.length,
        totalQty: DATA.reduce((s,x)=> s + (x.qty||0), 0),
        totalAmount: DATA.reduce((s,x)=> s + (x.aft||0), 0), // Aft Disc
        doctorsCount: new Set(DATA.map(x=>x.doctorKey)).size,
        servicesCount: new Set(DATA.map(x=>x.serviceCode)).size,
      };
      const labShare = totalAft_AllServices > 0 ? (stats.totalAmount / totalAft_AllServices) * 100 : 0;

      // Render summary
      const cards = [
        { icon:'flask-vial', label:'عدد الطلبات', value:nf.format(stats.totalOrders) },
        { icon:'boxes-packing', label:'إجمالي الكميات', value:nf.format(stats.totalQty) },
        { icon:'sack-dollar', label:'إجمالي المبالغ (Aft Disc)', value:cf.format(stats.totalAmount),
          note:`<span class="ml-2 px-2 py-[2px] rounded-md text-xs font-bold" style="background:#f5d90a;color:#262626">المعمل ${labShare.toFixed(1)}% من إجمالي الفواتير</span>` },
        { icon:'user-doctor', label:'عدد الأطباء', value:nf.format(stats.doctorsCount) },
        { icon:'vial-circle-check', label:'عدد الفحوصات', value:nf.format(stats.servicesCount) },
      ];
      els.summary.innerHTML = cards.map(c=>`
        <div class="glass rounded-2xl p-4 flex items-center gap-3">
          <i class="fa-solid fa-${c.icon} text-xl opacity-90"></i>
          <div>
            <div class="text-sm opacity-70">${c.label}</div>
            <div class="text-lg font-bold">${c.value}${c.note?c.note:''}</div>
          </div>
        </div>`).join('');

      // ====== Tables ======
      const servicesRows = byService.map(x=>{
        const [code, name] = x.key.split(' | ');
        // ربحية تقديرية = AftDisc - (CompTax + PatTax)  (بدون تكلفة الشراء لعدم توفرها)
        const estProfit = x.amount - (x.ctax + x.ptax);
        return { serviceCode:code, serviceName:name, qty:x.qty, orders:x.count, amount:x.amount, estProfit,
                 ppart:x.ppart, cpart:x.cpart, ctax:x.ctax, ptax:x.ptax };
      });
      els.servicesCountChip.textContent = `${servicesRows.length} خدمة`;
      renderTable(els.tblServices, [
        {key:'serviceCode', title:'رقم الخدمة'},
        {key:'serviceName', title:'اسم الخدمة'},
        {key:'qty',         title:'إجمالي الكمية', format:v=>nf.format(v||0)},
        {key:'orders',      title:'عدد الطلبات',   format:v=>nf.format(v||0)},
        {key:'amount',      title:'إجمالي Aft Disc', format:v=>cf.format(v||0)},
        {key:'estProfit',   title:'الربحية (تقد.)', format:v=>cf.format(v||0)},
        {key:'ppart',       title:'Patient Part',  format:v=>cf.format(v||0)},
        {key:'cpart',       title:'Company Part',  format:v=>cf.format(v||0)},
        {key:'ctax',        title:'Comp Tax',      format:v=>cf.format(v||0)},
        {key:'ptax',        title:'Pat Tax',       format:v=>cf.format(v||0)},
      ], servicesRows);

      const doctorsRows = byDoctor.map(x=>({ doctor:x.disp, orders:x.count, qty:x.qty, amount:x.amount }));
      els.doctorsCountChip.textContent = `${doctorsRows.length} طبيب`;
      renderTable(els.tblDoctors, [
        {key:'doctor', title:'الطبيب (رقم وظيفي — الاسم)'},
        {key:'orders', title:'عدد الطلبات', format:v=>nf.format(v||0)},
        {key:'qty',    title:'إجمالي الكمية', format:v=>nf.format(v||0)},
        {key:'amount', title:'إجمالي Aft Disc', format:v=>cf.format(v||0)},
      ], doctorsRows);

      const sectionsRows = bySection.map(x=>({ section:x.key, orders:x.count, qty:x.qty, amount:x.amount }));
      els.sectionsCountChip.textContent = `${sectionsRows.length} قسم`;
      renderTable(els.tblSections, [
        {key:'section', title:'القسم'},
        {key:'orders',  title:'عدد الطلبات', format:v=>nf.format(v||0)},
        {key:'qty',     title:'إجمالي الكمية', format:v=>nf.format(v||0)},
        {key:'amount',  title:'إجمالي Aft Disc', format:v=>cf.format(v||0)},
      ], sectionsRows);

      const coverageRows = byCover.map(x=>({ coverage:x.key, orders:x.count, qty:x.qty, amount:x.amount }));
      els.coverageCountChip.textContent = `${coverageRows.length} تغطية`;
      renderTable(els.tblCoverage, [
        {key:'coverage', title:'التغطية المالية'},
        {key:'orders',   title:'عدد الطلبات', format:v=>nf.format(v||0)},
        {key:'qty',      title:'إجمالي الكمية', format:v=>nf.format(v||0)},
        {key:'amount',   title:'إجمالي Aft Disc', format:v=>cf.format(v||0)},
      ], coverageRows);

      // Top requester per service (table)
      const topReqPerService = [];
      for(const svc of byService){
        const [code, name] = svc.key.split(' | ');
        const docAgg = aggBy(svc.rows, x=> x.doctorKey)
          .map(o=>({ key:o.key,
                     disp: (o.rows[0]?.doctorId? (o.rows[0].doctorId+' — ') : '') + (docNameByKey.get(o.key) || o.rows[0]?.doctor || o.key),
                     orders:o.count, qty:o.qty }))
          .sort((a,b)=> b.orders - a.orders)
          .slice(0,5);
        docAgg.forEach((d,i)=> topReqPerService.push({ serviceCode:code, serviceName:name, rank:i+1, doctor:d.disp, orders:d.orders, qty:d.qty }));
      }
      renderTable(els.tblTopReqPerService, [
        {key:'serviceCode', title:'رقم الخدمة'},
        {key:'serviceName', title:'اسم الخدمة'},
        {key:'rank',        title:'#'},
        {key:'doctor',      title:'الطبيب'},
        {key:'orders',      title:'طلبات', format:v=>nf.format(v||0)},
        {key:'qty',         title:'Qty', format:v=>nf.format(v||0)},
      ], topReqPerService);

      // ====== Charts ======

      // 0) إخفاء الـ Heatmap كليًا لو موجود في الـ HTML
      (function hideHeat(){
        const el = $('#chartHeatmap');
        if (el) { const card = el.closest('.glass'); if(card) card.style.display='none'; }
        hide(els.expHeat);
      })();

      // 1) Top by Qty (عمودي) + داتا ليبل عند الهوفر
      const topQ = byService.slice(0,20);
      drawChart('chartTopByQty', {
        type:'bar',
        data:{
          labels: topQ.map(x=> x.key),
          datasets:[{ label:'Qty', data: topQ.map(x=> x.qty), backgroundColor: gradientColors(topQ.length) }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip:{ callbacks:{ label:(ctx)=>`Qty: ${nf.format(ctx.parsed.y ?? ctx.parsed)}` } },
            ...hoverDL((v)=> nf.format(v))
          },
          scales:{ x:{ ticks:{ autoSkip:false, maxRotation:45 } } },
          onClick: (evt, elements)=>{
            if(!elements.length) return;
            const i = elements[0].index; const g = topQ[i];
            attachModalFromRows(`تفاصيل — ${g.key}`, g.rows);
          }
        }
      });

      // 2) Top by Profitability (أفقي)  — estProfit = amount - (ctax + ptax)
      const withProfit = byService.map(s=>{
        const [code, name] = s.key.split(' | ');
        const estProfit = s.amount - (s.ctax + s.ptax);
        return {...s, _label: s.key, _estProfit: estProfit};
      }).sort((a,b)=> b._estProfit - a._estProfit).slice(0,20);

      drawChart('chartTopByAmount', { // نستخدم نفس الكانفاس الموجود
        type:'bar',
        data:{
          labels: withProfit.map(x=> x._label),
          datasets:[{ label:'الربحية (تقديرية)', data: withProfit.map(x=> x._estProfit), backgroundColor: gradientColors(withProfit.length) }]
        },
        options:{
          indexAxis:'y',
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip:{ callbacks:{ label:(ctx)=>`ربحية: ${cf.format(ctx.parsed.x ?? ctx.parsed)}` } },
            ...hoverDL((v)=> cf.format(v))
          },
          onClick: (evt, elements)=>{
            if(!elements.length) return; const i = elements[0].index; const g = withProfit[i];
            attachModalFromRows(`تفاصيل — ${g._label}`, g.rows);
          }
        }
      });

      // 3) By Doctor (أفقي) + ألوان ثابتة لكل طبيب
      const topD = byDoctor.slice(0,20);
      drawChart('chartByDoctor', {
        type:'bar',
        data:{
          labels: topD.map(x=> x.disp),
          datasets:[{ label:'Orders', data: topD.map(x=> x.count), backgroundColor: topD.map(x=> colorForDoctor(x.key)) }]
        },
        options:{
          indexAxis:'y',
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip:{ callbacks:{ label:(ctx)=>`طلبات: ${nf.format(ctx.parsed.x ?? ctx.parsed)}` } },
            ...hoverDL((v)=> nf.format(v))
          },
          onClick: (evt, elements)=>{
            if(!elements.length) return; const i = elements[0].index; const g = topD[i];
            attachModalFromRows(`تفاصيل — ${g.disp}`, g.rows);
          }
        }
      });

      // 4) By Section (Pie) + DataLabel = نسبة مئوية بالأسود
const secFiltered = bySection.filter(x=> x.count >= 10);
const secTotal = secFiltered.reduce((s,x)=> s + x.count, 0) || 1;

drawChart('chartBySection', {
  type:'doughnut',              // ← Doughnut بدل Pie
  data:{ 
    labels: secFiltered.map(x=> x.key),
    datasets:[{ data: secFiltered.map(x=> x.count) }]
  },
  options:{
    responsive:true,
    maintainAspectRatio:false,
    plugins:{
      legend:{ position:'right' },
      tooltip:{ callbacks:{ 
        label:(ctx)=> `${ctx.label}: ${nf.format(ctx.parsed)} (${(ctx.parsed*100/secTotal).toFixed(1)}%)` 
      }},
      datalabels:{
        color:'#000',
        backgroundColor:'#fff',
        borderRadius:6,
        padding:4,
        formatter:(v)=> `${(v*100/secTotal).toFixed(1)}%`
      }
    },
    cutout:'55%' // شكل دونت أنظف
  }
});


      // 5) Pivot Chart: "مين بيطلب أكتر لكل فحص"

      // 5) Pivot Chart: "مين بيطلب أكتر لكل فحص؟"  — (Stacked: Service × Doctor)
(function renderSvcDoctorStacked(){
  const canvas = document.getElementById('chartSvcDoctorStacked');
  if (!canvas){ console.warn('Canvas not found: chartSvcDoctorStacked'); return; }

  const TOP_SVC = 12;          // عدد الفحوصات في المحور Y
  const TOP_DOC_PER_SVC = 5;   // أفضل أطباء لكل فحص

  const svcTop = byService.slice(0, TOP_SVC);
  const labels = svcTop.map(s => s.key); // "code | name"

  // اجمع (طبيب -> عدد الطلبات) لكل فحص، واحتفِظ بتسميات الأطباء
  const svcDocAgg = svcTop.map(s => {
    const agg = aggBy(s.rows, x => x.doctorKey)
                .sort((a,b)=> b.count - a.count)
                .slice(0, TOP_DOC_PER_SVC);
    // label للطبيب: (ID — الاسم) لو متاح
    const nameOf = (o) => (o.rows[0]?.doctorId ? (o.rows[0].doctorId + ' — ') : '') + (o.rows[0]?.doctor || o.key);
    return {
      svc: s,
      countsMap: new Map(agg.map(o => [o.key, o.count])),
      labelsMap: new Map(agg.map(o => [o.key, nameOf(o)]))
    };
  });

  // اتحاد الأطباء (ترتيب إدراج)
  const doctorKeyToLabel = new Map();
  svcDocAgg.forEach(({labelsMap})=>{
    labelsMap.forEach((label, dkey)=>{
      if(!doctorKeyToLabel.has(dkey)) doctorKeyToLabel.set(dkey, label);
    });
  });
  const doctorKeys   = Array.from(doctorKeyToLabel.keys());
  const doctorLabels = Array.from(doctorKeyToLabel.values());

  // ابني الداتا سِت لكل طبيب عبر جميع الفحوصات
  const datasets = doctorKeys.map(dkey => ({
    label: doctorKeyToLabel.get(dkey),
    data: svcDocAgg.map(({countsMap}) => countsMap.get(dkey) || 0),
    backgroundColor: colorForDoctor(dkey),
    stack: 'req'
  }));

  if (charts['chartSvcDoctorStacked']) charts['chartSvcDoctorStacked'].destroy();
  charts['chartSvcDoctorStacked'] = new Chart(canvas.getContext('2d'), {
    type:'bar',
    data:{ labels, datasets },
    options:{
      indexAxis:'y',
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ position:'bottom', labels:{ boxWidth:12 } },
        tooltip:{ callbacks:{ label:(ctx)=> `${ctx.dataset.label}: ${nf.format(ctx.parsed.x ?? ctx.parsed)}` } },
        ...hoverDL((v)=> nf.format(v))
      },
      scales:{
        x:{ stacked:true, ticks:{ precision:0 } },
        y:{ stacked:true, ticks:{ autoSkip:false, maxRotation:0 } }
      },
      // فتح تفاصيل فحص × طبيب في المودال
      onClick:(evt, elements)=>{
        if(!elements.length) return;
        const p = elements[0];
        const svcLabel = labels[p.index];
        const svcCode  = svcLabel.split(' | ')[0];
        const dkey     = doctorKeys[p.datasetIndex];
        const dlabel   = doctorKeyToLabel.get(dkey);
        const rows = DATA.filter(r => r.serviceCode === svcCode && r.doctorKey === dkey);
        attachModalFromRows(`تفاصيل — ${svcLabel} × ${dlabel}`, rows);
      }
    }
  });

  // فعّل زر التصدير وخزّن البيفوت في الكاش
  enable(els.expSvcDocPivot);
  CACHE.svcDocPivot = {
    services: labels,             // صفوف
    doctorKeys,                   // مفاتيح الأطباء (للمرجع)
    doctorLabels,                 // عناوين الأعمدة
    // مصفوفة القيم: [عمود الطبيب][صف الخدمة]
    matrix: datasets.map(ds => ds.data)
  };
})();



      // labels = Top 12 Services / datasets = Union Top 5 doctors per service (counts)
      (function renderPivotChart(){
        const containerCard = els.tblTopReqPerService?.closest('.glass');
        if(!containerCard) return;
        // أنشئ كانفاس أعلى الجدول مرة واحدة
        let pivotCanvas = $('#chartServiceDoctorPivot');
        if(!pivotCanvas){
          pivotCanvas = document.createElement('canvas');
          pivotCanvas.id = 'chartServiceDoctorPivot';
          pivotCanvas.style.maxHeight = '520px';
          containerCard.insertBefore(pivotCanvas, containerCard.querySelector('h3').nextSibling);
        }

        const SVC = byService.slice(0,12);
        const labels = SVC.map(s=> s.key);
        const doctorSet = new Map(); // key -> disp
        const svcDoctorCounts = SVC.map(s=>{
          const counts = aggBy(s.rows, x=> x.doctorKey)
                         .sort((a,b)=> b.count - a.count)
                         .slice(0,5);
          counts.forEach(o => doctorSet.set(o.key, (o.rows[0]?.doctorId? (o.rows[0].doctorId+' — ') : '') + (docNameByKey.get(o.key) || o.rows[0]?.doctor || o.key)));
          return { svc:s, counts };
        });
        const doctors = Array.from(doctorSet.keys());

        const datasets = doctors.map(dkey=>{
          const label = doctorSet.get(dkey);
          return {
            label,
            data: SVC.map(s=>{
              const hit = aggBy(s.rows, x=> x.doctorKey).find(o=>o.key===dkey);
              return hit ? hit.count : 0;
            }),
            backgroundColor: colorForDoctor(dkey),
            stack:'req'
          };
        });

        // ارسم
        if (charts['chartServiceDoctorPivot']) charts['chartServiceDoctorPivot'].destroy();
        charts['chartServiceDoctorPivot'] = new Chart(pivotCanvas.getContext('2d'), {
          type:'bar',
          data:{ labels, datasets },
          options:{
            indexAxis:'y',
            responsive:true,
            maintainAspectRatio:false,
            plugins:{
              tooltip:{ callbacks:{ label:(ctx)=> `${ctx.dataset.label}: ${nf.format(ctx.parsed.x ?? ctx.parsed)}` } },
              legend:{ position:'bottom', labels:{ boxWidth:12 } },
              ...hoverDL((v)=> nf.format(v))
            },
            scales:{
              x:{ stacked:true },
              y:{ stacked:true, ticks:{ autoSkip:false, maxRotation:0 } }
            }
          }
        });
      })();

      // ===== Exports (individual) =====
      enable(els.btnExportAll);
      enable(els.expTopQty); enable(els.expTopAmt); enable(els.expByDoctor); enable(els.expBySection);
      // heatmap export مخفي

      enable(els.expTblServices); enable(els.expTblDoctors);
      enable(els.expTblSections); enable(els.expTblCoverage); enable(els.expTopReqPerService);

      CACHE = {
        byService, byDoctor, bySection, byCover,
        servicesRows, doctorsRows, sectionsRows, coverageRows, topReqPerService
      };

    }catch(err){
      console.error(err);
      alert('حدث خطأ أثناء التحليل: ' + (err && err.message ? err.message : err));
    }finally{
      els.loading.classList.add('hidden');
    }
  }

  // Export handlers

  els.expSvcDocPivot?.addEventListener('click', ()=>{
  const P = CACHE.svcDocPivot;
  if(!P){ alert('لا توجد بيانات للتصدير بعد.'); return; }

  const headers = ['Service', ...P.doctorLabels];
  const rows = P.services.map((svcLabel, rowIdx)=>{
    const rec = { Service: svcLabel };
    P.doctorLabels.forEach((colLabel, colIdx)=>{
      // m[colIdx][rowIdx] = قيمة الطبيب colIdx للفحص rowIdx
      rec[colLabel] = P.matrix[colIdx][rowIdx] || 0;
    });
    return rec;
  });

  exportSheet('Service_Doctor_Pivot', rows, headers);
});


  els.btnExportAll?.addEventListener('click', ()=>{
    if(!DATA.length) return;
    const wb = XLSX.utils.book_new();
    const add = (name, arr, headers) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arr, { header: headers }), name);

    const S = CACHE.servicesRows.map(x=>({
      ServiceCode:x.serviceCode, ServiceName:x.serviceName, Qty:x.qty, Orders:x.orders,
      Amount_AftDisc:x.amount, EstProfit:x.estProfit, PatientPart:x.ppart, CompanyPart:x.cpart, CompanyTax:x.ctax, PatientTax:x.ptax
    }));
    add('Services Summary', S, ['ServiceCode','ServiceName','Qty','Orders','Amount_AftDisc','EstProfit','PatientPart','CompanyPart','CompanyTax','PatientTax']);

    const D = CACHE.doctorsRows.map(x=>({ Doctor:x.doctor, Orders:x.orders, Qty:x.qty, Amount_AftDisc:x.amount }));
    add('Doctors Summary', D, ['Doctor','Orders','Qty','Amount_AftDisc']);

    const Sec = CACHE.sectionsRows.map(x=>({ Section:x.section, Orders:x.orders, Qty:x.qty, Amount_AftDisc:x.amount }));
    add('Sections Summary', Sec, ['Section','Orders','Qty','Amount_AftDisc']);

    const Cov = CACHE.coverageRows.map(x=>({ Coverage:x.coverage, Orders:x.orders, Qty:x.qty, Amount_AftDisc:x.amount }));
    add('Coverage Summary', Cov, ['Coverage','Orders','Qty','Amount_AftDisc']);

    // Raw filtered
    add('Filtered Rows', DATA.map(x=>({
      Date: fmtDate(x.orderDate), ServiceCode:x.serviceCode, ServiceName:x.serviceName, Qty:x.qty, AftDisc:x.aft,
      DoctorID:x.doctorId, DoctorName:x.doctor, Section:x.section, Coverage:x.coverage, FileNo:x.fileNo, Patient:x.patient,
      BeforeDisc:x.bef, PatPart:x.ppart, CompPart:x.cpart, CompTax:x.ctax, PatTax:x.ptax,
    })), ['Date','ServiceCode','ServiceName','Qty','AftDisc','DoctorID','DoctorName','Section','Coverage','FileNo','Patient','BeforeDisc','PatPart','CompPart','CompTax','PatTax']);

    XLSX.writeFile(wb, 'Lab-Services-Reports.xlsx');
  });

  els.expTopQty?.addEventListener('click', ()=>{
    const arr = CACHE.byService.slice(0,20).map(x=>({ Service:x.key, Qty:x.qty }));
    exportSheet('Top20_by_Qty', arr, ['Service','Qty']);
  });
  els.expTopAmt?.addEventListener('click', ()=>{
    // أصبح Top by Profit
    const arr = CACHE.byService
      .map(x=>({ Service:x.key, EstProfit: (x.amount - (x.ctax + x.ptax)) }))
      .sort((a,b)=> b.EstProfit - a.EstProfit)
      .slice(0,20);
    exportSheet('Top20_by_Profit', arr, ['Service','EstProfit']);
  });
  els.expByDoctor?.addEventListener('click', ()=>{
    const arr = CACHE.byDoctor.map(x=>({ Doctor: x.disp || x.key, Orders:x.count, Qty:x.qty, Amount_AftDisc:x.amount }));
    exportSheet('ByDoctor', arr, ['Doctor','Orders','Qty','Amount_AftDisc']);
  });
  els.expBySection?.addEventListener('click', ()=>{
    const arr = CACHE.bySection.map(x=>({ Section:x.key, Orders:x.count, Qty:x.qty, Amount_AftDisc:x.amount }));
    exportSheet('BySection', arr, ['Section','Orders','Qty','Amount_AftDisc']);
  });

  els.expTblServices?.addEventListener('click', ()=>{
    exportSheet('Services_Summary', CACHE.servicesRows.map(x=>({
      ServiceCode:x.serviceCode, ServiceName:x.serviceName, Qty:x.qty, Orders:x.orders,
      Amount_AftDisc:x.amount, EstProfit:x.estProfit, PatientPart:x.ppart, CompanyPart:x.cpart, CompanyTax:x.ctax, PatientTax:x.ptax
    })), ['ServiceCode','ServiceName','Qty','Orders','Amount_AftDisc','EstProfit','PatientPart','CompanyPart','CompanyTax','PatientTax']);
  });
  els.expTblDoctors?.addEventListener('click', ()=>{
    exportSheet('Doctors_Summary', CACHE.doctorsRows.map(x=>({ Doctor:x.doctor, Orders:x.orders, Qty:x.qty, Amount_AftDisc:x.amount })), ['Doctor','Orders','Qty','Amount_AftDisc']);
  });
  els.expTblSections?.addEventListener('click', ()=>{
    exportSheet('Sections_Summary', CACHE.sectionsRows.map(x=>({ Section:x.section, Orders:x.orders, Qty:x.qty, Amount_AftDisc:x.amount })), ['Section','Orders','Qty','Amount_AftDisc']);
  });
  els.expTblCoverage?.addEventListener('click', ()=>{
    exportSheet('Coverage_Summary', CACHE.coverageRows.map(x=>({ Coverage:x.coverage, Orders:x.orders, Qty:x.qty, Amount_AftDisc:x.amount })), ['Coverage','Orders','Qty','Amount_AftDisc']);
  });
  els.expTopReqPerService?.addEventListener('click', ()=>{
    exportSheet('TopRequester_per_Service', CACHE.topReqPerService, ['serviceCode','serviceName','rank','doctor','orders','qty']);
  });

  // Drag & Drop
  ['dragenter','dragover'].forEach(ev=>{
    els.drop?.addEventListener(ev, e=>{
      e.preventDefault(); e.stopPropagation();
      els.drop.classList.add('bg-[#0d1a35]');
    });
  });
  ['dragleave','drop'].forEach(ev=>{
    els.drop?.addEventListener(ev, e=>{
      e.preventDefault(); e.stopPropagation();
      els.drop.classList.remove('bg-[#0d1a35]');
    });
  });
  els.drop?.addEventListener('drop', e=>{
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });
  els.file?.addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0];
    if(f) handleFile(f);
  });

  // Demo workbook
  els.demo?.addEventListener('click', ()=>{
    const ws = XLSX.utils.aoa_to_sheet([
      ['DoctorID','DoctorName','','FileNo','PatientName','','','Coverage','','','OrderDate','ServiceCode','ServiceName','', 'BeforeDisc','AftDisc','Pat Part','Comp Part','Comp Tax','Pat Tax','','','','','','','','Qty','','','','SectionDesc'],
      ['EMP-001','Ramy Jamal Hafez Mohammed','','1001','Ali','','','Cash','','',45504,'41001','CBC','', 90,80,20,60,0,0,'','','','','','','',1,'','','','ER'],
      ['EMP-001','Ramy Jamal Hafez','','1002','Omar','','','Company A','','','2025-09-10','42010','CMP','', 230,220,50,170,0,0,'','','','','','','',2,'','','','OPD'],
      ['','Dr X','','1003','Huda','','','Cash','','',45534,'31005','X-Ray','', 100,100,100,0,0,0,'','','','','','','',1,'','','','ER'], // not lab
      ['EMP-002','Dr C','','1004','Mona','','','Company B','','','11/09/2025','41001','CBC','', 170,160,40,120,0,0,'','','','','','','',2,'','','','ICU'],
    ]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const blob = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const file = new File([blob], 'demo.xlsx', { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    handleFile(file);
  });
})();
