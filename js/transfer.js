// js/transfer.js
(function () {
  // نتأكد إن في Firebase + Auth + Chart متاحين قبل ما نشتغل
  if (!window.db || !window.auth || typeof Chart === 'undefined') return;

  /* ============== Helpers ============== */
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  function coalesce(...vals){ for(const v of vals){ if(v && String(v).trim()!=='') return v; } return ''; }

  function parseDateTime(d, t){
    if(!d || !t) return null;
    try{
      const [Y,M,D] = d.split('-').map(Number);
      const [h,m,s='0'] = String(t).split(':');
      return new Date(Y,(M-1),D, parseInt(h||'0',10), parseInt(m||'0',10), parseInt(s||'0',10), 0);
    }catch{ return null; }
  }

  function makeDT(dateStr, timeStr, fallbackDateStr){
    const d = coalesce(dateStr, fallbackDateStr);
    const t = coalesce(timeStr);
    if (!d || !t) return null;
    return parseDateTime(d, t);
  }

  function diffMinutesSmart(start, end){
    if(!start || !end) return null;
    let ms = end - start;
    // لو العبور بعد منتصف الليل
    if(ms < 0){ const bumped = new Date(end); bumped.setDate(bumped.getDate()+1); ms = bumped - start; }
    return ms < 0 ? null : Math.round(ms/60000);
  }

  function fmt(mins){
    if(mins == null) return '-';
    const h = Math.floor(mins/60), m = mins%60;
    return `${h}h ${m}m`;
  }

  function avgMed(list){
    const arr = list.filter(v=>v!=null);
    if(!arr.length) return {avg:null, med:null};
    const avg = Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
    const srt = arr.slice().sort((a,b)=>a-b);
    const med = srt.length%2 ? srt[(srt.length-1)/2] : Math.round((srt[srt.length/2-1]+srt[srt.length/2])/2);
    return {avg, med};
  }

  function bucketCounts(list){
    const labels = ['<30m','30–60m','1–2h','2–4h','4–8h','>8h'];
    const counts = [0,0,0,0,0,0];
    list.forEach(v=>{
      if(v==null) return;
      let i=5;
      if(v<30) i=0; else if(v<60) i=1; else if(v<120) i=2; else if(v<240) i=3; else if(v<480) i=4;
      counts[i]++;
    });
    return {labels, counts};
  }

  const charts = {};
  function destroyChart(id){ if(charts[id]){ charts[id].destroy(); charts[id]=null; } }
  function renderBar(canvasId, labels, data){
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if(!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ data }] },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
  }

  // تعبئة تاريخ اليوم تلقائيًا في حقول التاريخ الموجودة داخل فورم التحويل
  function setDefaultDatesToday(){
    const t=new Date();
    const yyyy=t.getFullYear(), mm=String(t.getMonth()+1).padStart(2,'0'), dd=String(t.getDate()).padStart(2,'0');
    const today=`${yyyy}-${mm}-${dd}`;
    $$('#transferForm input[type="date"]').forEach(inp=>{ if(!inp.value) inp.value = today; });
  }

  /* ============== Toggle create form ============== */
  const typeRadios = $$('input[name="trType"]');
  const externalBox = $('#externalFields');
  const internalBox = $('#internalFields');

  function applyTransferFields() {
    const type = (document.querySelector('input[name="trType"]:checked')?.value) || 'internal';
    externalBox?.classList.toggle('hidden', type !== 'external');
    internalBox?.classList.toggle('hidden', type !== 'internal');
  }
  typeRadios.forEach(r => r.addEventListener('change', applyTransferFields));
  applyTransferFields();
  setDefaultDatesToday();

  /* ============== Create / Save (New) ============== */
  $('#transferForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const type = document.querySelector('input[name="trType"]:checked').value;

    const u = firebase.auth().currentUser;
    const createdBy = u ? {
      createdByUid: u.uid||'',
      createdByName: u.displayName||'',
      createdByEmail: u.email||''
    } : { createdByUid:'', createdByName:'', createdByEmail:'' };

    const base = {
      type,
      mrn: fd.get('mrn') || '',
      name: fd.get('name') || '',
      reason: fd.get('reason') || '',
      src_erRegDate: fd.get('src_erRegDate') || '',
      src_erRegTime: fd.get('src_erRegTime') || '',
      ...createdBy,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (type === 'internal') {
      const payload = {
        ...base,
        int_date: fd.get('int_date') || '',
        int_departTime: fd.get('int_departTime') || '',
        // استشارة: تاريخ + وقت (لو الحقول مش موجودة في الـ HTML هتفضل فاضية)
        int_consultReqDate: fd.get('int_consultReqDate') || '',
        int_consultReqTime: fd.get('int_consultReqTime') || '',
        int_consultRespDate: fd.get('int_consultRespDate') || '',
        int_consultRespTime: fd.get('int_consultRespTime') || '',
        // دخول + فتح الملف (الاستقبال)
        int_admitDate: fd.get('int_admitDate') || '',
        int_admitTime: fd.get('int_admitTime') || '',
        int_fileOpenDate: fd.get('int_fileOpenDate') || '',
        int_fileOpenTime: fd.get('int_fileOpenTime') || '',
        // باقي الحقول
        internalDept: fd.get('internalDept') || '',
        int_refPhysician: fd.get('int_refPhysician') || '',
        int_sourceNurse: fd.get('int_sourceNurse') || '',
        int_recvReception: fd.get('int_recvReception') || '',
        int_recvPhysician: fd.get('int_recvPhysician') || '',
        int_recvNurse: fd.get('int_recvNurse') || ''
      };
      // توافق مع أعمدة قديمة
      payload.date   = payload.int_date;
      payload.depart = payload.int_departTime;

      await db.collection('ed_transfers').add(payload);
      e.target.reset();
      applyTransferFields();
      setDefaultDatesToday();
      return;
    }

    // External + رفع ورقة القبول اختياري
    let acceptPaperUrl = '', acceptPaperName = '', acceptPaperPath = '';
    const file = fd.get('ext_acceptPaper');
    if (file && file.name && window.storage) {
      acceptPaperName = file.name;
      acceptPaperPath = `transferAcceptPapers/${(fd.get('mrn')||'NA')}_${Date.now()}_${file.name}`;
      const ref = storage.ref().child(acceptPaperPath);
      await ref.put(file);
      acceptPaperUrl = await ref.getDownloadURL();
    }

    const payload = {
      ...base,
      // القسم المُحَوِّل (لو select موجود في الـ HTML)
      ext_fromDept: fd.get('ext_fromDept') || '',
      // جهة الاستقبال
      ext_recvHospital: fd.get('ext_recvHospital') || '',
      ext_recvDept: fd.get('ext_recvDept') || '',
      ext_recvMrn: fd.get('ext_recvMrn') || '',
      // تواريخ/أوقات الرحلة
      ext_departDate: fd.get('ext_departDate') || '',
      ext_departTime: fd.get('ext_departTime') || '',
      ext_arriveAcceptDate: fd.get('ext_arriveAcceptDate') || '',
      ext_arriveAcceptTime: fd.get('ext_arriveAcceptTime') || '',
      ext_admitDate: fd.get('ext_admitDate') || '',
      ext_admitTime: fd.get('ext_admitTime') || '',
      ext_arriveBackDate: fd.get('ext_arriveBackDate') || '',
      ext_arriveBackTime: fd.get('ext_arriveBackTime') || '',
      // المرفق
      ext_acceptPaperUrl: acceptPaperUrl,
      ext_acceptPaperName: acceptPaperName,
      ext_acceptPaperPath: acceptPaperPath
    };
    // توافق مع أعمدة قديمة
    payload.date         = payload.ext_departDate;
    payload.depart       = payload.ext_departTime;
    payload.arriveAccept = payload.ext_arriveAcceptTime;
    payload.arriveBack   = payload.ext_arriveBackTime;
    payload.recvHospital = payload.ext_recvHospital;
    payload.recvDept     = payload.ext_recvDept;
    payload.recvMrn      = payload.ext_recvMrn;

    await db.collection('ed_transfers').add(payload);
    e.target.reset();
    applyTransferFields();
    setDefaultDatesToday();
  });

  /* ============== Render table + analytics ============== */
  auth.onAuthStateChanged(u => {
    if (!u) return;
    db.collection('ed_transfers').orderBy('createdAt', 'desc').onSnapshot(s => {
      const tb = document.querySelector('#transferTable tbody');
      if (!tb) return;
      tb.innerHTML = '';

      const intRows = [];   // internal metrics rows
      const extRows = [];   // external metrics rows
      const intReqResp = [], intRespAdmit = [], intDepartAdmit = [], intERAdmit = [];
      const extPrep = [], extTravel = [], extAcceptAdmit = [], extTotal = [], extRoundTrip = [];

      s.forEach(d => {
        const r = d.data();
        const id = d.id;

        // ==== صف الجدول ====
        tb.innerHTML += `<tr>
          <td>${r.type || ''}</td>
          <td>${r.mrn || ''}</td>
          <td>${r.name || ''}</td>

          <td>${r.src_erRegDate || ''}</td>
          <td>${r.src_erRegTime || ''}</td>

          <!-- داخلي -->
          <td>${r.int_date || ''}</td>
          <td>${r.int_departTime || ''}</td>
          <td>${r.int_consultReqDate || ''}</td>
          <td>${r.int_consultReqTime || ''}</td>
          <td>${r.int_consultRespDate || ''}</td>
          <td>${r.int_consultRespTime || ''}</td>
          <td>${r.int_admitDate || ''}</td>
          <td>${r.int_admitTime || ''}</td>
          <td>${r.int_fileOpenDate || ''}</td>
          <td>${r.int_fileOpenTime || ''}</td>
          <td>${r.internalDept || ''}</td>
          <td>${r.int_refPhysician || ''}</td>
          <td>${r.int_sourceNurse || ''}</td>
          <td>${r.int_recvReception || ''}</td>
          <td>${r.int_recvPhysician || ''}</td>
          <td>${r.int_recvNurse || ''}</td>

          <!-- خارجي -->
          <td>${r.ext_recvHospital || ''}</td>
          <td>${r.ext_fromDept || ''}</td>
          <td>${r.ext_recvDept || ''}</td>
          <td>${r.ext_departDate || ''}</td>
          <td>${r.ext_departTime || ''}</td>
          <td>${r.ext_arriveAcceptDate || ''}</td>
          <td>${r.ext_arriveAcceptTime || ''}</td>
          <td>${r.ext_admitDate || ''}</td>
          <td>${r.ext_admitTime || ''}</td>
          <td>${r.ext_arriveBackDate || ''}</td>
          <td>${r.ext_arriveBackTime || ''}</td>
          <td>${r.ext_recvMrn || ''}</td>
          <td>${r.reason || ''}</td>
          <td>${r.ext_acceptPaperUrl ? `<a class="btn btn-ghost btn-xs" href="${r.ext_acceptPaperUrl}" target="_blank" title="فتح الملف"><i class="fa-solid fa-file-lines"></i></a>` : ''}</td>

          <td>${coalesce(r.createdByName, r.createdByEmail, r.createdByUid)}</td>

          <td class="whitespace-nowrap flex gap-2">
            <button class="btn btn-ghost btn-xs" title="تعديل" onclick='transferOpenEdit("${id}")'><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="btn btn-ghost btn-xs text-error" title="حذف" onclick='transferDelete("${id}")'><i class="fa-regular fa-trash-can"></i></button>
          </td>
        </tr>`;

        // ==== Analytics ====
        const erStart = parseDateTime(r.src_erRegDate || '', r.src_erRegTime || '');

        if ((r.type||'') === 'internal') {
          const reqDT    = makeDT(r.int_consultReqDate,  r.int_consultReqTime,  r.int_date);
          const respDT   = makeDT(r.int_consultRespDate, r.int_consultRespTime, r.int_consultReqDate||r.int_date);
          const departDT = makeDT(r.int_date,            r.int_departTime,      r.int_date);
          const admitDT  = makeDT(r.int_admitDate||r.int_date, r.int_admitTime, r.int_admitDate||r.int_date);

          const mReqResp   = diffMinutesSmart(reqDT,   respDT);    // طلب → رد
          const mRespAdmit = diffMinutesSmart(respDT,  admitDT);   // الرد → دخول
          const mDepAdmit  = diffMinutesSmart(departDT, admitDT);  // مغادرة → دخول
          const mERAdmit   = diffMinutesSmart(erStart,  admitDT);  // ER تسجيل → دخول

          intReqResp.push(mReqResp);
          intRespAdmit.push(mRespAdmit);
          intDepartAdmit.push(mDepAdmit);
          intERAdmit.push(mERAdmit);

          intRows.push({
            mrn:r.mrn, name:r.name,
            reqResp: mReqResp, respAdmit: mRespAdmit, depAdmit: mDepAdmit, erAdmit: mERAdmit
          });

        } else {
          // External
          const departDT = makeDT(coalesce(r.ext_departDate, r.date), coalesce(r.ext_departTime, r.depart), coalesce(r.ext_departDate, r.date));
          const arriveDT = makeDT(coalesce(r.ext_arriveAcceptDate, r.ext_departDate, r.date), coalesce(r.ext_arriveAcceptTime, r.arriveAccept), coalesce(r.ext_arriveAcceptDate, r.ext_departDate, r.date));
          const admitDT  = makeDT(coalesce(r.ext_admitDate, r.ext_arriveAcceptDate, r.ext_departDate, r.date), coalesce(r.ext_admitTime), coalesce(r.ext_admitDate, r.ext_arriveAcceptDate, r.ext_departDate, r.date));
          const backDT   = makeDT(coalesce(r.ext_arriveBackDate, r.ext_admitDate, r.ext_arriveAcceptDate, r.ext_departDate, r.date), coalesce(r.ext_arriveBackTime, r.arriveBack), coalesce(r.ext_admitDate, r.ext_arriveAcceptDate, r.ext_departDate, r.date));

          const mPrep     = diffMinutesSmart(erStart,  departDT); // تجهيز قبل المغادرة
          const mTravel   = diffMinutesSmart(departDT, arriveDT); // زمن الرحلة
          const mAccAdmit = diffMinutesSmart(arriveDT, admitDT);  // الوصول هناك → الدخول
          const mTotal    = diffMinutesSmart(erStart,  admitDT);  // الإجمالي
          const mRound    = (departDT && backDT) ? diffMinutesSmart(departDT, backDT) : null;

          extPrep.push(mPrep);
          extTravel.push(mTravel);
          extAcceptAdmit.push(mAccAdmit);
          extTotal.push(mTotal);
          if (mRound != null) extRoundTrip.push(mRound);

          extRows.push({
            mrn:r.mrn, name:r.name,
            prep:mPrep, travel:mTravel, accAdmit:mAccAdmit, total:mTotal, roundTrip:mRound,
            fromDept: r.ext_fromDept || ''
          });
        }
      });

      // ===== Internal KPIs render =====
      const i1 = avgMed(intReqResp);     // طلب → رد
      const i2 = avgMed(intRespAdmit);   // الرد → دخول
      const i3 = avgMed(intDepartAdmit); // مغادرة → دخول
      const i4 = avgMed(intERAdmit);     // ER تسجيل → دخول

      $('#trIntStats') && ($('#trIntStats').innerHTML = `
        <div class="stat"><div class="stat-title">طلب الاستشارة → الرد — متوسط</div><div class="stat-value">${fmt(i1.avg)}</div><div class="stat-desc">الوسيط ${fmt(i1.med)}</div></div>
        <div class="stat"><div class="stat-title">الرد → دخول القسم — متوسط</div><div class="stat-value">${fmt(i2.avg)}</div><div class="stat-desc">الوسيط ${fmt(i2.med)}</div></div>
        <div class="stat"><div class="stat-title">مغادرة → دخول القسم — متوسط</div><div class="stat-value">${fmt(i3.avg)}</div><div class="stat-desc">الوسيط ${fmt(i3.med)}</div></div>
        <div class="stat"><div class="stat-title">تسجيل الطوارئ → دخول القسم — متوسط</div><div class="stat-value">${fmt(i4.avg)}</div><div class="stat-desc">الوسيط ${fmt(i4.med)}</div></div>
      `);

      const bc1 = bucketCounts(intReqResp);
      const bc2 = bucketCounts(intRespAdmit);
      const bc3 = bucketCounts(intDepartAdmit);
      renderBar('trIntChartConsult',     bc1.labels, bc1.counts);
      renderBar('trIntChartRespAdmit',   bc2.labels, bc2.counts);
      renderBar('trIntChartDepartAdmit', bc3.labels, bc3.counts);

      // جدول internal KPIs
      const t1 = $('#trIntKPITable');
      if (t1){
        const th = t1.tHead || t1.createTHead();
        th.innerHTML = '<tr><th>MRN</th><th>الاسم</th><th>طلب→رد</th><th>الرد→دخول</th><th>مغادرة→دخول</th><th>ER→دخول</th></tr>';
        const tb = t1.tBodies[0] || t1.createTBody();
        tb.innerHTML = '';
        intRows.forEach(r=>{
          const tr = tb.insertRow();
          tr.insertCell().textContent = r.mrn || '';
          tr.insertCell().textContent = r.name || '';
          tr.insertCell().textContent = fmt(r.reqResp);
          tr.insertCell().textContent = fmt(r.respAdmit);
          tr.insertCell().textContent = fmt(r.depAdmit);
          tr.insertCell().textContent = fmt(r.erAdmit);
        });
      }

      // ===== External KPIs render =====
      const e1 = avgMed(extTravel);     // الرحلة
      const e2 = avgMed(extTotal);      // الإجمالي
      const e3 = avgMed(extPrep);       // تجهيز قبل مغادرة
      const e4 = avgMed(extAcceptAdmit);// من الوصول للدخول
      $('#trExtStats') && ($('#trExtStats').innerHTML = `
        <div class="stat"><div class="stat-title">زمن الرحلة (مغادرة→وصول)</div><div class="stat-value">${fmt(e1.avg)}</div><div class="stat-desc">الوسيط ${fmt(e1.med)}</div></div>
        <div class="stat"><div class="stat-title">الإجمالي (تسجيل الطوارئ→دخول هناك)</div><div class="stat-value">${fmt(e2.avg)}</div><div class="stat-desc">الوسيط ${fmt(e2.med)}</div></div>
        <div class="stat"><div class="stat-title">التجهيز قبل المغادرة</div><div class="stat-value">${fmt(e3.avg)}</div><div class="stat-desc">الوسيط ${fmt(e3.med)}</div></div>
        <div class="stat"><div class="stat-title">الوصول هناك → الدخول</div><div class="stat-value">${fmt(e4.avg)}</div><div class="stat-desc">الوسيط ${fmt(e4.med)}</div></div>
      `);
      const bcE1 = bucketCounts(extTravel);
      const bcE2 = bucketCounts(extTotal);
      renderBar('trExtChartTravel', bcE1.labels, bcE1.counts);
      renderBar('trExtChartTotal',  bcE2.labels, bcE2.counts);
    });
  });

  /* ============== Edit modal ============== */
  function toggleEditSections() {
    const type = (document.querySelector('input[name="trEditType"]:checked')?.value) || 'internal';
    $('#trEditInternalFields')?.classList.toggle('hidden', type !== 'internal');
    $('#trEditExternalFields')?.classList.toggle('hidden', type !== 'external');
  }
  $$('input[name="trEditType"]').forEach(r => r.addEventListener('change', toggleEditSections));

  // فتح مودال التعديل + تعبئة آمنة
  window.transferOpenEdit = async function(id) {
    const doc = await db.collection('ed_transfers').doc(id).get();
    if (!doc.exists) return;
    const r = doc.data();
    const f = $('#trEditForm');
    if (!f) return;

    // helper يضبط القيمة لو العنصر موجود
    const setVal = (name, val='') => {
      const el = f.elements[name];
      if (el) el.value = val || '';
    };

    setVal('docId', id);
    setVal('prevType', r.type || 'internal');
    setVal('oldAcceptPath', r.ext_acceptPaperPath || '');

    setVal('mrn', r.mrn);
    setVal('name', r.name);
    setVal('reason', r.reason);

    setVal('src_erRegDate', r.src_erRegDate);
    setVal('src_erRegTime', r.src_erRegTime);

    // نوع التحويل
    const type = r.type || 'internal';
    $$('input[name="trEditType"]').forEach(el => el.checked = (el.value === type));

    // ===== Internal (لو الحقول موجودة فقط) =====
    setVal('int_date', r.int_date);
    setVal('int_departTime', r.int_departTime);

    setVal('int_consultReqDate', r.int_consultReqDate);
    setVal('int_consultReqTime', r.int_consultReqTime);
    setVal('int_consultRespDate', r.int_consultRespDate);
    setVal('int_consultRespTime', r.int_consultRespTime);

    setVal('int_admitDate', r.int_admitDate);
    setVal('int_admitTime', r.int_admitTime);

    setVal('int_fileOpenDate', r.int_fileOpenDate);
    setVal('int_fileOpenTime', r.int_fileOpenTime);

    setVal('internalDept', r.internalDept);
    setVal('int_refPhysician', r.int_refPhysician);
    setVal('int_sourceNurse', r.int_sourceNurse);
    setVal('int_recvReception', r.int_recvReception);
    setVal('int_recvPhysician', r.int_recvPhysician);
    setVal('int_recvNurse', r.int_recvNurse);

    // ===== External =====
    setVal('ext_recvHospital', r.ext_recvHospital);
    setVal('ext_recvDept', r.ext_recvDept);
    setVal('ext_recvMrn', r.ext_recvMrn);
    setVal('ext_departDate', r.ext_departDate);
    setVal('ext_departTime', r.ext_departTime);
    setVal('ext_arriveAcceptDate', r.ext_arriveAcceptDate);
    setVal('ext_arriveAcceptTime', r.ext_arriveAcceptTime);
    setVal('ext_admitDate', r.ext_admitDate);
    setVal('ext_admitTime', r.ext_admitTime);
    setVal('ext_arriveBackDate', r.ext_arriveBackDate);
    setVal('ext_arriveBackTime', r.ext_arriveBackTime);
    setVal('ext_fromDept', r.ext_fromDept || 'Other'); // لو select موجود

    // رابط ورقة القبول الحالية
    const linkHtml = r.ext_acceptPaperUrl
      ? `<a class="link link-info" href="${r.ext_acceptPaperUrl}" target="_blank">${r.ext_acceptPaperName || 'فتح المرفق'}</a>`
      : '<span class="opacity-60">لا يوجد مرفق</span>';
    const linkBox = $('#trCurrentAcceptLink');
    if (linkBox) linkBox.innerHTML = linkHtml;

    // تفريغ اختيار الملف
    const fileInput = f.elements['ext_acceptPaper'];
    if (fileInput) fileInput.value = '';

    toggleEditSections();
    document.getElementById('trEditModal')?.showModal();
  };

  // حفظ التعديلات من المودال
  $('#trEditSaveBtn')?.addEventListener('click', async ()=>{
    const f = $('#trEditForm'); if (!f) return;
    const id = f.docId?.value; if (!id) return;

    const selectedType = (document.querySelector('input[name="trEditType"]:checked')?.value) || 'internal';
    const prevType = f.prevType?.value || 'internal';

    const base = {
      type: selectedType,
      mrn: f.mrn?.value || '',
      name: f.name?.value || '',
      reason: f.reason?.value || '',
      src_erRegDate: f.src_erRegDate?.value || '',
      src_erRegTime: f.src_erRegTime?.value || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    let payload = { ...base };

    if (selectedType === 'internal') {
      payload = {
        ...payload,
        int_date: f.int_date?.value || '',
        int_departTime: f.int_departTime?.value || '',
        int_consultReqDate: f.int_consultReqDate?.value || '',
        int_consultReqTime: f.int_consultReqTime?.value || '',
        int_consultRespDate: f.int_consultRespDate?.value || '',
        int_consultRespTime: f.int_consultRespTime?.value || '',
        int_admitDate: f.int_admitDate?.value || '',
        int_admitTime: f.int_admitTime?.value || '',
        int_fileOpenDate: f.int_fileOpenDate?.value || '',
        int_fileOpenTime: f.int_fileOpenTime?.value || '',
        internalDept: f.internalDept?.value || '',
        int_refPhysician: f.int_refPhysician?.value || '',
        int_sourceNurse: f.int_sourceNurse?.value || '',
        int_recvReception: f.int_recvReception?.value || '',
        int_recvPhysician: f.int_recvPhysician?.value || '',
        int_recvNurse: f.int_recvNurse?.value || ''
      };
      // توافق قديم
      payload.date   = payload.int_date;
      payload.depart = payload.int_departTime;

      // لو كان قديمًا External واحنا حوّلناه لـ Internal نمسح آثار ملفات القبول
      if (prevType === 'external') {
        const oldPath = f.oldAcceptPath?.value;
        if (oldPath && window.storage) { try { await storage.ref().child(oldPath).delete(); } catch(e){} }
        Object.assign(payload, {
          ext_recvHospital:'', ext_recvDept:'', ext_recvMrn:'',
          ext_departDate:'', ext_departTime:'',
          ext_arriveAcceptDate:'', ext_arriveAcceptTime:'',
          ext_admitDate:'', ext_admitTime:'',
          ext_arriveBackDate:'', ext_arriveBackTime:'',
          ext_acceptPaperUrl:'', ext_acceptPaperName:'', ext_acceptPaperPath:'', ext_fromDept:''
        });
      }
    } else {
      // External
      let newUrl = null, newName = null, newPath = null;
      const fileEl = f.elements['ext_acceptPaper'];
      const file   = fileEl && fileEl.files ? fileEl.files[0] : null;
      if (file && file.name && window.storage) {
        newName = file.name;
        newPath = `transferAcceptPapers/${(f.mrn?.value||'NA')}_${Date.now()}_${file.name}`;
        const ref = storage.ref().child(newPath);
        await ref.put(file);
        newUrl = await ref.getDownloadURL();
      }

      payload = {
        ...payload,
        ext_fromDept: f.elements['ext_fromDept'] ? (f.elements['ext_fromDept'].value||'') : '',
        ext_recvHospital: f.ext_recvHospital?.value || '',
        ext_recvDept: f.ext_recvDept?.value || '',
        ext_recvMrn: f.ext_recvMrn?.value || '',
        ext_departDate: f.ext_departDate?.value || '',
        ext_departTime: f.ext_departTime?.value || '',
        ext_arriveAcceptDate: f.ext_arriveAcceptDate?.value || '',
        ext_arriveAcceptTime: f.ext_arriveAcceptTime?.value || '',
        ext_admitDate: f.ext_admitDate?.value || '',
        ext_admitTime: f.ext_admitTime?.value || '',
        ext_arriveBackDate: f.ext_arriveBackDate?.value || '',
        ext_arriveBackTime: f.ext_arriveBackTime?.value || ''
      };
      // توافق قديم
      payload.date         = payload.ext_departDate;
      payload.depart       = payload.ext_departTime;
      payload.arriveAccept = payload.ext_arriveAcceptTime;
      payload.arriveBack   = payload.ext_arriveBackTime;
      payload.recvHospital = payload.ext_recvHospital;
      payload.recvDept     = payload.ext_recvDept;
      payload.recvMrn      = payload.ext_recvMrn;

      if (newUrl) {
        const oldPath = f.oldAcceptPath?.value;
        if (oldPath && window.storage) { try { await storage.ref().child(oldPath).delete(); } catch(e){} }
        payload.ext_acceptPaperUrl = newUrl;
        payload.ext_acceptPaperName = newName;
        payload.ext_acceptPaperPath = newPath;
      }
    }

    await db.collection('ed_transfers').doc(id).update(payload);
    document.getElementById('trEditModal')?.close();
  });

  /* ============== Delete ============== */
  window.transferDelete = async function(id){
    if (!confirm('حذف السجل؟')) return;
    const ref = db.collection('ed_transfers').doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      const r = snap.data();
      if (r.ext_acceptPaperPath && window.storage) {
        try { await storage.ref().child(r.ext_acceptPaperPath).delete(); } catch(e){}
      }
      await ref.delete();
    }
  };
})();
