// js/transfer.js
(function () {
  if (!window.db) return;

  /* ------------ Helpers ------------ */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));


  // ---- Robust helpers (fallbacks) ----
function coalesce(...vals){
  for (const v of vals) { if (v && String(v).trim() !== '') return v; }
  return '';
}
function makeDT(dateStr, timeStr, fallbackDateStr){
  const d = coalesce(dateStr, fallbackDateStr);
  const t = coalesce(timeStr);
  if (!d || !t) return null;
  return parseDateTime(d, t);
}



  const charts = {};
  function destroy(id){ if(charts[id]){ charts[id].destroy(); charts[id]=null; } }

  function parseDateTime(d, t){
    if(!d || !t) return null;
    try{
      const [Y,M,D] = d.split('-').map(Number);
      const [h,m,s='0'] = t.split(':');
      return new Date(Y,(M-1),D, parseInt(h||'0'), parseInt(m||'0'), parseInt(s||'0'), 0);
    }catch{ return null; }
  }
  function diffMinutesSmart(start, end){
    if(!start || !end) return null;
    let ms = end - start;
    if(ms < 0){
      const bumped = new Date(end);
      bumped.setDate(bumped.getDate()+1);
      ms = bumped - start;
    }
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
    const avg = Math.round(arr.reduce((a,b)=>a+b,0) / arr.length);
    const srt = arr.slice().sort((a,b)=>a-b);
    const med = srt.length%2 ? srt[(srt.length-1)/2] : Math.round((srt[srt.length/2-1]+srt[srt.length/2])/2);
    return {avg, med};
  }
  function bucketCounts(list){
    const bins = [0,30,60,120,240,480,Infinity];
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
  function renderBar(canvasId, labels, data){
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if(!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ data }] },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
  }

  /* ------------ Toggle create form ------------ */
  const typeRadios = $$('input[name="trType"]');
  const externalBox = $('#externalFields');
  const internalBox = $('#internalFields');
  function applyTransferFields() {
    const type = (document.querySelector('input[name="trType"]:checked')?.value) || 'internal';
    externalBox.classList.toggle('hidden', type !== 'external');
    internalBox.classList.toggle('hidden', type !== 'internal');
  }
  typeRadios.forEach(r => r.addEventListener('change', applyTransferFields));
  applyTransferFields();

  /* ------------ Create / Save ------------ */
  $('#transferForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const type = document.querySelector('input[name="trType"]:checked').value;

    const base = {
      type,
      mrn: fd.get('mrn') || '',
      name: fd.get('name') || '',
      reason: fd.get('reason') || '',
      src_erRegDate: fd.get('src_erRegDate') || '',
      src_erRegTime: fd.get('src_erRegTime') || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (type === 'internal') {
      const payload = {
        ...base,
        int_date: fd.get('int_date') || '',
        int_departTime: fd.get('int_departTime') || '',
        int_consultReqTime: fd.get('int_consultReqTime') || '',
        int_consultRespTime: fd.get('int_consultRespTime') || '',
        int_admitDate: fd.get('int_admitDate') || '',
        int_admitTime: fd.get('int_admitTime') || '',
        internalDept: fd.get('internalDept') || '',
        int_refPhysician: fd.get('int_refPhysician') || '',
        int_sourceNurse: fd.get('int_sourceNurse') || '',
        int_recvReception: fd.get('int_recvReception') || '',
        int_recvPhysician: fd.get('int_recvPhysician') || '',
        int_recvNurse: fd.get('int_recvNurse') || ''
      };
      // توافق قديم لجدول قديم لو موجود
      payload.date = payload.int_date;
      payload.depart = payload.int_departTime;
      await db.collection('ed_transfers').add(payload);
      e.target.reset(); applyTransferFields();
      return;
    }

    // External with accept paper
    let acceptPaperUrl = '', acceptPaperName = '', acceptPaperPath = '';
    const file = fd.get('ext_acceptPaper');
    if (file && file.name) {
      acceptPaperName = file.name;
      acceptPaperPath = `transferAcceptPapers/${(fd.get('mrn')||'NA')}_${Date.now()}_${file.name}`;
      const ref = storage.ref().child(acceptPaperPath);
      await ref.put(file);
      acceptPaperUrl = await ref.getDownloadURL();
    }

    const payload = {
      ...base,
      ext_recvHospital: fd.get('ext_recvHospital') || '',
      ext_recvDept: fd.get('ext_recvDept') || '',
      ext_recvMrn: fd.get('ext_recvMrn') || '',
      ext_departDate: fd.get('ext_departDate') || '',
      ext_departTime: fd.get('ext_departTime') || '',
      ext_arriveAcceptDate: fd.get('ext_arriveAcceptDate') || '',
      ext_arriveAcceptTime: fd.get('ext_arriveAcceptTime') || '',
      ext_admitDate: fd.get('ext_admitDate') || '',
      ext_admitTime: fd.get('ext_admitTime') || '',
      ext_arriveBackDate: fd.get('ext_arriveBackDate') || '',
      ext_arriveBackTime: fd.get('ext_arriveBackTime') || '',
      ext_acceptPaperUrl: acceptPaperUrl,
      ext_acceptPaperName: acceptPaperName,
      ext_acceptPaperPath: acceptPaperPath
    };
    // توافق قديم
    payload.date = payload.ext_departDate;
    payload.depart = payload.ext_departTime;
    payload.arriveAccept = payload.ext_arriveAcceptTime;
    payload.arriveBack = payload.ext_arriveBackTime;
    payload.recvHospital = payload.ext_recvHospital;
    payload.recvDept = payload.ext_recvDept;
    payload.recvMrn = payload.ext_recvMrn;

    await db.collection('ed_transfers').add(payload);
    e.target.reset(); applyTransferFields();
  });

  /* ------------ Render table + analytics ------------ */
  auth.onAuthStateChanged(u => {
    if (!u) return;
    db.collection('ed_transfers').orderBy('createdAt', 'desc').onSnapshot(s => {
      const tb = document.querySelector('#transferTable tbody');
      if (!tb) return;
      tb.innerHTML = '';

      const intRows = [];   // internal metrics rows
      const extRows = [];   // external metrics rows
      const intConsult = [], intDepartAdmit = [], intERAdmit = [];
      const extPrep = [], extTravel = [], extAcceptAdmit = [], extTotal = [], extRoundTrip = [];

      s.forEach(d => {
        const r = d.data();
        const id = d.id;

        // ==== table row ====
        tb.innerHTML += `<tr>
          <td>${r.type || ''}</td>
          <td>${r.mrn || ''}</td>
          <td>${r.name || ''}</td>

          <td>${r.src_erRegDate || ''}</td>
          <td>${r.src_erRegTime || ''}</td>

          <!-- داخلي -->
          <td>${r.int_date || ''}</td>
          <td>${r.int_departTime || ''}</td>
          <td>${r.int_consultReqTime || ''}</td>
          <td>${r.int_consultRespTime || ''}</td>
          <td>${r.int_admitDate || ''}</td>
          <td>${r.int_admitTime || ''}</td>
          <td>${r.internalDept || ''}</td>
          <td>${r.int_refPhysician || ''}</td>
          <td>${r.int_sourceNurse || ''}</td>
          <td>${r.int_recvReception || ''}</td>
          <td>${r.int_recvPhysician || ''}</td>
          <td>${r.int_recvNurse || ''}</td>

          <!-- خارجي -->
          <td>${r.ext_recvHospital || ''}</td>
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

          <td class="whitespace-nowrap flex gap-2">
            <button class="btn btn-ghost btn-xs" title="تعديل" onclick='transferOpenEdit("${id}")'><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="btn btn-ghost btn-xs text-error" title="حذف" onclick='transferDelete("${id}")'><i class="fa-regular fa-trash-can"></i></button>
          </td>
        </tr>`;

        // ==== analytics ====
        const erStart = parseDateTime(r.src_erRegDate || '', r.src_erRegTime || '');
        if ((r.type||'') === 'internal') {
          const consultReq  = parseDateTime(r.int_date || '', r.int_consultReqTime || '');
          const consultResp = parseDateTime(r.int_date || '', r.int_consultRespTime || '');
          const departDT    = parseDateTime(r.int_date || '', r.int_departTime || '');
          const admitDT     = parseDateTime(r.int_admitDate || r.int_date || '', r.int_admitTime || '');

          const mConsult   = diffMinutesSmart(consultReq, consultResp);
          const mDepAdmit  = diffMinutesSmart(departDT, admitDT);
          const mERAdmit   = diffMinutesSmart(erStart, admitDT);

          intConsult.push(mConsult);
          intDepartAdmit.push(mDepAdmit);
          intERAdmit.push(mERAdmit);

          intRows.push({
            mrn:r.mrn, name:r.name,
            consult: mConsult, depAdmit: mDepAdmit, erAdmit: mERAdmit
          });
  } else {
  // pick available fields (support legacy fields too)
  const departTimeStr = coalesce(r.ext_departTime, r.depart);
  const departDateStr = coalesce(r.ext_departDate, r.date);

  const arriveTimeStr = coalesce(r.ext_arriveAcceptTime, r.arriveAccept); // legacy fallback
  const arriveDateStr = coalesce(r.ext_arriveAcceptDate, r.ext_departDate, r.date);

  const admitTimeStr  = coalesce(r.ext_admitTime);
  const admitDateStr  = coalesce(r.ext_admitDate, r.ext_arriveAcceptDate, r.ext_departDate, r.date);

  const backTimeStr   = coalesce(r.ext_arriveBackTime, r.arriveBack);     // legacy fallback
  const backDateStr   = coalesce(r.ext_arriveBackDate, r.ext_admitDate, r.ext_arriveAcceptDate, r.ext_departDate, r.date);

  const erRegTimeStr  = coalesce(r.src_erRegTime);
  const erRegDateStr  = coalesce(r.src_erRegDate, r.ext_departDate, r.date);

  // build Date objects with graceful fallbacks
  const erStart   = makeDT(erRegDateStr,  erRegTimeStr);
  const departDT  = makeDT(departDateStr, departTimeStr, erRegDateStr);
  const arriveDT  = makeDT(arriveDateStr, arriveTimeStr, departDateStr);
  const admitDT   = makeDT(admitDateStr,  admitTimeStr,  arriveDateStr);
  const backDT    = makeDT(backDateStr,   backTimeStr,   admitDateStr);

  // metrics
  const mPrep     = diffMinutesSmart(erStart,  departDT); // تجهيز قبل المغادرة
  const mTravel   = diffMinutesSmart(departDT, arriveDT); // زمن الرحلة
  const mAccAdmit = diffMinutesSmart(arriveDT, admitDT);  // الوصول هناك → الدخول
  const mTotal    = diffMinutesSmart(erStart,  admitDT);  // الإجمالي (التسجيل → الدخول)
  const mRound    = (departDT && backDT) ? diffMinutesSmart(departDT, backDT) : null;

  extPrep.push(mPrep);
  extTravel.push(mTravel);
  extAcceptAdmit.push(mAccAdmit);
  extTotal.push(mTotal);
  if (mRound != null) extRoundTrip.push(mRound);

  extRows.push({
    mrn:r.mrn, name:r.name,
    prep:mPrep, travel:mTravel, accAdmit:mAccAdmit, total:mTotal, roundTrip:mRound
  });
}

      });

      // ===== Internal KPIs render =====
      const intAgg1 = avgMed(intConsult);
      const intAgg2 = avgMed(intDepartAdmit);
      const intAgg3 = avgMed(intERAdmit);
      $('#trIntStats').innerHTML = `
        <div class="stat"><div class="stat-title">رد الاستشارة — متوسط</div><div class="stat-value">${fmt(intAgg1.avg)}</div><div class="stat-desc">الوسيط ${fmt(intAgg1.med)}</div></div>
        <div class="stat"><div class="stat-title">مغادرة → دخول القسم — متوسط</div><div class="stat-value">${fmt(intAgg2.avg)}</div><div class="stat-desc">الوسيط ${fmt(intAgg2.med)}</div></div>
        <div class="stat"><div class="stat-title">تسجيل الطوارئ → دخول القسم — متوسط</div><div class="stat-value">${fmt(intAgg3.avg)}</div><div class="stat-desc">الوسيط ${fmt(intAgg3.med)}</div></div>
      `;
      const bc1 = bucketCounts(intConsult);
      renderBar('trIntChartConsult', bc1.labels, bc1.counts);
      const bc2 = bucketCounts(intDepartAdmit);
      renderBar('trIntChartDepartAdmit', bc2.labels, bc2.counts);

      // table internal
      const t1 = $('#trIntKPITable');
      if (t1){
        const th = t1.tHead || t1.createTHead();
        th.innerHTML = '<tr><th>MRN</th><th>الاسم</th><th>رد الاستشارة</th><th>مغادرة→دخول</th><th>تسجيل الطوارئ→دخول</th></tr>';
        const tb = t1.tBodies[0] || t1.createTBody();
        tb.innerHTML = '';
        intRows.forEach(r=>{
          const tr = tb.insertRow();
          tr.insertCell().textContent = r.mrn || '';
          tr.insertCell().textContent = r.name || '';
          tr.insertCell().textContent = fmt(r.consult);
          tr.insertCell().textContent = fmt(r.depAdmit);
          tr.insertCell().textContent = fmt(r.erAdmit);
        });
      }

      // ===== External KPIs render =====
      const e1 = avgMed(extTravel);     // الرحلة
      const e2 = avgMed(extTotal);      // الإجمالي
      const e3 = avgMed(extPrep);       // تجهيز قبل مغادرة
      const e4 = avgMed(extAcceptAdmit);// من الوصول للدخول
      $('#trExtStats').innerHTML = `
        <div class="stat"><div class="stat-title">زمن الرحلة (مغادرة→وصول)</div><div class="stat-value">${fmt(e1.avg)}</div><div class="stat-desc">الوسيط ${fmt(e1.med)}</div></div>
        <div class="stat"><div class="stat-title">الإجمالي (تسجيل الطوارئ→دخول هناك)</div><div class="stat-value">${fmt(e2.avg)}</div><div class="stat-desc">الوسيط ${fmt(e2.med)}</div></div>
        <div class="stat"><div class="stat-title">التجهيز قبل المغادرة</div><div class="stat-value">${fmt(e3.avg)}</div><div class="stat-desc">الوسيط ${fmt(e3.med)}</div></div>
        <div class="stat"><div class="stat-title">الوصول هناك → الدخول</div><div class="stat-value">${fmt(e4.avg)}</div><div class="stat-desc">الوسيط ${fmt(e4.med)}</div></div>
      `;
      const bcE1 = bucketCounts(extTravel);
      renderBar('trExtChartTravel', bcE1.labels, bcE1.counts);
      const bcE2 = bucketCounts(extTotal);
      renderBar('trExtChartTotal', bcE2.labels, bcE2.counts);

      // table external
      const t2 = $('#trExtKPITable');
      if (t2){
        const th2 = t2.tHead || t2.createTHead();
        th2.innerHTML = '<tr><th>MRN</th><th>الاسم</th><th>التجهيز</th><th>الرحلة</th><th>الوصول→دخول</th><th>الإجمالي</th><th>ذهاب+عودة</th></tr>';
        const tb2 = t2.tBodies[0] || t2.createTBody();
        tb2.innerHTML = '';
        extRows.forEach(r=>{
          const tr = tb2.insertRow();
          tr.insertCell().textContent = r.mrn || '';
          tr.insertCell().textContent = r.name || '';
          tr.insertCell().textContent = fmt(r.prep);
          tr.insertCell().textContent = fmt(r.travel);
          tr.insertCell().textContent = fmt(r.accAdmit);
          tr.insertCell().textContent = fmt(r.total);
          tr.insertCell().textContent = fmt(r.roundTrip);
        });
      }
    });
  });

  /* ------------ Edit modal ------------ */
  function toggleEditSections() {
    const type = (document.querySelector('input[name="trEditType"]:checked')?.value) || 'internal';
    $('#trEditInternalFields').classList.toggle('hidden', type !== 'internal');
    $('#trEditExternalFields').classList.toggle('hidden', type !== 'external');
  }
  $$('input[name="trEditType"]').forEach(r => r.addEventListener('change', toggleEditSections));

  window.transferOpenEdit = async function(id) {
    const doc = await db.collection('ed_transfers').doc(id).get();
    if (!doc.exists) return;
    const r = doc.data();
    const f = $('#trEditForm');

    f.docId.value = id;
    f.prevType.value = r.type || 'internal';
    f.oldAcceptPath.value = r.ext_acceptPaperPath || '';

    f.mrn.value = r.mrn || '';
    f.name.value = r.name || '';
    f.reason.value = r.reason || '';

    f.src_erRegDate.value = r.src_erRegDate || '';
    f.src_erRegTime.value = r.src_erRegTime || '';

    // نوع
    const type = r.type || 'internal';
    $$('input[name="trEditType"]').forEach(el => el.checked = (el.value === type));

    // Internal
    f.int_date.value = r.int_date || '';
    f.int_departTime.value = r.int_departTime || '';
    f.int_consultReqTime.value = r.int_consultReqTime || '';
    f.int_consultRespTime.value = r.int_consultRespTime || '';
    f.int_admitDate.value = r.int_admitDate || '';
    f.int_admitTime.value = r.int_admitTime || '';
    f.internalDept.value = r.internalDept || '';
    f.int_refPhysician.value = r.int_refPhysician || '';
    f.int_sourceNurse.value = r.int_sourceNurse || '';
    f.int_recvReception.value = r.int_recvReception || '';
    f.int_recvPhysician.value = r.int_recvPhysician || '';
    f.int_recvNurse.value = r.int_recvNurse || '';

    // External
    f.ext_recvHospital.value = r.ext_recvHospital || '';
    f.ext_recvDept.value = r.ext_recvDept || '';
    f.ext_recvMrn.value = r.ext_recvMrn || '';
    f.ext_departDate.value = r.ext_departDate || '';
    f.ext_departTime.value = r.ext_departTime || '';
    f.ext_arriveAcceptDate.value = r.ext_arriveAcceptDate || '';
    f.ext_arriveAcceptTime.value = r.ext_arriveAcceptTime || '';
    f.ext_admitDate.value = r.ext_admitDate || '';
    f.ext_admitTime.value = r.ext_admitTime || '';
    f.ext_arriveBackDate.value = r.ext_arriveBackDate || '';
    f.ext_arriveBackTime.value = r.ext_arriveBackTime || '';

    // Current accept paper link
    const link = r.ext_acceptPaperUrl
      ? `<a class="link link-info" href="${r.ext_acceptPaperUrl}" target="_blank">${r.ext_acceptPaperName || 'فتح المرفق'}</a>`
      : '<span class="opacity-60">لا يوجد مرفق</span>';
    $('#trCurrentAcceptLink').innerHTML = link;

    f.ext_acceptPaper.value = '';

    toggleEditSections();
    document.getElementById('trEditModal').showModal();
  };

  $('#trEditSaveBtn')?.addEventListener('click', async ()=>{
    const f = $('#trEditForm');
    const id = f.docId.value; if (!id) return;

    const selectedType = (document.querySelector('input[name="trEditType"]:checked')?.value) || 'internal';
    const prevType = f.prevType.value || 'internal';

    const base = {
      type: selectedType,
      mrn: f.mrn.value || '',
      name: f.name.value || '',
      reason: f.reason.value || '',
      src_erRegDate: f.src_erRegDate.value || '',
      src_erRegTime: f.src_erRegTime.value || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    let payload = { ...base };

    if (selectedType === 'internal') {
      payload = {
        ...payload,
        int_date: f.int_date.value || '',
        int_departTime: f.int_departTime.value || '',
        int_consultReqTime: f.int_consultReqTime.value || '',
        int_consultRespTime: f.int_consultRespTime.value || '',
        int_admitDate: f.int_admitDate.value || '',
        int_admitTime: f.int_admitTime.value || '',
        internalDept: f.internalDept.value || '',
        int_refPhysician: f.int_refPhysician.value || '',
        int_sourceNurse: f.int_sourceNurse.value || '',
        int_recvReception: f.int_recvReception.value || '',
        int_recvPhysician: f.int_recvPhysician.value || '',
        int_recvNurse: f.int_recvNurse.value || ''
      };
      payload.date = payload.int_date;
      payload.depart = payload.int_departTime;

      if (prevType === 'external') {
        const oldPath = f.oldAcceptPath.value;
        if (oldPath) { try { await storage.ref().child(oldPath).delete(); } catch(e){} }
        Object.assign(payload, {
          ext_recvHospital:'', ext_recvDept:'', ext_recvMrn:'',
          ext_departDate:'', ext_departTime:'',
          ext_arriveAcceptDate:'', ext_arriveAcceptTime:'',
          ext_admitDate:'', ext_admitTime:'',
          ext_arriveBackDate:'', ext_arriveBackTime:'',
          ext_acceptPaperUrl:'', ext_acceptPaperName:'', ext_acceptPaperPath:''
        });
      }
    } else {
      // external
      let newUrl = null, newName = null, newPath = null;
      const file = f.ext_acceptPaper.files[0];
      if (file && file.name) {
        newName = file.name;
        newPath = `transferAcceptPapers/${(f.mrn.value||'NA')}_${Date.now()}_${file.name}`;
        const ref = storage.ref().child(newPath);
        await ref.put(file);
        newUrl = await ref.getDownloadURL();
      }

      payload = {
        ...payload,
        ext_recvHospital: f.ext_recvHospital.value || '',
        ext_recvDept: f.ext_recvDept.value || '',
        ext_recvMrn: f.ext_recvMrn.value || '',
        ext_departDate: f.ext_departDate.value || '',
        ext_departTime: f.ext_departTime.value || '',
        ext_arriveAcceptDate: f.ext_arriveAcceptDate.value || '',
        ext_arriveAcceptTime: f.ext_arriveAcceptTime.value || '',
        ext_admitDate: f.ext_admitDate.value || '',
        ext_admitTime: f.ext_admitTime.value || '',
        ext_arriveBackDate: f.ext_arriveBackDate.value || '',
        ext_arriveBackTime: f.ext_arriveBackTime.value || ''
      };
      payload.date = payload.ext_departDate;
      payload.depart = payload.ext_departTime;
      payload.arriveAccept = payload.ext_arriveAcceptTime;
      payload.arriveBack = payload.ext_arriveBackTime;
      payload.recvHospital = payload.ext_recvHospital;
      payload.recvDept = payload.ext_recvDept;
      payload.recvMrn = payload.ext_recvMrn;

      if (newUrl) {
        const oldPath = f.oldAcceptPath.value;
        if (oldPath) { try { await storage.ref().child(oldPath).delete(); } catch(e){} }
        payload.ext_acceptPaperUrl = newUrl;
        payload.ext_acceptPaperName = newName;
        payload.ext_acceptPaperPath = newPath;
      }
    }

    await db.collection('ed_transfers').doc(id).update(payload);
    document.getElementById('trEditModal').close();
  });

  /* ------------ Delete ------------ */
  window.transferDelete = async function(id){
    if (!confirm('حذف السجل؟')) return;
    const ref = db.collection('ed_transfers').doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      const r = snap.data();
      if (r.ext_acceptPaperPath) {
        try { await storage.ref().child(r.ext_acceptPaperPath).delete(); } catch(e){}
      }
      await ref.delete();
    }
  };
})();
