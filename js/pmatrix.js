/************ Firebase ************/
const firebaseConfig = {
  apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
  authDomain: "ctwo-eee79.firebaseapp.com",
  projectId: "ctwo-eee79",
  storageBucket: "ctwo-eee79.appspot.com",
  messagingSenderId: "788657051205",
  appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
  measurementId: "G-4VTCQR4ZVR",
};
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

/************ State ************/
let user = null;
let udoc = null;     // users/{uid}
let spaceId = null;
let isAdmin = false;

const colTasks = () => db.collection("pm_tasks");
const colProblems = () => db.collection("pm_problems");

/************ DOM refs ************/
const loadingEl = document.getElementById("loading");
const greetingEl = document.getElementById("user-greeting");

const btnTask = document.getElementById("btn-tab-task");
const btnAdmin = document.getElementById("btn-tab-admin");
const btnDash = document.getElementById("btn-tab-dash");
const btnLogout = document.getElementById("btn-logout");

const secTask = document.getElementById("tab-task");
const secAdmin = document.getElementById("tab-admin");
const secDash = document.getElementById("tab-dash");

const filters = document.getElementById("filters");
const nurseFilterWrap = document.getElementById("nurseFilterWrap");
const nurseFilterSel = document.getElementById("nurseFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const applyFilters = document.getElementById("applyFilters");
const clearFilters = document.getElementById("clearFilters");

const daysRange = document.getElementById("daysRange");
const daysRangeVal = document.getElementById("daysRangeVal");

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDesc = document.getElementById("taskDesc");
const taskImportance = document.getElementById("taskImportance");
const taskUrgency = document.getElementById("taskUrgency");
const taskMinutes = document.getElementById("taskMinutes");
const taskCategory = document.getElementById("taskCategory");
const taskOutcome = document.getElementById("taskOutcome");
const taskFiles = document.getElementById("taskFiles");
const taskFilesStatus = document.getElementById("taskFilesStatus");
const myPortfolio = document.getElementById("myPortfolio");
const exportMyCSV = document.getElementById("exportMyCSV");
const printMyReport = document.getElementById("printMyReport");

const reviewQueue = document.getElementById("reviewQueue");
const seedDemo = document.getElementById("seedDemo");
const exportAllCSV = document.getElementById("exportAllCSV");

const problemForm = document.getElementById("problemForm");
const probNurseMulti = document.getElementById("probNurseMulti");
const probSeverity = document.getElementById("probSeverity");
const probTaskId = document.getElementById("probTaskId");
const probDate = document.getElementById("probDate");
const probDesc = document.getElementById("probDesc");
const probAction = document.getElementById("probAction");
const probFiles = document.getElementById("probFiles");
const probFilesStatus = document.getElementById("probFilesStatus");
const problemsList = document.getElementById("problemsList");
const exportProblemsCSV = document.getElementById("exportProblemsCSV");

const dashCards = document.getElementById("dashCards");
const problemsByDate = document.getElementById("problemsByDate");
const allRecords = document.getElementById("allRecords");
const printDash = document.getElementById("printDash");

const reviewModal = document.getElementById("reviewModal");
const reviewBody = document.getElementById("reviewBody");
const btnApprove = document.getElementById("btnApprove");
const btnReject = document.getElementById("btnReject");
const btnRevise = document.getElementById("btnRevise");

/************ Utils ************/
const fmtDT = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts)).toLocaleString();
const csvEscape = (s) => {
  const v = String(s ?? "").replaceAll("\n"," ").replaceAll("\r"," ");
  return /[",\n]/.test(v) ? `"${v.replaceAll('"','""')}"` : v;
};
function downloadCSV(rows, name="export.csv") {
  if (!rows?.length) return alert("No data to export");
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach(r => lines.push(headers.map(h => csvEscape(r[h])).join(",")));
  const blob = new Blob(["\ufeff"+lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),300);
}
function escapeHtml(s=""){return s.replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function uid(prefix=""){ return prefix + Math.random().toString(36).slice(2,8) + '-' + Date.now().toString(36).slice(-6); }
function hideAll(){ secTask.classList.add("hidden"); secAdmin.classList.add("hidden"); secDash.classList.add("hidden"); }

/************ Auth boot ************/
auth.onAuthStateChanged(async (u)=>{
  if (!u) { loadingEl.textContent = "Sign in with your main app first."; return; }
  user = u;

  const uref = await db.collection("users").doc(u.uid).get();
  if (!uref.exists){ loadingEl.textContent = "No user profile found."; return; }
  udoc = uref.data();

  // find space by joinedParticipants
  const spaces = await db.collection("spaces").get();
  for (const s of spaces.docs) {
    const d = s.data();
    if (Array.isArray(d.joinedParticipants) && d.joinedParticipants.includes(u.uid)) {
      spaceId = s.id;
      isAdmin = (d.createdBy === u.uid) || udoc.admin === true;
      break;
    }
  }

  loadingEl.classList.add("hidden");
  greetingEl.textContent = `Hello, ${udoc.name || "User"}${udoc.staffId ? ` (${udoc.staffId})` : ""}`;

  // default days range
  daysRange.value = 90; daysRangeVal.textContent = "90";
  daysRange.oninput = () => { daysRangeVal.textContent = daysRange.value; renderDashboard(); };

  // nav handlers
  btnTask.onclick = ()=>{ hideAll(); secTask.classList.remove("hidden"); filters.classList.add("hidden"); renderMyPortfolio(); };
  btnAdmin.onclick = ()=>{ if(!isAdmin) return alert("Admins only"); hideAll(); secAdmin.classList.remove("hidden"); filters.classList.add("hidden"); renderReviewQueue(); renderProblemsList(); refreshNurseSelector(); };
  btnDash.onclick = ()=>{ hideAll(); secDash.classList.remove("hidden"); filters.classList.remove("hidden"); nurseFilterWrap.classList.toggle("hidden", !isAdmin); refreshNurseFilter(); renderDashboard(); };
  btnLogout.onclick = ()=>auth.signOut();

  // open default
  if (isAdmin) { btnAdmin.click(); } else { btnTask.click(); }
});

/************ Filters ************/
applyFilters?.addEventListener("click", ()=> renderDashboard());
clearFilters?.addEventListener("click", ()=>{ fromDate.value=""; toDate.value=""; if(isAdmin) nurseFilterSel.value=""; renderDashboard(); });

async function refreshNurseFilter(){
  if(!isAdmin || !spaceId) return;
  nurseFilterSel.innerHTML = `<option value="">All</option>`;
  const space = await db.collection("spaces").doc(spaceId).get();
  const ids = space.data()?.joinedParticipants || [];
  for (const uid of ids){
    const u = await db.collection("users").doc(uid).get();
    if (u.exists){
      const d=u.data();
      const opt=document.createElement("option");
      opt.value = d.staffId || uid;
      opt.textContent = `${d.name || "User"}${d.staffId ? ` (${d.staffId})` : ""}`;
      nurseFilterSel.appendChild(opt);
    }
  }
}

/************ My Tasks (with file uploads) ************/
taskForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if (!user || !spaceId) return alert("User and space required");
  const title = taskTitle.value.trim();
  const desc = taskDesc.value.trim();
  const minutes = parseInt(taskMinutes.value || "0");
  const outcome = taskOutcome.value.trim();

  if (desc.length < 30) return alert("Description must be ≥ 30 characters");
  if (!minutes || minutes < 1) return alert("Enter time in minutes");

  // create initial task (no evidence yet)
  const base = {
    spaceId,
    createdBy: user.uid,
    createdByName: udoc.name || "User",
    nurseId: udoc.staffId || "",
    nurseName: udoc.name ? (udoc.staffId ? `${udoc.name} (${udoc.staffId})` : udoc.name) : "User",
    title, desc,
    importance: taskImportance.value, urgency: taskUrgency.value,
    minutes, category: taskCategory.value, outcome,
    evidence: [], // will fill after uploads
    status: "Under Review",
    managerReview: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  const docRef = await colTasks().add(base);
  const taskId = docRef.id;

  // upload files (if any) to Storage under employeeFiles/{uid}/pmatrix_tasks/{taskId}/
  const files = taskFiles?.files || [];
  const urls = [];
  if (files.length){
    taskFilesStatus.textContent = `Uploading ${files.length} file(s)…`;
    for (let i=0;i<files.length;i++){
      const f = files[i];
      const path = `employeeFiles/${user.uid}/pmatrix_tasks/${taskId}/${Date.now()}_${f.name}`;
      const snap = await storage.ref(path).put(f);
      const url = await snap.ref.getDownloadURL();
      urls.push(url);
      taskFilesStatus.textContent = `Uploaded ${i+1}/${files.length}`;
    }
  }
  if (urls.length){
    await colTasks().doc(taskId).update({ evidence: urls });
  }
  taskFiles.value = ""; taskFilesStatus.textContent = "";
  taskForm.reset();
  alert("Submitted for review");
  renderMyPortfolio();
});

async function renderMyPortfolio(){
  myPortfolio.innerHTML = "";
  if (!user) return;
  const snap = await colTasks().where("createdBy","==", user.uid).orderBy("createdAt","desc").get();
  if (snap.empty){ myPortfolio.innerHTML = `<div class="text-gray-400">No tasks yet.</div>`; return; }
  snap.forEach(d => myPortfolio.appendChild(taskCard(d.id, d.data(), { canEdit:true })));
}

exportMyCSV?.addEventListener("click", async ()=>{
  if (!user) return;
  const snap = await colTasks().where("createdBy","==", user.uid).get();
  const rows=[];
  snap.forEach(d=>{
    const x=d.data();
    rows.push({
      id: d.id,
      createdAt: fmtDT(x.createdAt),
      title: x.title, desc: x.desc,
      importance: x.importance, urgency: x.urgency,
      minutes: x.minutes, category: x.category,
      outcome: x.outcome || "",
      evidence: (x.evidence||[]).length,
      status: x.status,
      reviewer: x.managerReview?.reviewerName || "",
      reviewedAt: fmtDT(x.managerReview?.reviewedAt || ""),
      nurse: x.nurseName || "",
    });
  });
  downloadCSV(rows, `my_tasks_${user.uid}.csv`);
});
printMyReport?.addEventListener("click", ()=> window.print());

/************ Admin: Review ************/
async function renderReviewQueue(){
  reviewQueue.innerHTML = "";
  if (!isAdmin || !spaceId){ reviewQueue.innerHTML = `<div class="text-gray-400">Admins only.</div>`; return; }
  const snap = await colTasks()
    .where("spaceId","==", spaceId)
    .where("status","in", ["Under Review","Needs Revision"])
    .orderBy("createdAt","desc")
    .get()
    .catch(err=>{
      // fallback if index missing: read without status filter
      console.warn("Index hint:", err?.message);
      return colTasks().where("spaceId","==", spaceId).orderBy("createdAt","desc").get();
    });

  if (snap.empty){ reviewQueue.innerHTML = `<div class="text-gray-400">No tasks to review.</div>`; return; }
  snap.forEach(d => reviewQueue.appendChild(taskCard(d.id, d.data(), { adminActions:true })));
}

function openReviewModal(taskId, data){
  reviewBody.innerHTML = `
    <div class="text-sm space-y-1">
      <div><span class="text-gray-400">Task ID:</span> <b>${taskId}</b></div>
      <div><span class="text-gray-400">By:</span> ${data.nurseName}</div>
      <div><span class="text-gray-400">Title:</span> ${escapeHtml(data.title)}</div>
      <div><span class="text-gray-400">Desc:</span> ${escapeHtml(data.desc)}</div>
      <div><span class="text-gray-400">Outcome:</span> ${escapeHtml(data.outcome || "—")}</div>
      <div><span class="text-gray-400">Evidence:</span> ${(data.evidence||[]).map((u,i)=>`<a class="link underline" target="_blank" href="${u}">file ${i+1}</a>`).join(" · ") || "—"}</div>
    </div>
    <textarea id="reviewComment" rows="3" class="textarea w-full glass mt-2" placeholder="Manager comment"></textarea>
  `;
  reviewModal.returnValue = "";
  reviewModal.showModal();

  btnApprove.onclick = (ev)=>{ ev.preventDefault(); reviewModal.close("approve"); };
  btnReject.onclick = (ev)=>{ ev.preventDefault(); reviewModal.close("reject"); };
  btnRevise.onclick = (ev)=>{ ev.preventDefault(); reviewModal.close("revise"); };

  reviewModal.addEventListener("close", async ()=>{
    const action = reviewModal.returnValue;
    if (!action || action==="cancel") return;

    if (action==="approve"){
      if (!(data.evidence||[]).length) return alert("Cannot approve without evidence files.");
      if (!data.outcome || data.desc.length < 30 || !data.minutes) return alert("Complete Outcome/Description/Minutes");
    }
    const comment = document.getElementById("reviewComment")?.value?.trim() || "";
    await colTasks().doc(taskId).update({
      status: action==="approve" ? "Approved" : action==="reject" ? "Rejected" : "Needs Revision",
      managerReview: {
        reviewerName: udoc?.name || "Manager",
        comment,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
        action,
      },
    });
    alert("Task updated");
    renderReviewQueue();
    renderDashboard();
  }, { once:true });
}

/************ Admin: Problems (multi-assign + attachments + date) ************/
async function refreshNurseSelector(){
  // populate multi-select with nurses in this space
  probNurseMulti.innerHTML = "";
  const space = await db.collection("spaces").doc(spaceId).get();
  const ids = space.data()?.joinedParticipants || [];
  for (const uid of ids){
    const u = await db.collection("users").doc(uid).get();
    if (u.exists){
      const d = u.data();
      const opt=document.createElement("option");
      opt.value = JSON.stringify({ uid, staffId: d.staffId || "", name: d.name || "User" });
      opt.textContent = `${d.name || "User"}${d.staffId ? ` (${d.staffId})` : ""}`;
      probNurseMulti.appendChild(opt);
    }
  }
}

problemForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if (!isAdmin || !spaceId) return alert("Admins only");

  const selected = Array.from(probNurseMulti.selectedOptions).map(o => JSON.parse(o.value));
  if (!selected.length) return alert("Select at least one nurse");
  if (!probDate.value) return alert("Pick a problem date");
  if (!probDesc.value.trim()) return alert("Enter description");

  // upload problem files once and reuse URLs for each created record (admin owns uploads)
  const files = probFiles?.files || [];
  const fileUrls = [];
  if (files.length){
    probFilesStatus.textContent = `Uploading ${files.length} file(s)…`;
  }
  for (let i=0;i<files.length;i++){
    const f = files[i];
    // store under admin uid to satisfy your storage rule (uploader owns files)
    const path = `employeeFiles/${user.uid}/pmatrix_problems/${Date.now()}_${uid("P")}_${f.name}`;
    const snap = await storage.ref(path).put(f);
    const url = await snap.ref.getDownloadURL();
    fileUrls.push(url);
    probFilesStatus.textContent = `Uploaded ${i+1}/${files.length}`;
  }

  const when = new Date(probDate.value);
  const created = firebase.firestore.FieldValue.serverTimestamp();

  // create one document per nurse (makes KPIs & filtering simple)
  const batch = db.batch();
  selected.forEach(n=>{
    const ref = colProblems().doc();
    batch.set(ref, {
      spaceId,
      nurseId: n.staffId || n.uid,
      nurseUid: n.uid,
      nurseName: `${n.name}${n.staffId ? ` (${n.staffId})` : ""}`,
      severity: probSeverity.value,
      linkedTaskId: probTaskId.value.trim() || null,
      description: probDesc.value.trim(),
      actionPlan: probAction.value.trim() || "",
      status: "Open",
      openedAt: created,
      problemDate: firebase.firestore.Timestamp.fromDate(when), // explicit problem date
      attachments: fileUrls, // uploaded files
      recordedBy: udoc?.name || "Manager",
      recordedByUid: user.uid,
    });
  });
  await batch.commit();

  probFiles.value=""; probFilesStatus.textContent="";
  problemForm.reset();
  alert(`Saved ${selected.length} problem record(s)`);
  renderProblemsList();
  renderDashboard();
});

