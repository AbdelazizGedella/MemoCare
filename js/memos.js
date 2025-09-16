/* ---------------- Firebase Init ---------------- */
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
const db = firebase.firestore();
const storage = firebase.storage();

/* ---------------- Globals ---------------- */
const memoTable = document.getElementById("memo-table");
const loader = document.getElementById("loading-indicator");
const itemsPerPage = 15;
let lastVisible = null;
let isFetching = false;

const DEFAULT_AVATAR = "https://i.imgur.com/6VBx3io.png";
window.userUnackMemos = {};

let ACK_TREND_CHART = null;
let PIE24 = null, PIE48 = null;

let CURRENT_USER = null;
let JOINED_SPACE_IDS = [];
let SPACE_NAMES = {};
let firstBatchResolve;                 // لانتظار تحميل الجدول أولًا
const FIRST_BATCH_DONE = new Promise(res => (firstBatchResolve = res));

/* ---------------- Helpers ---------------- */
const isAdminName = u => ((u?.name || "").toString().includes("[Admin]"));
function toast(msg, type="success"){
  const box = document.getElementById("toasts");
  const color = type==="error" ? "bg-red-600" : type==="warn" ? "bg-yellow-600" : "bg-emerald-600";
  const el = document.createElement("div");
  el.className = `alert ${color} text-white`;
  el.innerHTML = `<span>${msg}</span>`;
  box.appendChild(el);
  setTimeout(()=>el.remove(), 3500);
}
function fmtHMS(ms){
  if (ms==null) return "--";
  const s = Math.max(0, Math.round(ms/1000));
  const d = Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60);
  if (d>0) return `${d}d ${h}h ${m}m`; if (h>0) return `${h}h ${m}m`; return `${m}m`;
}
function median(arr){ if(!arr.length) return null; const a=[...arr].sort((x,y)=>x-y); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function percent(num, den){ return (!den?0:((num/den)*100)).toFixed(1)+"%"; }
function percentNumber(num, den){ return (!den?0:((num/den)*100)); }
function dateLine(ts){
  if (!ts) return `<div class="text-gray-300">N/A</div>`;
  const d = ts.toLocaleDateString(); const t = ts.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  return `<div class="text-gray-200">${d}</div><div class="text-xs text-gray-400">${t}</div>`;
}
async function fetchUsersInfo(uids){
  if (!uids || !uids.length) return [];
  const chunks=[]; for(let i=0;i<uids.length;i+=30) chunks.push(uids.slice(i,i+30));
  let users=[]; for (const ch of chunks){
    const snap = await db.collection("users").where(firebase.firestore.FieldPath.documentId(), "in", ch).get();
    users = users.concat(snap.docs.map(d=>({id:d.id, ...d.data()})));
  }
  return users;
}
function monthKey(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); return `${y}-${m}`; }
function toSheet(rows){
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = rows[0].map((_,i)=>({wch: Math.min(80, Math.max(...rows.map(r=>String(r[i]??"").length), 10))}));
  return ws;
}

/* ---------------- Home Button ---------------- */
document.getElementById("home-btn")?.addEventListener("click", ()=> window.location.href="Dashboard.html");

/* ---------------- Boot: جدول أولاً ثم KPIs ---------------- */
firebase.auth().onAuthStateChanged(async (user)=>{
  if (!user) return;
  CURRENT_USER = user;

  const uDoc = await db.collection("users").doc(user.uid).get();
  const displayName = uDoc.exists ? (uDoc.data().name || user.email) : user.email;
  document.getElementById("user-greeting").textContent = `Hi, ${displayName}`;

  const spacesSnapshot = await db.collection("spaces").where("joinedParticipants","array-contains", user.uid).get();
  JOINED_SPACE_IDS = []; SPACE_NAMES = {};
  spacesSnapshot.forEach(s=>{ JOINED_SPACE_IDS.push(s.id); SPACE_NAMES[s.id]=s.data().name || "Unnamed Space"; });

  // 1) حمّل الجدول أولًا
  await fetchMemos(true);             // load first page
  firstBatchResolve();                // signal ready

  // 2) بعدها KPIs وتقارير (بتأخير بسيط لراحة التحميل)
  setTimeout(async ()=>{
    await computePersonalKPIs(user.uid, JOINED_SPACE_IDS);
    document.getElementById("kpis-top").classList.remove("hidden");
    document.getElementById("kpis-perf").classList.remove("hidden");

    await loadAckTrendChart(JOINED_SPACE_IDS);
    await computeRankings(JOINED_SPACE_IDS);
    await loadLatestAcknowledgments();

    const adminSpacesSnap = await db.collection("spaces").where("createdBy","==",user.uid).get();
    if (!adminSpacesSnap.empty){
      document.getElementById("check-overall-btn").style.display="inline-block";
      document.getElementById("admin-kpis").classList.remove("hidden");
      document.getElementById("backup-excel").style.display="inline-block";
      await computeAdminKPIs(adminSpacesSnap);
      setupBackupButton(adminSpacesSnap);
    }
  }, 50);
});

