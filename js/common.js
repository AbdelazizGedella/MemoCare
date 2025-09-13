// js/common.js
(function () {
  // ========= Firebase Init =========
  const firebaseConfig = {
    apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
    authDomain: "ctwo-eee79.firebaseapp.com",
    projectId: "ctwo-eee79",
    storageBucket: "ctwo-eee79.appspot.com",
    messagingSenderId: "788657051205",
    appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
    measurementId: "G-4VTCQR4ZVR"
  };
  firebase.initializeApp(firebaseConfig);
  if (firebase.analytics) firebase.analytics();

  // Globals
  window.db = firebase.firestore();
  window.storage = firebase.storage();
  window.auth = firebase.auth();
  auth.signInAnonymously().catch(console.warn);

  // ========= Helpers =========
  window.$ = s => document.querySelector(s);
  window.$$ = s => Array.from(document.querySelectorAll(s));

  window.addChip = function (containerId, inputId) {
    const inp = document.getElementById(inputId);
    const v = (inp.value || '').trim();
    if (!v) return;
    const tpl = document.getElementById('chipTpl').content.cloneNode(true);
    tpl.querySelector('.nm').textContent = v;
    document.getElementById(containerId).appendChild(tpl);
    inp.value = '';
  };

  window.toNames = function (val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim() !== '')
      return val.split(/[,،]|\s*•\s*/).map(s => s.trim()).filter(Boolean);
    return [];
  };

  window.iconLink = function (url) {
    return url ? `<a class="btn btn-ghost btn-xs" href="${url}" target="_blank" title="فتح الملف"><i class="fa-solid fa-file-lines"></i></a>` : '';
  };

  window.exportTable = function (tableId, fileName) {
    const table = document.getElementById(tableId);
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    XLSX.writeFile(wb, fileName);
  };

  // i18n (اختياري)
  let currentLang = 'ar';
  $('#langToggle')?.addEventListener('click', () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    $('#langToggle').querySelector('span').textContent = currentLang.toUpperCase();
  });

  // ========= Mortality: Create =========
  $('#mortalityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.collection('ed_mortality').add({
      name: fd.get('name') || '',
      mrn: fd.get('mrn') || '',
      date: fd.get('date') || '',
      time: fd.get('time') || '',
      nurse: fd.get('nurse') || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    e.target.reset();
  });

  // ========= ICU: Create =========
  $('#icuForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.collection('ed_icu').add({
      mrn: fd.get('mrn') || '',
      name: fd.get('name') || '',
      date: fd.get('date') || '',
      depart: fd.get('depart') || '',
      reason: fd.get('reason') || '',
      referral: fd.get('referral') || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    e.target.reset();
  });

  // ========= Live tables (Mortality & ICU) =========
  auth.onAuthStateChanged(u => {
    if (!u) return;

    db.collection('ed_mortality').orderBy('createdAt', 'desc').onSnapshot(s => {
      const tb = document.querySelector('#mortalityTable tbody');
      if (!tb) return;
      tb.innerHTML = '';
      s.forEach(d => {
        const r = d.data();
        tb.innerHTML += `<tr>
          <td>${r.name || ''}</td>
          <td>${r.mrn || ''}</td>
          <td>${r.date || ''}</td>
          <td>${r.time || ''}</td>
          <td>${r.nurse || ''}</td>
        </tr>`;
      });
    });

    db.collection('ed_icu').orderBy('createdAt', 'desc').onSnapshot(s => {
      const tb = document.querySelector('#icuTable tbody');
      if (!tb) return;
      tb.innerHTML = '';
      s.forEach(d => {
        const r = d.data();
        tb.innerHTML += `<tr>
          <td>${r.mrn || ''}</td>
          <td>${r.name || ''}</td>
          <td>${r.date || ''}</td>
          <td>${r.depart || ''}</td>
          <td>${r.reason || ''}</td>
          <td>${r.referral || ''}</td>
        </tr>`;
      });
    });
  });

  // ========= Export All =========
  function parseDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm, ss = '0'] = timeStr.split(':');
      return new Date(y, (m - 1), d, parseInt(hh || '0'), parseInt(mm || '0'), parseInt(ss || '0'), 0);
    } catch { return null; }
  }
  function diffMinutesSmart(start, end, canBumpNextDay) {
    if (!start || !end) return null;
    let ms = end.getTime() - start.getTime();
    if (ms < 0 && canBumpNextDay) {
      const bumped = new Date(end); bumped.setDate(bumped.getDate() + 1);
      ms = bumped.getTime() - start.getTime();
    }
    return ms < 0 ? null : Math.round(ms / 60000);
  }

  async function exportAll() {
    const [codeSnap, mortSnap, trSnap, icuSnap] = await Promise.all([
      db.collection('ed_codeBlue').get(),
      db.collection('ed_mortality').get(),
      db.collection('ed_transfers').get(),
      db.collection('ed_icu').get(),
    ]);

    const code = codeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const mort = mortSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tr = trSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const icu = icuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // CodeBlue
    const codeRows = code.map(r => ({
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
    }));

    // Mortality
    const mortRows = mort.map(r => ({
      Name: r.name || '',
      MRN: r.mrn || '',
      DateOfDeath: r.date || '',
      TimeOfDeath: r.time || '',
      Nurse: r.nurse || ''
    }));

    // Transfers
    const trRows = tr.map(r => ({
      Type: r.type || '',
      MRN: r.mrn || '',
      Name: r.name || '',
      // داخلي
      Int_Date: r.int_date || '',
      Int_DepartTime: r.int_departTime || '',
      Int_ConsultReqTime: r.int_consultReqTime || r.int_consultTime || '',
      Int_ConsultRespTime: r.int_consultRespTime || '',
      Int_AdmitTime: r.int_admitTime || '',
      Internal_Dept: r.internalDept || '',
      Ref_Physician: r.int_refPhysician || '',
      Source_Nurse: r.int_sourceNurse || '',
      Recv_Reception: r.int_recvReception || '',
      Recv_Physician: r.int_recvPhysician || '',
      Recv_Nurse: r.int_recvNurse || '',
      // خارجي
      Ext_RecvHospital: r.ext_recvHospital || '',
      Ext_RecvDept: r.ext_recvDept || '',
      Ext_DepartDate: r.ext_departDate || '',
      Ext_DepartTime: r.ext_departTime || '',
      Ext_ArriveAcceptDate: r.ext_arriveAcceptDate || '',
      Ext_ArriveAcceptTime: r.ext_arriveAcceptTime || '',
      Ext_ArriveBackDate: r.ext_arriveBackDate || '',
      Ext_ArriveBackTime: r.ext_arriveBackTime || '',
      Ext_RecvMRN: r.ext_recvMrn || '',
      Reason: r.reason || '',
      Accept_Paper_URL: r.ext_acceptPaperUrl || ''
    }));

    // ICU
    const icuRows = icu.map(r => ({
      MRN: r.mrn || '', Name: r.name || '', Date: r.date || '', Depart: r.depart || '', Reason: r.reason || '', Referral: r.referral || ''
    }));

    // LOS
    const losRows = code.map(r => {
      const start = parseDateTime(r.date, r.arrival);
      const end = parseDateTime(r.dischargeDate || r.date, r.discharge);
      const mins = diffMinutesSmart(start, end, !r.dischargeDate);
      return {
        MRN: r.mrn || '', Name: r.name || '', Episode: r.ep || 1,
        DateIn: r.date || '', TimeIn: r.arrival || '',
        DateOut: r.dischargeDate || '', TimeOut: r.discharge || '',
        LOS_Minutes: mins ?? '',
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(codeRows), 'CodeBlue');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mortRows), 'Mortality');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trRows), 'Transfers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(icuRows), 'ICU');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(losRows), 'LOS');
    XLSX.writeFile(wb, 'ED_All_Exports.xlsx');
  }

  $('#exportAllBtn')?.addEventListener('click', exportAll);
})();