async function renderProblemsList(){
  problemsList.innerHTML = "";
  if (!isAdmin || !spaceId){ problemsList.innerHTML = `<div class="text-gray-400">Admins only.</div>`; return; }
  const snap = await colProblems().where("spaceId","==", spaceId).orderBy("openedAt","desc").get();
  if (snap.empty){ problemsList.innerHTML = `<div class="text-gray-400">No problems yet.</div>`; return; }
  snap.forEach(d => problemsList.appendChild(problemCard(d.id, d.data())));
}

async function toggleProblem(id){
  const ref = colProblems().doc(id);
  const doc = await ref.get(); if (!doc.exists) return;
  const data = doc.data();
  const newStatus = data.status === "Open" ? "Closed" : "Open";
  await ref.update({
    status: newStatus,
    closedAt: newStatus === "Closed" ? firebase.firestore.FieldValue.serverTimestamp() : null,
  });
  renderProblemsList(); renderDashboard();
}
window.toggleProblem = toggleProblem;

/************ Dashboard (no Eisenhower) ************/
applyFilters?.addEventListener("click", ()=> renderDashboard());
clearFilters?.addEventListener("click", ()=>{ fromDate.value=""; toDate.value=""; if(isAdmin) nurseFilterSel.value=""; renderDashboard(); });