/* ---------------- KPIs (بدون Streak وبدون Response Curve) ---------------- */
async function computePersonalKPIs(uid, spaceIds){
  const memosSnap = await db.collection("memos").get();
  const myMemos = memosSnap.docs.map(d=>({id:d.id, ...d.data()})).filter(m=>spaceIds.includes(m.spaceId));

  const total = myMemos.length;
  let acked=0, pending=0;
  const deltas=[]; let lastAckTs=null;

  myMemos.forEach(m=>{
    const details=m.acknowledgedDetails||[];
    const mine=details.find(x=>x.uid===uid);
    if (mine){
      acked++;
      const post=m.timestamp?.toDate?.(); const ack=mine.timestamp?.toDate?.();
      if (post && ack) deltas.push(ack-post);
      if (ack && (!lastAckTs || ack>lastAckTs)) lastAckTs=ack;
    } else pending++;
  });

  document.getElementById("kpi-total-memos").textContent = String(total);
  document.getElementById("kpi-my-pending").textContent = String(pending);
  document.getElementById("kpi-my-compliance").textContent = percent(acked,total);
  document.getElementById("kpi-last-ack").textContent = lastAckTs ? lastAckTs.toLocaleString() : "—";

  if (deltas.length){
    const avg = Math.round(deltas.reduce((a,b)=>a+b,0)/deltas.length);
    const med = median(deltas);
    document.getElementById("kpi-avg-rt").textContent = fmtHMS(avg);
    document.getElementById("kpi-med-rt").textContent = fmtHMS(med);

    const within24 = deltas.filter(ms=>ms<=24*3600*1000).length;
    const within48 = deltas.filter(ms=>ms<=48*3600*1000).length;
    const p24 = percentNumber(within24, deltas.length);
    const p48 = percentNumber(within48, deltas.length);
    document.getElementById("kpi-ontime-24").textContent = `${p24.toFixed(1)}%`;
    document.getElementById("kpi-ontime-48").textContent = `${p48.toFixed(1)}%`;
    updateMiniPie("pie-24", p24, (chart)=>PIE24=chart, PIE24);
    updateMiniPie("pie-48", p48, (chart)=>PIE48=chart, PIE48);
  }else{
    document.getElementById("kpi-avg-rt").textContent="--";
    document.getElementById("kpi-med-rt").textContent="--";
    document.getElementById("kpi-ontime-24").textContent="--%";
    document.getElementById("kpi-ontime-48").textContent="--%";
    updateMiniPie("pie-24", 0, (c)=>PIE24=c, PIE24);
    updateMiniPie("pie-48", 0, (c)=>PIE48=c, PIE48);
  }
}
function updateMiniPie(canvasId, pct, setRef, existing){
  const ctx = document.getElementById(canvasId).getContext("2d");
  const val = Math.max(0, Math.min(100, Math.round(pct)));
  if (existing) existing.destroy();
  setRef(new Chart(ctx,{
    type:"doughnut",
    data:{ labels:["On-time","Late"], datasets:[{ data:[val,100-val], cutout:"72%" }]},
    options:{ responsive:true, plugins:{ legend:{ display:false } } }
  }));
}

/* ---------------- Admin KPIs (exclude [Admin]) ---------------- */
async function computeAdminKPIs(adminSpacesSnap){
  let allMemos=[], allParticipants=new Set();

  for (const spaceDoc of adminSpacesSnap.docs){
    const s=spaceDoc.data();
    (s.joinedParticipants||[]).forEach(uid=>allParticipants.add(uid));
    const ms=await db.collection("memos").where("spaceId","==",spaceDoc.id).get();
    ms.forEach(d=>allMemos.push({id:d.id, ...d.data()}));
  }
  let users = await fetchUsersInfo([...allParticipants]);
  users = users.filter(u=>!isAdminName(u));
  const filteredUIDs = new Set(users.map(u=>u.id));

  const totalMemos = allMemos.length;
  const ackCount = Object.fromEntries([...filteredUIDs].map(uid=>[uid,0]));

  let unacked7d=0; const now=new Date(); const seven=new Date(now.getTime()-7*24*3600*1000);

  allMemos.forEach(m=>{
    const details=m.acknowledgedDetails||[]; const ackedUIDs = new Set(details.map(x=>x.uid));
    filteredUIDs.forEach(uid=>{ if (ackedUIDs.has(uid)) ackCount[uid]++; });
    const posted=m.timestamp?.toDate?.(); if (posted && posted>=seven){
      if ([...filteredUIDs].some(uid=>!ackedUIDs.has(uid))) unacked7d++;
    }
  });

  const totalAcks = Object.values(ackCount).reduce((a,b)=>a+b,0);
  const teamAvg = totalMemos ? (totalAcks/(totalMemos*filteredUIDs.size)) : 0;
  document.getElementById("kpi-team-avg").textContent=(teamAvg*100).toFixed(1)+"%";

  let lowestUID=null, lowestRate=Infinity;
  [...filteredUIDs].forEach(uid=>{
    const r = totalMemos ? (ackCount[uid]/totalMemos) : 0;
    if (r<lowestRate){ lowestRate=r; lowestUID=uid; }
  });
  const id2name = Object.fromEntries(users.map(u=>[u.id, u.name||u.email||u.id]));
  document.getElementById("kpi-lowest").textContent = lowestUID ? `${id2name[lowestUID]} — ${(lowestRate*100).toFixed(1)}%` : "—";
  document.getElementById("kpi-unacked-7d").textContent = String(unacked7d);
}

