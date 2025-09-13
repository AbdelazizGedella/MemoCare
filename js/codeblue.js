// js/codeblue.js
(function () {
  if (!window.db) return;

  // ===== Helpers (محليّة لهذا الملف) =====
  function parseDateTime(dateStr, timeStr){
    if (!dateStr || !timeStr) return null;
    try{
      const [y,m,d] = dateStr.split('-').map(Number);
      const [hh,mm,ss='0'] = timeStr.split(':');
      return new Date(y,(m-1),d,parseInt(hh||'0'),parseInt(mm||'0'),parseInt(ss||'0'),0);
    }catch{ return null; }
  }
  function diffMinutesSmart(start, end, canBumpNextDay){
    if(!start || !end) return null;
    let ms = end.getTime() - start.getTime();
    if(ms < 0 && canBumpNextDay){
      const bumped = new Date(end); bumped.setDate(bumped.getDate()+1);
      ms = bumped.getTime() - start.getTime();
    }
    return ms < 0 ? null : Math.round(ms/60000);
  }
  function formatMinutes(mins){
    if (mins == null) return '-';
    const h = Math.floor(mins/60), m = mins%60;
    return `${h}h ${m}m`;
  }
  function bucketDestination(destRaw){
    const t = (destRaw||'').toString().trim().toLowerCase();
    if (!t) return 'Other';
    if (t.includes('morgue') || t.includes('mortuary') || t.includes('ثلاجة')) return 'Morgue';
    if (t.includes('icu')) return 'ICU';
    if (t.includes('ward') || t.includes('عنبر') || t.includes('قسم') ) return 'Ward';
    if (t.includes('or') || t.includes('theatre') || t.includes('operation')) return 'OR';
    if (t.includes('transfer') || t.includes('referral') || t.includes('محول') || t.includes('نقل')) return 'Transfer';
    return destRaw || 'Other';
  }

  // ===== إنشاء سجل جديد =====
  $('#codeBlueForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const mrn = (fd.get('mrn')||'').trim();

    // حلقة
    const snap = await db.collection('ed_codeBlue').where('mrn','==',mrn).get();
    const nextEp = fd.get('newEpisode') ? (snap.size + 1) : 1;

    // رفع المرفق
    let sheetUrl='', sheetName='', sheetPath='';
    const file = fd.get('sheet');
    if(file && file.name){
      sheetName = file.name;
      sheetPath = `codeBlueSheets/${mrn}_${Date.now()}_${file.name}`;
      const ref = storage.ref().child(sheetPath);
      await ref.put(file);
      sheetUrl = await ref.getDownloadURL();
    }

    const rec = {
      date: fd.get('date')||'',
      mrn,
      name: fd.get('name')||'',
      arrival: fd.get('arrival')||'',
      dischargeDate: fd.get('dischargeDate')||'',
      discharge: fd.get('discharge')||'',
      outcome: fd.get('outcome')||'',
      destination: fd.get('destination')||'',
      arrivalMethod: fd.get('arrivalMethod')||'self',
      teamDoctors: [...$('#cbDoctors').querySelectorAll('.nm')].map(n=>n.textContent),
      teamNurses:  [...$('#cbNurses').querySelectorAll('.nm')].map(n=>n.textContent),
      teamRT:      [...$('#cbRT').querySelectorAll('.nm')].map(n=>n.textContent),
      sheetUrl, sheetName, sheetPath,
      ep: nextEp,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('ed_codeBlue').add(rec);
    e.target.reset();
    $('#cbDoctors').innerHTML=''; $('#cbNurses').innerHTML=''; $('#cbRT').innerHTML='';
  });

  // ===== عرض مجمّع حسب MRN =====
  function renderCodeBlueGroup(docs){
    const container = $('#codeBlueList');
    container.innerHTML='';
    const byMrn = {};
    docs.forEach(d=>{
      const r=d.data(); r._id=d.id;
      (byMrn[r.mrn] ||= []).push(r);
    });
    Object.keys(byMrn).sort().forEach(mrn=>{
      const eps = byMrn[mrn].sort((a,b)=>(a.ep||1)-(b.ep||1));
      const name = eps[0]?.name || '';
      const card = document.createElement('div');
      card.className='collapse collapse-arrow bg-base-200/30 rounded-xl';
      card.innerHTML = `
        <input type="checkbox">
        <div class="collapse-title text-base font-semibold flex items-center justify-between">
          <div class="flex flex-col">
            <span>MRN: ${mrn}</span>
            <span class="text-sm opacity-80">${name}</span>
          </div>
          <span class="text-xs opacity-70">${eps.length} episode(s)</span>
        </div>
        <div class="collapse-content">
          <div class="overflow-x-auto">
            <table class="table table-sm md:table-md w-full">
              <thead>
                <tr>
                  <th>#</th><th>التاريخ</th><th>الوصول</th>
                  <th>تاريخ الخروج</th><th>الخروج</th>
                  <th>النتيجة</th><th>الوجهة</th><th>Arrival</th>
                  <th>الأطباء</th><th>التمريض</th><th>RT</th><th>ملف</th><th></th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>`;
      const tbody = card.querySelector('tbody');
      eps.forEach(ep=>{
        const doctors = toNames(ep.teamDoctors || ep.team || []);
        const nurses  = toNames(ep.teamNurses || []);
        const rts     = toNames(ep.teamRT || []);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${ep.ep||1}</td>
          <td>${ep.date||''}</td>
          <td>${ep.arrival||''}</td>
          <td>${ep.dischargeDate||''}</td>
          <td>${ep.discharge||''}</td>
          <td>${ep.outcome==='success'?'ناجح (ROSC)':'غير ناجح'}</td>
          <td>${ep.destination||''}</td>
          <td>${ep.arrivalMethod==='rca'?'RCA':'Self'}</td>
          <td>${doctors.join('، ')}</td>
          <td>${nurses.join('، ')}</td>
          <td>${rts.join('، ')}</td>
          <td>${iconLink(ep.sheetUrl)}</td>
          <td class="whitespace-nowrap flex gap-2">
            <button class="btn btn-ghost btn-xs" title="تعديل" onclick='openEdit("${ep._id}")'><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="btn btn-ghost btn-xs text-error" title="حذف" onclick='deleteDoc("${ep._id}")'><i class="fa-regular fa-trash-can"></i></button>
          </td>`;
        tbody.appendChild(tr);
      });
      container.appendChild(card);
    });
  }

  // ===== تحليلات (Chart.js) =====
  const charts = {};
  function destroyChart(id){ if(charts[id]){ charts[id].destroy(); charts[id]=null; } }
  function renderOutcomeChart(successCount, failedCount){
    destroyChart('chartOutcome');
    charts['chartOutcome'] = new Chart(document.getElementById('chartOutcome').getContext('2d'),{
      type:'doughnut',
      data:{ labels:['ناجح (ROSC)','غير ناجح'], datasets:[{ data:[successCount, failedCount] }] },
      options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }
    });
  }
  function renderDestinationChart(countsMap){
    destroyChart('chartDestination');
    const labels = Object.keys(countsMap);
    const data = labels.map(k => countsMap[k]);
    charts['chartDestination'] = new Chart(document.getElementById('chartDestination').getContext('2d'),{
      type:'bar',
      data:{ labels, datasets:[{ label:'Destination', data }] },
      options:{ responsive:true, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }
    });
  }
  function renderLOSChart(losMinutes){
    destroyChart('chartLOS');
    const bins = [0,360,720,1440,2880,Infinity];
    const labels = ['0–6h', '6–12h', '12–24h', '24–48h', '>48h'];
    const counts = [0,0,0,0,0];
    losMinutes.forEach(m=>{
      if(m==null) return;
      let idx = 4;
      if (m < bins[1]) idx = 0;
      else if (m < bins[2]) idx = 1;
      else if (m < bins[3]) idx = 2;
      else if (m < bins[4]) idx = 3;
      counts[idx]++;
    });
    charts['chartLOS'] = new Chart(document.getElementById('chartLOS').getContext('2d'),{
      type:'bar',
      data:{ labels, datasets:[{ data:counts }] },
      options:{ responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
    });
  }
  function renderLOSTable(rows, avg, med){
    const statsEl = document.getElementById('losStats');
    const tableEl = document.getElementById('losTable');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stats shadow w-full">
          <div class="stat"><div class="stat-title">المتوسط (Average)</div><div class="stat-value">${formatMinutes(avg)}</div></div>
          <div class="stat"><div class="stat-title">الوسيط (Median)</div><div class="stat-value">${formatMinutes(med)}</div></div>
          <div class="stat"><div class="stat-title">عدد السجلات</div><div class="stat-value">${rows.length}</div></div>
        </div>`;
    }
    if (tableEl) {
      const thead = tableEl.tHead || tableEl.createTHead();
      thead.innerHTML = '<tr><th>MRN</th><th>الاسم</th><th>حلقة</th><th>تاريخ الوصول</th><th>وقت الوصول</th><th>تاريخ الخروج</th><th>وقت الخروج</th><th>المدة</th></tr>';
      const tb = tableEl.tBodies[0] || tableEl.createTBody();
      tb.innerHTML = '';
      rows.forEach(r => {
        const tr = tb.insertRow();
        tr.insertCell().textContent = r.mrn || '';
        tr.insertCell().textContent = r.name || '';
        tr.insertCell().textContent = r.ep != null ? r.ep : 1;
        tr.insertCell().textContent = r.date || '';
        tr.insertCell().textContent = r.arrival || '';
        tr.insertCell().textContent = r.dischargeDate || '';
        tr.insertCell().textContent = r.discharge || '';
        tr.insertCell().textContent = formatMinutes(r.losMins);
      });
    }
  }

  // ===== Snapshot حيّ =====
  auth.onAuthStateChanged(u=>{
    if(!u) return;
    db.collection('ed_codeBlue').orderBy('createdAt','desc').onSnapshot(snap=>{
      renderCodeBlueGroup(snap.docs);

      const docs = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
      const outcome = { success:0, failed:0 };
      const destCounts = {};
      const losRows = [];
      const losList = [];
      docs.forEach(r=>{
        const out = (r.outcome||'').toString().toLowerCase();
        if (out==='success') outcome.success++;
        else if (out==='failed') outcome.failed++;

        const bucket = bucketDestination(r.destination);
        destCounts[bucket] = (destCounts[bucket]||0)+1;

        const start = parseDateTime(r.date, r.arrival);
        const end   = parseDateTime(r.dischargeDate || r.date, r.discharge);
        const mins  = diffMinutesSmart(start, end, !r.dischargeDate);

        losRows.push({
          mrn:r.mrn, name:r.name, ep:r.ep,
          date:r.date, arrival:r.arrival,
          dischargeDate:r.dischargeDate||'',
          discharge:r.discharge, losMins:mins
        });
        losList.push(mins);
      });

      const vals = losList.filter(v=>v!=null);
      const avg = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
      const sorted = vals.slice().sort((a,b)=>a-b);
      const med = sorted.length ? (sorted.length%2 ? sorted[(sorted.length-1)/2] : Math.round((sorted[sorted.length/2-1]+sorted[sorted.length/2])/2)) : null;

      renderOutcomeChart(outcome.success, outcome.failed);
      renderDestinationChart(destCounts);
      renderLOSChart(losList);
      renderLOSTable(losRows, avg, med);
    });
  });

  // ===== فتح مودال التعديل =====
  window.openEdit = async function (id){
    const doc = await db.collection('ed_codeBlue').doc(id).get();
    if(!doc.exists) return;
    const r=doc.data();
    const form=$('#editForm');
    form.docId.value=id;
    form.oldSheetPath.value = r.sheetPath || '';
    form.date.value=r.date||'';
    form.mrn.value=r.mrn||'';
    form.name.value=r.name||'';
    form.arrival.value=r.arrival||'';
    form.dischargeDate.value = r.dischargeDate || '';
    form.discharge.value=r.discharge||'';
    form.outcome.value=r.outcome||'success';
    form.destination.value=r.destination||'';
    form.arrivalMethod.value=r.arrivalMethod||'self';
    form.doctors.value = toNames(r.teamDoctors || r.team || []).join('، ');
    form.nurses.value  = toNames(r.teamNurses || []).join('، ');
    form.rt.value      = toNames(r.teamRT || []).join('، ');

    const link = r.sheetUrl ? `<a class="link link-info" href="${r.sheetUrl}" target="_blank">${r.sheetName || 'فتح المرفق'}</a>` : '<span class="opacity-60">لا يوجد مرفق</span>';
    $('#currentSheetLink').innerHTML = link;

    document.getElementById('editModal').showModal();
  };

  // ===== حفظ التعديلات (مع استبدال المرفق اختيارياً) =====
  $('#editSaveBtn')?.addEventListener('click', async ()=>{
    const f=$('#editForm');
    const id=f.docId.value; if(!id) return;

    const payload={
      date:f.date.value, mrn:f.mrn.value, name:f.name.value,
      arrival:f.arrival.value, dischargeDate: f.dischargeDate.value, discharge:f.discharge.value,
      outcome:f.outcome.value, destination:f.destination.value,
      arrivalMethod:f.arrivalMethod.value,
      teamDoctors: toNames(f.doctors.value||''),
      teamNurses:  toNames(f.nurses.value||''),
      teamRT:      toNames(f.rt.value||''),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // استبدال مرفق؟
    const file = f.querySelector('input[name="sheet"]').files[0];
    if (file && file.name){
      // احضر السجل الحالي للحصول على MRN + حذف القديم إن وجد
      const cur = await db.collection('ed_codeBlue').doc(id).get();
      const r = cur.data() || {};
      const mrn = payload.mrn || r.mrn || 'NA';

      // ارفع الجديد
      const newPath = `codeBlueSheets/${mrn}_${Date.now()}_${file.name}`;
      const ref = storage.ref().child(newPath);
      await ref.put(file);
      const newUrl = await ref.getDownloadURL();

      payload.sheetUrl = newUrl;
      payload.sheetName = file.name;
      payload.sheetPath = newPath;

      // احذف القديم لو موجود
      const oldPath = f.oldSheetPath.value || r.sheetPath;
      if (oldPath) {
        try { await storage.ref().child(oldPath).delete(); } catch(e){}
      }
    }

    await db.collection('ed_codeBlue').doc(id).update(payload);
    document.getElementById('editModal').close();
  });

  // ===== حذف =====
  window.deleteDoc = async function(id){
    if(!confirm('حذف السجل؟')) return;
    const ref=db.collection('ed_codeBlue').doc(id);
    const snap=await ref.get();
    if(snap.exists){
      const d=snap.data();
      if(d.sheetPath){ try{ await storage.ref().child(d.sheetPath).delete(); }catch{} }
      await ref.delete();
    }
  };

  // ===== تصدير CodeBlue & LOS (اختياري) =====
  async function exportCodeBlue(){
    const snap = await db.collection('ed_codeBlue').get();
    const rows = snap.docs.map(d => {
      const r = d.data();
      return {
        Date: r.date || '',
        MRN: r.mrn || '',
        Name: r.name || '',
        Arrival: r.arrival || '',
        DischargeDate: r.dischargeDate || '',
        Discharge: r.discharge || '',
        Outcome: r.outcome || '',
        Destination: r.destination || '',
        ArrivalMethod: r.arrivalMethod || '',
        Doctors: (toNames(r.teamDoctors || r.team || []).join(', ')),
        Nurses: (toNames(r.teamNurses || []).join(', ')),
        RT: (toNames(r.teamRT || []).join(', ')),
        Episode: r.ep || 1,
        SheetURL: r.sheetUrl || ''
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'CodeBlue');
    XLSX.writeFile(wb, 'CodeBlue.xlsx');
  }
  async function exportLOS(){
    const snap = await db.collection('ed_codeBlue').get();
    const rows = snap.docs.map(d => {
      const r=d.data();
      const start = parseDateTime(r.date, r.arrival);
      const end = parseDateTime(r.dischargeDate || r.date, r.discharge);
      const mins = diffMinutesSmart(start, end, !r.dischargeDate);
      return {
        MRN: r.mrn || '', Name: r.name || '', Episode: r.ep || 1,
        DateIn: r.date || '', TimeIn: r.arrival || '',
        DateOut: r.dischargeDate || '', TimeOut: r.discharge || '',
        LOS_Minutes: mins ?? ''
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'LOS');
    XLSX.writeFile(wb, 'CodeBlue_LOS.xlsx');
  }
  $('#codeBlueExportBtn')?.addEventListener('click', exportCodeBlue);
  $('#losExportBtn')?.addEventListener('click', exportLOS);
})();