function inDateRange(ts){
  if (!fromDate.value && !toDate.value) return true;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (fromDate.value && d < new Date(fromDate.value)) return false;
  if (toDate.value) {
    const end = new Date(toDate.value);
    end.setDate(end.getDate()+1);
    if (d > end) return false;
  }
  return true;
}

async function fetchAll(){
  if (!spaceId) return { tasks:[], problems:[] };
  const [tSnap, pSnap] = await Promise.all([
    colTasks().where("spaceId","==", spaceId).orderBy("createdAt","desc").get(),
    colProblems().where("spaceId","==", spaceId).orderBy("problemDate","desc").get(),
  ]);
  return {
    tasks: tSnap.docs.map(d=>({ id:d.id, ...d.data() })),
    problems: pSnap.docs.map(d=>({ id:d.id, ...d.data() })),
  };
}

async function renderDashboard(){
  allRecords.innerHTML = ""; dashCards.innerHTML=""; problemsByDate.innerHTML="";

  const days = parseInt(daysRange.value || "90");
  const since = new Date(); since.setDate(since.getDate() - days);

  const { tasks, problems } = await fetchAll();
  if (!user) return;

  // role filter
  let t = tasks.filter(x=> (x.createdAt?.toDate ? x.createdAt.toDate() : new Date(x.createdAt)) >= since);
  let p = problems.filter(x=> (x.problemDate?.toDate ? x.problemDate.toDate() : new Date(x.problemDate)) >= since);

  if (!isAdmin){
    const me = udoc.staffId || "";
    t = t.filter(x => (x.nurseId || "") === me);
    p = p.filter(x => (x.nurseId || "") === me);
  } else if (nurseFilterSel.value){
    t = t.filter(x => (x.nurseId || "") === nurseFilterSel.value);
    p = p.filter(x => (x.nurseId || "") === nurseFilterSel.value);
  }

  // also honor from/to date pickers
  t = t.filter(x => inDateRange(x.createdAt));
  p = p.filter(x => inDateRange(x.problemDate));

  // KPIs
  const approved = t.filter(x => x.status==="Approved");
  const under = t.filter(x => x.status==="Under Review");
  const revise = t.filter(x => x.status==="Needs Revision");
  const rejected = t.filter(x => x.status==="Rejected");
  const totalMinutes = t.reduce((s,x)=>s+(x.minutes||0),0);
  const acceptance = t.length ? Math.round((approved.length / t.length)*100) : 0;
  const openProblems = p.filter(x=>x.status==="Open").length;

  const kpi = [
    {label:"Approved", val: approved.length},
    {label:"Under Review", val: under.length},
    {label:"Needs Revision", val: revise.length},
    {label:"Rejected", val: rejected.length},
    {label:"Problems (Open)", val: openProblems},
    {label:"Problems (All)", val: p.length},
    {label:"Total Minutes", val: totalMinutes},
    {label:"Acceptance %", val: acceptance + "%"},
  ];
  kpi.forEach(k=>{
    const card=document.createElement("div");
    card.className="glass rounded-2xl p-4";
    card.innerHTML=`<div class="text-gray-300 text-sm">${k.label}</div><div class="text-2xl font-bold">${k.val}</div>`;
    dashCards.appendChild(card);
  });

  // Problems by Date (counts)
  const map = {};
  p.forEach(x=>{
    const d = (x.problemDate?.toDate ? x.problemDate.toDate() : new Date(x.problemDate));
    const key = d.toISOString().slice(0,10);
    map[key] = (map[key] || 0) + 1;
  });
  const entries = Object.entries(map).sort((a,b)=> a[0].localeCompare(b[0]));
  if (!entries.length){
    problemsByDate.innerHTML = `<div class="text-gray-400">No problems in range.</div>`;
  } else {
    const ul = document.createElement("ul");
    ul.className="list-disc ml-5";
    entries.forEach(([date,count])=>{
      const li=document.createElement("li");
      li.textContent = `${date}: ${count}`;
      ul.appendChild(li);
    });
    problemsByDate.appendChild(ul);
  }

  // Records list = tasks + problems (simple)
  t.forEach(x => allRecords.appendChild(taskCard(x.id, x, { adminActions: isAdmin && ["Under Review","Needs Revision"].includes(x.status) })));
  p.forEach(x => allRecords.appendChild(problemCard(x.id, x)));
}