/* ---------------- Trend (7 أيام) ---------------- */
async function loadAckTrendChart(spaceIds){
  const memosSnap = await db.collection("memos").get();
  const times=[];
  memosSnap.forEach(d=>{
    const m=d.data(); if (!spaceIds.includes(m.spaceId)) return;
    (m.acknowledgedDetails||[]).forEach(a=>{
      const t=a.timestamp?.toDate?.(); if (t) times.push(t);
    });
  });

  const labels=[], counts=[]; const now=new Date();
  for(let i=6;i>=0;i--){ const day=new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
    labels.push(day.toLocaleDateString()); counts.push(0); }
  times.forEach(t=>{
    const key=new Date(t.getFullYear(), t.getMonth(), t.getDate()).toLocaleDateString();
    const idx=labels.indexOf(key); if (idx>=0) counts[idx]+=1;
  });

  const ctx=document.getElementById("ack-trend-chart").getContext("2d");
  if (ACK_TREND_CHART) ACK_TREND_CHART.destroy();
  ACK_TREND_CHART = new Chart(ctx,{
    type:"bar",
    data:{ labels, datasets:[{ label:"Acknowledgments", data:counts }]},
    options:{
      responsive:true,
      plugins:{ legend:{ labels:{ color:"#fff"}}},
      scales:{ x:{ ticks:{ color:"#ddd"}, grid:{ color:"rgba(255,255,255,.1)"}},
               y:{ ticks:{ color:"#ddd"}, grid:{ color:"rgba(255,255,255,.1)"}} }
    }
  });
}

/* ---------------- Rankings (صور مع fallback حقيقي) ---------------- */
async function computeRankings(joinedSpaceIds){
  const spacesSnap = await db.collection("spaces").get();
  const participantSet = new Set();
  spacesSnap.forEach(s=>{
    if (joinedSpaceIds.includes(s.id)) (s.data().joinedParticipants||[]).forEach(uid=>participantSet.add(uid));
  });
  let users = await fetchUsersInfo([...participantSet]);
  users = users.filter(u=>!isAdminName(u));

  const uid2name = Object.fromEntries(users.map(u=>[u.id, u.name||u.email||u.id]));
  const uid2avatar = Object.fromEntries(users.map(u=>[u.id, (u.profilePic && u.profilePic.trim()) ? u.profilePic : DEFAULT_AVATAR]));

  const memosSnap = await db.collection("memos").get();
  const memos = memosSnap.docs.map(d=>({id:d.id, ...d.data()})).filter(m=>joinedSpaceIds.includes(m.spaceId));
  const totalMemos = memos.length;

  const metrics={}; users.forEach(u=>metrics[u.id]={acks:0, rt:[]});
  memos.forEach(m=>{
    const post=m.timestamp?.toDate?.(); const acks=m.acknowledgedDetails||[]; const ackSet=new Set(acks.map(a=>a.uid));
    users.forEach(u=>{
      if (ackSet.has(u.id)){
        metrics[u.id].acks++;
        const det=acks.find(a=>a.uid===u.id); const at=det?.timestamp?.toDate?.();
        if (post && at) metrics[u.id].rt.push(at-post);
      }
    });
  });

  const rows=users.map(u=>{
    const a=metrics[u.id].acks; const rt=metrics[u.id].rt;
    const avgMs=rt.length?Math.round(rt.reduce((x,y)=>x+y,0)/rt.length):null;
    const compPct=totalMemos?Math.round((a/totalMemos)*1000)/10:0;
    return { uid:u.id, name:uid2name[u.id], avatar:uid2avatar[u.id], acks:a, avgMs, comp:compPct };
  });

  const fastest = rows.filter(r=>r.avgMs!==null && r.acks>=3).sort((a,b)=>a.avgMs-b.avgMs).slice(0,5);
  const elite   = rows.filter(r=>r.comp>=95 && (r.avgMs!==null ? r.avgMs <= 24*3600*1000 : true))
                      .sort((a,b)=>b.comp-a.comp).slice(0,5);
  const lazy    = rows.filter(r=>r.comp<50 || (r.avgMs!==null && r.avgMs>72*3600*1000))
                      .sort((a,b)=>((100-b.comp)+(b.avgMs?(b.avgMs/(24*3600*1000))*10:0))-((100-a.comp)+(a.avgMs?(a.avgMs/(24*3600*1000))*10:0)))
                      .slice(0,8);

  const renderList=(id,arr)=>{
    const ul=document.getElementById(id); ul.innerHTML="";
    arr.forEach(item=>{
      ul.insertAdjacentHTML("beforeend", `
        <li class="flex items-center gap-3 p-2 rounded glass">
          <img src="${item.avatar}" referrerpolicy="no-referrer"
               onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'"
               class="w-8 h-8 rounded-full object-cover" />
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">${item.name}</div>
            <div class="text-xs text-gray-300">
              Compliance: ${item.comp.toFixed(1)}% • Acks: ${item.acks}${item.avgMs!==null?` • Avg: ${fmtHMS(item.avgMs)}`:""}
            </div>
          </div>
        </li>
      `);
    });
  };
  renderList("rank-fastest", fastest);
  renderList("rank-elite", elite);
  renderList("rank-lazy", lazy);
}