/************ Cards ************/
function statusClass(s){
  if (s==="Approved") return "badge-success";
  if (s==="Under Review") return "badge-info";
  if (s==="Needs Revision") return "badge-warning";
  return "badge-error";
}

function taskCard(id, t, opts={}){
  const { adminActions=false, canEdit=false } = opts;
  const el=document.createElement("div");
  el.className="glass rounded-xl p-4";
  el.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs text-gray-400">#${id} · ${fmtDT(t.createdAt) || "-"}</div>
        <div class="font-semibold text-lg">${escapeHtml(t.title)}</div>
        <div class="text-sm text-gray-200 mt-1">${escapeHtml(t.desc)}</div>
        <div class="mt-2 flex flex-wrap gap-2 text-xs">
          <span class="badge badge-info">Cat: ${t.category}</span>
          <span class="badge badge-primary">Imp: ${t.importance}</span>
          <span class="badge badge-secondary">Urg: ${t.urgency}</span>
          <span class="badge badge-success">Min: ${t.minutes}</span>
          <span class="badge">By: ${t.nurseName}</span>
        </div>
        <div class="mt-2 text-sm"><span class="text-gray-400">Outcome:</span> ${escapeHtml(t.outcome || "—")}</div>
        <div class="mt-2 text-sm">
          <span class="text-gray-400">Evidence:</span>
          ${(t.evidence||[]).map((u,i)=>`<a target="_blank" class="link underline" href="${u}">file ${i+1}</a>`).join(" · ") || "—"}
        </div>
        ${
          t.managerReview
            ? `<div class="mt-2 text-xs text-gray-300">
                 <div class="text-gray-400">Reviewer:</div>
                 <div><b>${t.managerReview.reviewerName || "-"}</b> — ${fmtDT(t.managerReview.reviewedAt) || "-"}</div>
                 <div class="italic">${escapeHtml(t.managerReview.comment || "")}</div>
               </div>`
            : ""
        }
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="badge ${statusClass(t.status)}">${t.status}</span>
        <div class="actions"></div>
      </div>
    </div>
  `;
  const actions = el.querySelector(".actions");
  if (adminActions){
    const b=document.createElement("button");
    b.className="btn btn-xs btn-info";
    b.textContent="Review";
    b.onclick=()=>openReviewModal(id, t);
    actions.appendChild(b);
  } else if (canEdit && ["Needs Revision","Rejected"].includes(t.status)){
    const ebtn=document.createElement("button");
    ebtn.className="btn btn-xs btn-ghost";
    ebtn.textContent="Edit & Resubmit";
    ebtn.onclick=async ()=>{
      // prefill
      taskTitle.value=t.title;
      taskDesc.value=t.desc;
      taskImportance.value=t.importance;
      taskUrgency.value=t.urgency;
      taskMinutes.value=t.minutes;
      taskCategory.value=t.category;
      taskOutcome.value=t.outcome || "";
      // delete old and re-submit new
      await colTasks().doc(id).delete();
      alert("Loaded task for edit. Re-submit with your changes and new evidence if needed.");
      btnTask.click();
    };
    actions.appendChild(ebtn);
  }
  return el;
}

function problemCard(id, p){
  const el=document.createElement("div");
  el.className="glass rounded-xl p-4";
  el.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs text-gray-400">#${id} · ${fmtDT(p.problemDate) || "-"}</div>
        <div class="font-semibold text-lg">Problem for: ${p.nurseName}</div>
        <div class="mt-1 text-sm">${escapeHtml(p.description || "")}</div>
        <div class="mt-2 text-sm"><span class="text-gray-400">Action:</span> ${escapeHtml(p.actionPlan || "—")}</div>
        <div class="mt-1 text-xs text-gray-400">Linked Task: ${p.linkedTaskId || "—"}</div>
        <div class="mt-2 text-sm">
          <span class="text-gray-400">Attachments:</span>
          ${(p.attachments||[]).map((u,i)=>`<a target="_blank" class="link underline" href="${u}">file ${i+1}</a>`).join(" · ") || "—"}
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="badge ${p.severity === "High" ? "badge-error" : p.severity === "Moderate" ? "badge-warning" : ""}">${p.severity}</span>
        <span class="badge ${p.status === "Open" ? "badge-error" : "badge-success"}">${p.status}</span>
        <button class="btn btn-xs btn-ghost" onclick="toggleProblem('${id}')">Toggle Close</button>
      </div>
    </div>
  `;
  return el;
}