/* ---------------- جدول التعاميم (أولًا) + Endless Scroll ---------------- */
async function fetchMemos(isFirst=false){
  if (isFetching) return;
  isFetching=true; loader.classList.remove("hidden");

  try{
    let q = db.collection("memos").orderBy("timestamp","desc").limit(itemsPerPage);
    if (lastVisible) q = q.startAfter(lastVisible);
    const qs = await q.get();

    if (isFirst) memoTable.innerHTML="";

    if (!qs.empty){
      qs.forEach(doc=>{
        const m=doc.data();
        if (!JOINED_SPACE_IDS.includes(m.spaceId)) return;

        const memoId = doc.id;
        const title = m.title || "Untitled";
        const ackNum = (m.acknowledgedDetails||[]).length;
        const ts = m.timestamp?.toDate?.(); const tsEpoch = ts ? ts.getTime() : 0;
        const spaceName = SPACE_NAMES[m.spaceId] || "Unknown Space";
        const acknowledged = (m.acknowledgedDetails||[]).some(x=>x.uid===CURRENT_USER?.uid);

        let statusBtn;
        if (acknowledged){
          statusBtn = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded bg-green-600">✅</span>`;
        } else {
          let cls="bg-gray-600", icon="❔";
          if (ts){
            const age = Date.now() - ts.getTime();
            if (age > 48*3600*1000){ cls="bg-red-600"; icon="⏰"; }
            else if (age > 24*3600*1000){ cls="bg-yellow-600"; icon="⚠️"; }
          }
          statusBtn = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded ${cls}">${icon}</span>`;
        }

        const row = `
          <tr class="border-b border-gray-700 hover:bg-white/5 transition" data-ts="${tsEpoch}">
            <td class="p-3">
              <button class="view-btn text-blue-400 hover:underline" data-id="${memoId}">👁️ View</button>
            </td>
            <td class="p-3 status-cell">${statusBtn}</td>
            <td class="p-3"><div class="title-text">${title} <span class="text-gray-400 ack-count">(${ackNum})</span></div></td>
            <td class="p-3"><div class="space-chip" title="${spaceName}">${spaceName}</div></td>
            <td class="p-3">${dateLine(ts)}</td>
          </tr>
        `;
        memoTable.insertAdjacentHTML("beforeend", row);
      });

      lastVisible = qs.docs[qs.docs.length-1];
    }
  }finally{
    loader.classList.add("hidden");
    isFetching=false;
  }
}
window.addEventListener("scroll", ()=>{
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) fetchMemos(false);
});

/* ---------------- Search & Filters ---------------- */
const searchInput = document.getElementById("search-box");
const clearSearchBtn = document.getElementById("clear-search");
searchInput?.addEventListener("input", ()=>{
  const q=searchInput.value.toLowerCase();
  document.querySelectorAll("#memo-table tr").forEach(tr=>{
    const title = tr.cells[2]?.textContent?.toLowerCase() || "";
    tr.style.display = title.includes(q) ? "" : "none";
  });
  clearSearchBtn.style.visibility = q ? "visible" : "hidden";
});
clearSearchBtn?.addEventListener("click", ()=>{
  searchInput.value=""; clearSearchBtn.style.visibility="hidden";
  document.querySelectorAll("#memo-table tr").forEach(tr=>tr.style.display="");
  searchInput.focus();
});
document.getElementById("filter-timestamp")?.addEventListener("click", ()=>{
  const rows = Array.from(document.querySelectorAll("#memo-table tr"));
  rows.sort((a,b)=> (Number(b.dataset.ts||0) - Number(a.dataset.ts||0)));
  const body = document.getElementById("memo-table");
  body.innerHTML=""; rows.forEach(r=>body.appendChild(r));
});
document.getElementById("filter-status")?.addEventListener("click", ()=>{
  document.querySelectorAll("#memo-table tr").forEach(tr=>{
    const statusCell = tr.cells[1];
    const txt = statusCell?.textContent || "";
    tr.style.display = (txt.includes("❔") || txt.includes("⚠️") || txt.includes("⏰")) ? "" : "none";
  });
});
document.getElementById("reset-filters")?.addEventListener("click", ()=>{
  document.querySelectorAll("#memo-table tr").forEach(tr=>tr.style.display="");
});