/************ Seed demo ************/
seedDemo?.addEventListener("click", async ()=>{
  if (!isAdmin || !spaceId) return alert("Admins only");
  const now = Date.now();
  // one approved + one under review with fake uploads (no files)
  const a = await colTasks().add({
    spaceId, createdBy:user.uid, createdByName: udoc.name || "User",
    nurseId: udoc.staffId || "", nurseName: `${udoc.name || "User"}${udoc.staffId?` (${udoc.staffId})`:""}`,
    title:"Crash Cart P1 — Full Check",
    desc:"Full cart check and list update.",
    importance:"High", urgency:"High", minutes:50, category:"Safety",
    outcome:"Ready cart; faster response",
    evidence:[],
    status:"Approved",
    managerReview:{ reviewerName: udoc.name || "Manager", comment:"Well done", reviewedAt: firebase.firestore.FieldValue.serverTimestamp(), action:"approve" },
    createdAt: firebase.firestore.Timestamp.fromDate(new Date(now-5*86400000)),
  });
  const b = await colTasks().add({
    spaceId, createdBy:user.uid, createdByName: udoc.name || "User",
    nurseId: udoc.staffId || "", nurseName: `${udoc.name || "User"}${udoc.staffId?` (${udoc.staffId})`:""}`,
    title:"In-service on ECG Leads",
    desc:"30-min internal session on ECG lead placement.",
    importance:"High", urgency:"Medium", minutes:30, category:"Training & Education",
    outcome:"Fewer repeats",
    evidence:[],
    status:"Under Review",
    managerReview:null,
    createdAt: firebase.firestore.Timestamp.fromDate(new Date(now-2*86400000)),
  });
  alert("Demo data added"); renderReviewQueue(); renderDashboard();
});