/* ---------------- Export CSV (visible rows) ---------------- */
document.getElementById("export-csv")?.addEventListener("click", ()=>{
  const rows = Array.from(document.querySelectorAll("#memo-table tr")).filter(r=>r.style.display!=="none");
  const data = [["Title","Space","Date","Time","Status"]];
  rows.forEach(r=>{
    const title = r.cells[2]?.innerText?.trim() || "";
    const space = r.cells[3]?.innerText?.trim() || "";
    const date  = r.cells[4]?.querySelector("div:nth-child(1)")?.innerText?.trim() || "";
    const time  = r.cells[4]?.querySelector("div:nth-child(2)")?.innerText?.trim() || "";
    const status= r.cells[1]?.innerText?.trim() || "";
    data.push([title,space,date,time,status]);
  });
  const csv = data.map(row=>row.map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"}); const url = URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="memos_export.csv"; a.click(); URL.revokeObjectURL(url);
  toast("CSV exported");
});

/* ---------------- Backup Excel (Admin) — يشمل Content ---------------- */
function setupBackupButton(adminSpacesSnap){
  document.getElementById("backup-excel")?.addEventListener("click", async ()=>{
    try{
      const spaceMap={};
      for (const spaceDoc of adminSpacesSnap.docs){
        const s=spaceDoc.data();
        let users=await fetchUsersInfo(s.joinedParticipants||[]);
        users=users.filter(u=>!isAdminName(u));
        spaceMap[spaceDoc.id]={ name:s.name||"Unnamed Space", participants:users.map(u=>u.id) };
      }
      const wb=XLSX.utils.book_new(); const grouped={};
      for (const sid of Object.keys(spaceMap)){
        const memosSnap=await db.collection("memos").where("spaceId","==",sid).get();
        memosSnap.forEach(doc=>{
          const m=doc.data(); const ts=m.timestamp?.toDate?.()||new Date(); const key=monthKey(ts);
          if (!grouped[key]) grouped[key]=[["Title","Content","Space","Date","Time","Acknowledged","Pending"]];
          const acks=(m.acknowledgedDetails||[]).filter(x=>spaceMap[sid].participants.includes(x.uid)).length;
          const total=spaceMap[sid].participants.length; const pending=Math.max(total-acks,0);
          const contentText=(m.content||"").toString().replace(/\s+/g," ").trim();
          grouped[key].push([
            m.title||"Untitled", contentText, spaceMap[sid].name,
            ts.toLocaleDateString(), ts.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
            acks, pending
          ]);
        });
      }
      const keys=Object.keys(grouped).sort(); if(!keys.length){ toast("No memos to backup","warn"); return; }
      keys.forEach(k=>XLSX.utils.book_append_sheet(wb, toSheet(grouped[k]), k));
      const today=new Date().toISOString().slice(0,10); XLSX.writeFile(wb, `memos_backup_${today}.xlsx`);
      toast("Backup Excel generated with content ✅");
    }catch(e){ console.error(e); toast("Backup failed","error"); }
  });
}

/* ---------------- Notifications ---------------- */
async function loadLatestAcknowledgments(){
  const snap=await db.collection("memos").get(); const list=[];
  snap.forEach(d=>{
    const m=d.data(); const title=m.title||"Untitled Memo";
    (m.acknowledgedDetails||[]).forEach(e=>{
      const ts=e.timestamp?.toDate?.(); if (ts && e.uid) list.push({memoTitle:title, uid:e.uid, timestamp:ts});
    });
  });
  list.sort((a,b)=>b.timestamp-a.timestamp); const top3=list.slice(0,3);
  let users=await fetchUsersInfo([...new Set(top3.map(x=>x.uid))]); users=users.filter(u=>!isAdminName(u));
  const id2name=Object.fromEntries(users.map(u=>[u.id, u.name||u.email||"Unknown"]));
  const ul=document.getElementById("notification-list"); ul.innerHTML="";
  top3.forEach(x=>{
    const name=id2name[x.uid]||"Unknown";
    ul.insertAdjacentHTML("beforeend", `<li class="text-sm">
      <span class="text-yellow-400 font-semibold">${name}</span> acknowledged
      <span class="text-green-400 font-semibold">"${x.memoTitle}"</span>
      <span class="text-gray-400 text-xs">at ${x.timestamp.toLocaleString()}</span>
    </li>`);
  });
  document.getElementById("show-all-notifications")?.addEventListener("click", async ()=>{
    let allUsers=await fetchUsersInfo([...new Set(list.map(x=>x.uid))]); allUsers=allUsers.filter(u=>!isAdminName(u));
    const map=Object.fromEntries(allUsers.map(u=>[u.id, u.name||u.email||"Unknown"]));
    ul.innerHTML=""; list.forEach(x=>{
      const name=map[x.uid]||"Unknown";
      ul.insertAdjacentHTML("beforeend", `<li class="text-sm">
        <span class="text-yellow-400 font-semibold">${name}</span> acknowledged
        <span class="text-green-400 font-semibold">"${x.memoTitle}"</span>
        <span class="text-gray-400 text-xs">at ${x.timestamp.toLocaleString()}</span>
      </li>`);
    });
  });
}

/* ---------------- View Modal + Admin Report (exclude [Admin]) ---------------- */
document.addEventListener("click", async (ev)=>{
  if (!ev.target.classList.contains("view-btn")) return;
  const memoId = ev.target.dataset.id;

  try{
    const mDoc=await db.collection("memos").doc(memoId).get();
    if (!mDoc.exists){ alert("Memo not found!"); return; }
    const memo=mDoc.data();

    document.getElementById("modal-title").innerText = memo.title || "Untitled";
    document.getElementById("modal-content").innerText = memo.content || "";
    document.getElementById("modal-timestamp").innerText =
      `Posted on: ${memo.timestamp?.toDate?.()?.toLocaleString() || "N/A"}`;

    const attDiv=document.getElementById("modal-attachments"); attDiv.innerHTML="";
    (memo.attachments||[]).forEach(url=>{
      const a=document.createElement("a"); a.href=url; a.target="_blank";
      a.className="text-blue-300 underline block mt-2"; a.textContent="📎 View Attachment";
      attDiv.appendChild(a);
    });

    const spaceDoc=await db.collection("spaces").doc(memo.spaceId).get();
    const joined=spaceDoc.exists ? spaceDoc.data().joinedParticipants||[] : [];
    const currentUser=firebase.auth().currentUser;
    const isAdminOwner=currentUser && spaceDoc.exists && spaceDoc.data().createdBy===currentUser.uid;

    const reportBtn=document.getElementById("report-modal"); if (reportBtn) reportBtn.style.display = isAdminOwner ? "block" : "none";

    const ackUIDs=(memo.acknowledgedDetails||[]).map(x=>x.uid);
    let ackUsers=await fetchUsersInfo(ackUIDs); ackUsers=ackUsers.filter(u=>!isAdminName(u));
    const pendingUIDsRaw=joined.filter(uid=>!ackUIDs.includes(uid));
    let pendingUsers=await fetchUsersInfo(pendingUIDsRaw); pendingUsers=pendingUsers.filter(u=>!isAdminName(u));

    const ackList=document.getElementById("acknowledgment-list");
    const pendList=document.getElementById("pending-list");
    ackList.innerHTML=""; pendList.innerHTML="";

    if (isAdminOwner){
      if (ackUsers.length){
        ackUsers.forEach(u=>{
          const det=(memo.acknowledgedDetails||[]).find(a=>a.uid===u.id);
          const at=det?.timestamp?.toDate?.()?.toLocaleString() || "N/A";
          ackList.insertAdjacentHTML("beforeend", `
            <div class="flex items-center gap-3 mb-1">
              <img src="${(u.profilePic&&u.profilePic.trim())?u.profilePic:DEFAULT_AVATAR}"
                   referrerpolicy="no-referrer"
                   onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'"
                   class="w-10 h-10 rounded-full object-cover" />
              <div><p class="font-semibold">${u.name||u.email||u.id}</p><p class="text-xs text-gray-400">${at}</p></div>
            </div>`);
        });
      } else ackList.innerHTML="<p class='text-gray-400'>No acknowledgments yet.</p>";

      if (pendingUsers.length){
        pendingUsers.forEach(u=>{
          pendList.insertAdjacentHTML("beforeend", `
            <div class="flex items-center gap-3 mb-1">
              <img src="${(u.profilePic&&u.profilePic.trim())?u.profilePic:DEFAULT_AVATAR}"
                   referrerpolicy="no-referrer"
                   onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'"
                   class="w-10 h-10 rounded-full object-cover" />
              <div><p class="font-semibold">${u.name||u.email||u.id}</p></div>
            </div>`);
        });
      } else pendList.innerHTML="<p class='text-gray-400'>All users have acknowledged.</p>";

      document.getElementById("broadcast-btn")?.addEventListener("click", ()=>{
        const names=pendingUsers.map(u=>u.name||u.email||u.id).join(", ");
        const msg=`Reminder: Please acknowledge the memo: "${memo.title}". Pending: ${names}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,"_blank");
      });
    }

    const ackBtn=document.getElementById("acknowledge-btn");
    ackBtn.dataset.memoId=mDoc.id;
    const myAck=(memo.acknowledgedDetails||[]).find(x=>x.uid===currentUser?.uid);
    if (myAck){
      ackBtn.style.display="none";
      document.getElementById("acknowledgment-info").classList.remove("hidden");
      document.getElementById("acknowledgment-timestamp").innerText = myAck.timestamp?.toDate?.()?.toLocaleString() || "";
    } else {
      ackBtn.style.display="block";
      document.getElementById("acknowledgment-info").classList.add("hidden");
    }

    document.getElementById("memo-modal").classList.remove("hidden");
    reportBtn?.addEventListener("click", ()=> document.getElementById("modal-acknowledgments-pending").classList.toggle("hidden"));
  }catch(e){ console.error(e); alert("Failed to load memo details."); }
});
document.getElementById("close-modal")?.addEventListener("click", ()=> document.getElementById("memo-modal").classList.add("hidden"));

/* ---------------- Acknowledge + تحديث الصف فورًا + تحديث KPIs ---------------- */
document.getElementById("acknowledge-btn")?.addEventListener("click", async ()=>{
  const btn=document.getElementById("acknowledge-btn");
  const memoId=btn.dataset.memoId;
  const user=firebase.auth().currentUser;
  if (!user){ alert("Please log in to acknowledge this memo."); return; }

  btn.disabled=true; btn.innerHTML=`<span class="loading loading-spinner loading-xs mr-2"></span> Sending...`;
  btn.classList.add("opacity-50","cursor-not-allowed");

  const userRef=db.collection("users").doc(user.uid);
  const memoRef=db.collection("memos").doc(memoId);
  const timestamp=firebase.firestore.Timestamp.now();
  const newAck={ uid:user.uid, timestamp };

  try{
    const u=await userRef.get(); if (!u.exists) await userRef.set({ email:user.email, points:0, acknowledgedMemos:[] });

    const batch=db.batch();
    batch.update(memoRef,{ acknowledgedDetails: firebase.firestore.FieldValue.arrayUnion(newAck) });
    batch.update(userRef,{ acknowledgedMemos: firebase.firestore.FieldValue.arrayUnion(memoId) });
    await batch.commit();

    document.getElementById("acknowledgment-info").classList.remove("hidden");
    document.getElementById("acknowledgment-timestamp").innerText=new Date().toLocaleString();
    btn.style.display="none";
    toast("Memo acknowledged ✅");

    // تحديث صف الجدول
    const rowBtn=document.querySelector(`#memo-table .view-btn[data-id="${memoId}"]`);
    if (rowBtn){
      const tr=rowBtn.closest("tr");
      tr.querySelector(".status-cell").innerHTML=`<span class="inline-flex items-center gap-1 px-3 py-1 rounded bg-green-600">✅</span>`;
      const countSpan=tr.querySelector(".ack-count");
      if (countSpan){
        const m=countSpan.textContent.match(/\((\d+)\)/); if (m){ countSpan.textContent=`(${parseInt(m[1],10)+1})`; }
      }
    }

    // حدّث KPIs بعد الإقرار
    await computePersonalKPIs(user.uid, JOINED_SPACE_IDS);
    await computeRankings(JOINED_SPACE_IDS);
  }catch(e){
    console.error(e);
    alert("Failed to acknowledge memo. "+e.message);
    btn.disabled=false; btn.innerHTML="✅ Acknowledge"; btn.classList.remove("opacity-50","cursor-not-allowed");
  }
});

/* ---------------- Overall Compliance Modal (مع WhatsApp لكل موظف) ---------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  const checkBtn=document.getElementById("check-overall-btn");
  const modal=document.getElementById("overall-compliance-modal");
  const contentDiv=document.getElementById("overall-compliance-content");

  firebase.auth().onAuthStateChanged(async (user)=>{
    if (!user || !checkBtn) return;
    const spacesSnapshot=await db.collection("spaces").where("createdBy","==",user.uid).get();
    if (spacesSnapshot.empty) return;

    checkBtn.addEventListener("click", async ()=>{
      contentDiv.innerHTML="<p class='text-gray-300'>Loading data...</p>";
      modal.classList.remove("hidden");

      let html=""; const userUnackAll={};

      for (const spaceDoc of spacesSnapshot.docs){
        const space=spaceDoc.data(); const spaceId=spaceDoc.id;
        const spaceName=space.name||"Unnamed Space";
        const memosSnapshot=await db.collection("memos").where("spaceId","==",spaceId).get();
        const totalMemos=memosSnapshot.size;

        let users=await fetchUsersInfo(space.joinedParticipants||[]);
        users=users.filter(u=>!isAdminName(u));
        const participants=users.map(u=>u.id);

        const ackCount=Object.fromEntries(participants.map(uid=>[uid,0]));
        const userUnackMemos=Object.fromEntries(participants.map(uid=>[uid,[]]));

        memosSnapshot.forEach(md=>{
          const m=md.data(); const acks=new Set((m.acknowledgedDetails||[]).map(x=>x.uid));
          participants.forEach(uid=>{ if (acks.has(uid)) ackCount[uid]++; else userUnackMemos[uid].push(m.title||"Untitled Memo"); });
        });

        Object.keys(userUnackMemos).forEach(uid=>{
          if (!userUnackAll[uid]) userUnackAll[uid]=[];
          userUnackAll[uid].push(...userUnackMemos[uid]);
        });

        let table=`<div class="mb-6">
          <h3 class="text-lg font-semibold text-indigo-300 mb-2">📁 ${spaceName}</h3>
          <table class="w-full text-left border border-gray-600 text-white">
            <thead class="bg-gray-700">
              <tr>
                <th class="p-2">User</th><th class="p-2">Acknowledged</th><th class="p-2">Total Memos</th>
                <th class="p-2">Compliance %</th><th class="p-2 w-[60px] text-center">WA</th>
              </tr>
            </thead><tbody>`;
        users.forEach(u=>{
          const uid=u.id, ack=ackCount[uid]||0; const pctNum=totalMemos?(ack/totalMemos)*100:0; const pct=pctNum.toFixed(1);
          const color=pctNum>=80?"text-green-400":pctNum>=50?"text-yellow-400":"text-red-400";
          const tooltip=(userUnackMemos[uid]||[]).length?(userUnackMemos[uid].map(t=>`• ${t}`).join('\n')):"✅ Acknowledged All";
          table += `<tr class="border-b border-gray-700">
            <td class="p-2">
              <span title="${tooltip.replace(/\"/g,'&quot;')}" class="underline cursor-pointer hover:text-blue-300"
                onclick="showUserComplianceChart('${uid}', '${(u.name||u.email||u.id).replace(/'/g,"\\'")}', ${ack}, ${totalMemos})">
                ${u.name||u.email||u.id}
              </span>
            </td>
            <td class="p-2">${ack}</td><td class="p-2">${totalMemos}</td>
            <td class="p-2 font-bold ${color}">${pct}%</td>
            <td class="p-2 text-center">
              <button class="wa-reminder btn btn-ghost btn-xs text-green-400"
                      title="WhatsApp reminder"
                      data-uid="${uid}" data-name="${(u.name||u.email||u.id).replace(/"/g,'&quot;')}" data-pct="${pct}">
                <i class="fa-brands fa-whatsapp text-lg"></i>
              </button>
            </td></tr>`;
        });
        table += `</tbody></table></div>`;
        html += table;
      }
      window.userUnackMemos = userUnackAll;
      contentDiv.innerHTML = html || "<p class='text-red-400'>No data available.</p>";
    });
  });
});
document.addEventListener("click",(e)=>{
  if (!e.target.closest(".wa-reminder")) return;
  const btn=e.target.closest(".wa-reminder");
  const uid=btn.dataset.uid, name=btn.dataset.name||"Colleague", pct=btn.dataset.pct||"0.0";
  const titles=(window.userUnackMemos?.[uid]||[]);
  const bullets=titles.length?titles.map(t=>`- *${t}*`).join("\n"):"- *No pending memos*";
  const msg=`Attention Required for Memo Care:
We notice that Your Compliance Percentage is ${pct} %
Please improve your attendance by acknowledge the latest published memos to stay up-to-date:
${bullets}
Thanks for your understanding.`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,"_blank");
});

/* ---------------- Donut لعرض مستخدم داخل المودال ---------------- */
let chartInstance=null;
window.showUserComplianceChart = function(uid, name, acknowledged, totalMemos){
  const pending=Math.max(totalMemos-acknowledged,0);
  const comp=totalMemos?((acknowledged/totalMemos)*100).toFixed(1):"0.0";
  let wrap=document.getElementById("user-compliance-chart-wrapper");
  if (!wrap){
    const div=document.createElement("div");
    div.id="user-compliance-chart-wrapper"; div.className="mt-6 p-4 glass rounded-lg";
    div.innerHTML=`<h3 id="chart-title" class="text-lg font-bold text-blue-300 mb-2 text-center"></h3>
      <canvas id="user-compliance-chart" class="mx-auto max-w-sm mb-4"></canvas>
      <div id="pending-memo-list" class="text-white mt-4"></div>`;
    document.getElementById("overall-compliance-content").appendChild(div); wrap=div;
  }
  document.getElementById("chart-title").innerHTML =
    `${name} – Compliance: ${comp}% <div class="text-sm text-yellow-300 mt-1">Pending memos: ${pending}</div>`;
  const ctx=document.getElementById("user-compliance-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance=new Chart(ctx,{ type:"doughnut",
    data:{ labels:["✅ Acknowledged","❌ Not Yet"], datasets:[{ data:[acknowledged,pending] }] },
    options:{ responsive:true, plugins:{ legend:{ position:"bottom", labels:{ color:"#fff"} } } }
  });
  const listDiv=document.getElementById("pending-memo-list");
  const pendTitles=window.userUnackMemos?.[uid]||[];
  listDiv.innerHTML = pendTitles.length
    ? `<h4 class="font-semibold text-yellow-400 mb-2">Pending Memos (${pendTitles.length}):</h4><ul class="list-disc ml-5">${pendTitles.map(t=>`<li>${t}</li>`).join("")}</ul>`
    : `<p class="text-green-400 text-center font-semibold">✅ All memos acknowledged</p>`;
};

/* ---------------- Close / Logout ---------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("logout-btn")?.addEventListener("click", ()=>{
    firebase.auth().signOut().then(()=>{
      alert("Logged out successfully!"); window.location.replace("login.html");
    }).catch(e=>alert("Error logging out: "+e.message));
  });
});

/* ---------------- Notifications CSV etc جاهزة ---------------- */