exportAllCSV?.addEventListener("click", async ()=>{
  if (!isAdmin || !spaceId) return;
  const snap = await colTasks().where("spaceId","==", spaceId).get();
  const rows=[];
  snap.forEach(d=>{
    const x=d.data();
    rows.push({
      id: d.id,
      createdAt: fmtDT(x.createdAt),
      title: x.title, desc: x.desc,
      importance: x.importance, urgency: x.urgency,
      minutes: x.minutes, category: x.category,
      outcome: x.outcome || "",
      evidenceFiles: (x.evidence||[]).length,
      status: x.status,
      reviewer: x.managerReview?.reviewerName || "",
      reviewedAt: fmtDT(x.managerReview?.reviewedAt || ""),
      nurse: x.nurseName || "",
    });
  });
  downloadCSV(rows, "all_tasks.csv");
});

exportProblemsCSV?.addEventListener("click", async ()=>{
  if (!isAdmin || !spaceId) return;
  const snap = await colProblems().where("spaceId","==", spaceId).get();
  const rows=[];
  snap.forEach(d=>{
    const x=d.data();
    rows.push({
      id: d.id,
      problemDate: (x.problemDate?.toDate ? x.problemDate.toDate().toISOString().slice(0,10) : ""),
      openedAt: fmtDT(x.openedAt),
      closedAt: fmtDT(x.closedAt),
      nurse: x.nurseName || "",
      severity: x.severity,
      status: x.status,
      description: x.description,
      actionPlan: x.actionPlan || "",
      linkedTaskId: x.linkedTaskId || "",
      attachments: (x.attachments||[]).length,
      recordedBy: x.recordedBy || "",
    });
  });
  downloadCSV(rows, "problems.csv");
});

printDash?.addEventListener("click", ()=> window.print());
