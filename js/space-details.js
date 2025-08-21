
    const firebaseConfig = {
      apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
      authDomain: "ctwo-eee79.firebaseapp.com",
      projectId: "ctwo-eee79",
      storageBucket: "ctwo-eee79.appspot.com",
      messagingSenderId: "788657051205",
      appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    let currentUserUID = null;
    let editingUID = null;
    let participantsUIDs = [];

    const spaceId = new URLSearchParams(window.location.search).get("spaceId");
    auth.onAuthStateChanged(async user => {
      if (!user) return location.href = "login.html";
      currentUserUID = user.uid;
      const userDoc = await db.collection("users").doc(currentUserUID).get();
      if (!userDoc.data()?.admin) return alert("Access denied.");

      const spaceDoc = await db.collection("spaces").doc(spaceId).get();
      if (!spaceDoc.exists) return;
      const space = spaceDoc.data();
      document.getElementById("space-name").textContent = space.name;
      document.getElementById("space-description").textContent = space.description;

      participantsUIDs = space.joinedParticipants || [];
      if (!participantsUIDs.length) {
        document.getElementById("loading").innerText = "No participants found.";
        return;
      }

      // 🟩 UIDs اللي عايز تخفيها من العرض
const hiddenUIDs = ["lTyqUeqTkXaZyt749jVPEnZtOhU2"];

// فلترة المشاركين قبل تحميل بياناتهم
const visibleUIDs = participantsUIDs.filter(uid => !hiddenUIDs.includes(uid));

loadParticipants(visibleUIDs);

    });

    async function loadParticipants(uids) {
      try {
        const userDocs = await Promise.all(uids.map(uid => db.collection("users").doc(uid).get()));
        const certDocs = await Promise.all(uids.map(uid => db.collection("Database").doc(uid).get()));

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("content").classList.remove("hidden");


           // خزّن بيانات المستخدمين كاملة في مصفوفة عالمية
    participantsData = userDocs.map((doc, i) => {
      const d = doc.data() || {};
      const cert = certDocs[i]?.data() || {};
      return { user: d, cert };
    });


        const tbody = document.getElementById("participants-body");
        tbody.innerHTML = userDocs.map((doc, i) => {
          if (!doc.exists) return "";
          const d = doc.data();
          const cert = certDocs[i]?.data() || {};
const getExpiry = key => {
  const certEntry = cert[key];
  if (!certEntry || certEntry.status === "rejected") return "-";

  const raw = certEntry.expiryDate;
  if (!raw) return "-";

  let expiryDate;
  try {
    if (raw.seconds) expiryDate = new Date(raw.seconds * 1000); // Firebase Timestamp
    else if (typeof raw === "string") expiryDate = new Date(raw);
    else if (raw instanceof Date) expiryDate = raw;
    else return "-";

    if (isNaN(expiryDate)) return "-";

    const formattedDate = expiryDate.toISOString().split("T")[0];
    const today = new Date();
    const nearExpiryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (expiryDate < today) {
      return `<span class="text-red-500">(Expired)</span> ${formattedDate}`;
    } else if (expiryDate <= nearExpiryDate) {
      return `<span class="text-orange-400">(Near Expiry)</span> ${formattedDate}`;
    } else {
      return formattedDate;
    }
  } catch {
    return "-";
  }
};


          return `<tr>
            <td>${i + 1}</td>
            <td>${d.name || '-'}</td>
            <td>${d.email || '-'}</td>
            <td>${d.phone || '-'}</td>
            <td>${d.nationality || '-'}</td>
            <td>${d.contractType || '-'}</td>
            <td>${d.gender || '-'}</td>
                        <td>${d.startDate || '-'}</td>
<td>${formatContractEndDate(d.contractEndDate)}</td>
<td>
  ${d.birthDate || '-'}
  ${d.birthDate ? `<span class="text-yellow-400">(${calculateAge(d.birthDate)} yrs)</span>` : ''}
</td>
            <td>${d.iqama || '-'}</td>
            <td>${d.passport || '-'}</td>
            <td>${d.degree || '-'}</td>
            <td>${d.speciality || '-'}</td>
<td>${d.dataflow || '-'}</td>


            <td>${getExpiry("BLS")}</td>
            <td>${getExpiry("ACLS")}</td>
            <td>${getExpiry("SEDATION")}</td>
            <td>${getExpiry("MOH")}</td>
            <td>${getExpiry("SCFHS")}</td>
            <td><button onclick="editUser('${doc.id}')" class="btn btn-sm btn-primary">Edit</button></td>
          </tr>`;
        }).join("");
      } catch (err) {
        console.error("❌ Failed to load participants:", err);
        document.getElementById("loading").innerText = "Error loading data.";
      }
    }

    function editUser(uid) {
      editingUID = uid;
      const form = document.getElementById("editForm");
      form.innerHTML = "Loading...";
      db.collection("users").doc(uid).get().then(doc => {
        const d = doc.data();
        form.innerHTML = `
          <div><label>Name</label><input id="edit-name" value="${d.name || ''}" class="input input-bordered w-full" /></div>
<div><label>Email</label><input id="edit-email" value="${d.email || ''}" class="input input-bordered w-full" disabled /></div>
          <div><label>Care Email</label><input id="edit-careEmail" value="${d.careEmail || ''}" class="input input-bordered w-full" /></div>
          <div><label>Phone</label><input id="edit-phone" value="${d.phone || ''}" class="input input-bordered w-full" /></div>
          <div><label>Nationality</label>
            <select id="edit-nationality" class="select select-bordered w-full">
              ${["SAUDI","EGYPTIAN","JORDANIAN","ERITHRIAN","FILIPINO","INDIAN","PAKISTAN","SUDANESE","LEBANESE","TUNISIAN","SOMALI","BURKINA FASO","NIGERIAN","ETHIOPIAN","INDONESIAN","BANGLADESH","KENYAN","YEMENI"].map(n => `<option ${d.nationality===n?'selected':''}>${n}</option>`).join('')}
            </select>
          </div>
          <div><label>Gender</label>
            <select id="edit-gender" class="select select-bordered w-full">
              <option ${d.gender==='MALE'?'selected':''}>MALE</option>
              <option ${d.gender==='FEMALE'?'selected':''}>FEMALE</option>
            </select>
          </div>
          <div><label>Contract Type</label>
            <select id="edit-contractType" class="select select-bordered w-full">
              ${["INTERNATIONAL","LOCAL","ALMAWARID","MAHARA","ABDAL"].map(c => `<option ${d.contractType===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div><label>Birth Date</label><input type="date" id="edit-birthDate" value="${d.birthDate || ''}" class="input input-bordered w-full" /></div>
          <div><label>Start Date</label><input type="date" id="edit-startDate" value="${d.startDate || ''}" class="input input-bordered w-full" /></div>
          <div><label>Contract End Date</label><input type="date" id="edit-contractEndDate" value="${d.contractEndDate || ''}" class="input input-bordered w-full" /></div>
          <div><label>IQAMA</label><input id="edit-iqama" value="${d.iqama || ''}" class="input input-bordered w-full" /></div>
          <div><label>Passport</label><input id="edit-passport" value="${d.passport || ''}" class="input input-bordered w-full" /></div>
          <div><label>Degree</label>
            <select id="edit-degree" class="select select-bordered w-full">
              ${["Bachelor of Nursing Sciences","Master degree of Nursing Sciences","Diploma degree of Nursing Sciences"].map(opt => `<option ${d.degree===opt?'selected':''}>${opt}</option>`).join('')}
            </select>
          </div>
          <div><label>Dataflow</label><input id="edit-dataflow" value="${d.dataflow || ''}" class="input input-bordered w-full" /></div>

          <div><label>Speciality</label>
            <select id="edit-speciality" class="select select-bordered w-full">
              ${["Nurse Specialist","Nurse Technician"].map(opt => `<option ${d.speciality===opt?'selected':''}>${opt}</option>`).join('')}
            </select>
          </div>
        `;
        document.getElementById("editModal").showModal();
      });
    }

    function saveChanges() {
      if (!editingUID) return;
      const updates = {};
      ["name","email","careEmail","phone","nationality","gender","contractType","birthDate","startDate","contractEndDate","iqama","passport","degree","speciality","dataflow"].forEach(id => {
  updates[id] = document.getElementById(`edit-${id}`).value;
});

      db.collection("users").doc(editingUID).update(updates).then(() => {
        alert("✅ Updated");
        document.getElementById("editModal").close();
        loadParticipants(participantsUIDs);
      }).catch(err => alert(err.message));
    }

    function exportToExcel() {
      const table = document.getElementById("participants-table");
      const workbook = XLSX.utils.table_to_book(table);
      XLSX.writeFile(workbook, "participants.xlsx");
    }


    function calculateAge(birthDateStr) {
  try {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return "?";
  }
}


  function createCharts() {
    if (!participantsData || !participantsData.length) return alert("No data to display charts.");

    
    // تحضير بيانات الجندر
const genderNames = { MALE: [], FEMALE: [] };
  const genderCounts = { MALE: 0, FEMALE: 0 };

participantsData.forEach(p => {
  const g = p.user.gender;
  const name = p.user.name || "Unknown";
  if (g === "MALE" || g === "FEMALE") {
    genderNames[g].push(name);
          genderCounts[g]++;

  }
});

    // تحضير بيانات العقود
    const contractCounts = {};
    participantsData.forEach(p => {
      const c = p.user.contractType || "Unknown";
      contractCounts[c] = (contractCounts[c] || 0) + 1;
    });

    // تحضير بيانات الجنسيات
    const nationalityCounts = {};
    participantsData.forEach(p => {
      const n = p.user.nationality || "Unknown";
      nationalityCounts[n] = (nationalityCounts[n] || 0) + 1;
    });

// 🟩 إعداد بيانات مخطط نهاية العقد
const oneYearFromNow = new Date();
oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

const endDatePoints = participantsData.map((p, i) => {
  const name = p.user.name || "Unknown";
  const endDateRaw = p.user.contractEndDate;
  if (!endDateRaw) return null;

  const endDate = new Date(endDateRaw);
  if (isNaN(endDate)) return null;
  if (endDate > oneYearFromNow) return null; // ✅ تجاهل العقود اللي بعد سنة

  return {
    x: endDate,
    y: 1,
    label: name,
    customTooltip: `${name}\nEnds: ${endDate.toISOString().split("T")[0]}`
  };
}).filter(Boolean);


// ضبط ارتفاع الرسم
document.getElementById("endDateChart").parentNode.style.height = '300px';

// إنشاء شارت العقد
// شارت نهاية العقود
const endDateChart = new Chart(document.getElementById("endDateChart").getContext("2d"), {
  type: "scatter",
  data: {
    datasets: [{
      label: "Contract End Dates",
      data: endDatePoints,
      backgroundColor: "#f43f5e",
      pointStyle: "triangle",
      radius: 8,
      hoverRadius: 10,
      showLine: false
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          tooltipFormat: 'MMM yyyy',
          displayFormats: {
            month: 'MMM yyyy'
          }
        },
        title: {
          display: true,
          text: 'Contract End Date',
          color: '#fbbf24'
        },
        ticks: {
          color: '#fbbf24'
        }
      },
      y: {
        display: false
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            return context.raw.customTooltip;
          }
        }
      },
      legend: {
        display: false
      }
    },
    onClick: (evt, activeEls) => {
      if (!activeEls.length) return;
      // كل نقطة تمثل موظف، نجيب الاسم من الـ label
      const point = endDatePoints[activeEls[0].index];
      if (!point) return;

      showDetailsModal(`Contract Ending Soon: ${point.label}`, [point.label]);
    }
  }
});



    // تحضير بيانات الدرجات العلمية
    const degreeCounts = {};
    participantsData.forEach(p => {
      const deg = p.user.degree || "Unknown";
      degreeCounts[deg] = (degreeCounts[deg] || 0) + 1;
    });

    // بيانات شهادات Active / Missing / Expired / Near Expiry
    const certTypes = ["BLS", "ACLS", "SEDATION", "MOH", "SCFHS"];
    const certStatus = {};
    const today = new Date();
    const nearExpiryDays = 30;
    const nearExpiryDate = new Date(today.getTime() + nearExpiryDays * 24 * 60 * 60 * 1000);

    certTypes.forEach(cert => {
      certStatus[cert] = { Active: 0, "Near Expiry": 0, Expired: 0, Missing: 0 };
    });

    participantsData.forEach(p => {
      certTypes.forEach(cert => {
        const expiryRaw = p.cert[cert]?.expiryDate;
        if (!expiryRaw) {
          certStatus[cert].Missing++;
        } else {
          let expiryDate;
          if (expiryRaw.seconds) expiryDate = new Date(expiryRaw.seconds * 1000);
          else if (typeof expiryRaw === "string") expiryDate = new Date(expiryRaw);
          else expiryDate = expiryRaw instanceof Date ? expiryRaw : null;

          if (!expiryDate || isNaN(expiryDate)) {
            certStatus[cert].Missing++;
          } else if (expiryDate < today) {
            certStatus[cert].Expired++;
          } else if (expiryDate <= nearExpiryDate) {
            certStatus[cert]["Near Expiry"]++;
          } else {
            certStatus[cert].Active++;
          }
        }
      });
    });

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#fbbf24' } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#fbbf24' } },
        x: { ticks: { color: '#fbbf24' } }
      }
    };

    // ضبط ارتفاع كل canvas
    document.getElementById("genderChart").parentNode.style.height = '250px';
    document.getElementById("contractChart").parentNode.style.height = '250px';
    document.getElementById("nationalityChart").parentNode.style.height = '250px';
    document.getElementById("degreeChart").parentNode.style.height = '250px';
    document.getElementById("certificatesChart").parentNode.style.height = '300px';

    // شارت الجندر (Pie)
const genderChartCtx = document.getElementById("genderChart").getContext("2d");

const genderChart = new Chart(genderChartCtx, {
  type: "pie",
  data: {
    labels: Object.keys(genderCounts),
    datasets: [{
      label: "Gender Distribution",
      data: Object.values(genderCounts),
      backgroundColor: ["#3b82f6", "#f43f5e"]
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#fbbf24' } },
      tooltip: {
        enabled: true
      }
    },
    onClick: (evt, activeEls) => {
      if (!activeEls.length) return; // لو ضغطت على مكان فاضي
      const firstPoint = activeEls[0];
      const label = genderChart.data.labels[firstPoint.index];
      const names = genderNames[label] || [];

      const modal = document.getElementById('detailsModal');
      document.getElementById('modalTitle').textContent = `Details for ${label} (${names.length})`;
      
      // ممكن هنا تعرض جدول أو قائمة بالأسماء
      document.getElementById('modalContent').innerHTML = `
        <table class="table-auto w-full text-left">
          <thead>
            <tr class="border-b border-gray-600">
              <th class="px-2 py-1">#</th>
              <th class="px-2 py-1">Name</th>
            </tr>
          </thead>
          <tbody>
            ${names.map((name, i) => `<tr class="${i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600'}"><td class="px-2 py-1">${i + 1}</td><td class="px-2 py-1">${name}</td></tr>`).join('')}
          </tbody>
        </table>
      `;

      modal.showModal();
    }
  }
});



    // شارت العقود (Bar)
const contractChart = new Chart(document.getElementById("contractChart").getContext("2d"), {
  type: "bar",
  data: {
    labels: Object.keys(contractCounts),
    datasets: [{
      label: "Contract Types",
      data: Object.values(contractCounts),
      backgroundColor: "#10b981"
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#fbbf24' } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#fbbf24' } },
      x: { ticks: { color: '#fbbf24' } }
    },
    onClick: (evt, activeEls) => {
      if (!activeEls.length) return;
      const index = activeEls[0].index;
      const label = contractChart.data.labels[index];
      
      // جلب أسماء المشاركين اللي عقدهم من النوع المحدد
      const names = participantsData
        .filter(p => (p.user.contractType || "Unknown") === label)
        .map(p => p.user.name || "Unknown");
      
      showDetailsModal(`Contract Type: ${label} (${names.length})`, names);
    }
  }
});

    // شارت الجنسيات (Bar)
const nationalityChart = new Chart(document.getElementById("nationalityChart").getContext("2d"), {
  type: "bar",
  data: {
    labels: Object.keys(nationalityCounts),
    datasets: [{
      label: "Nationality Distribution",
      data: Object.values(nationalityCounts),
      backgroundColor: "#f59e0b"
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#fbbf24' } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#fbbf24' } },
      x: { ticks: { color: '#fbbf24' } }
    },
    onClick: (evt, activeEls) => {
      if (!activeEls.length) return;
      const index = activeEls[0].index;
      const label = nationalityChart.data.labels[index];

      const names = participantsData
        .filter(p => (p.user.nationality || "Unknown") === label)
        .map(p => p.user.name || "Unknown");

      showDetailsModal(`Nationality: ${label} (${names.length})`, names);
    }
  }
});

    // شارت الدرجات العلمية (Bar)
const degreeChart = new Chart(document.getElementById("degreeChart").getContext("2d"), {
  type: "bar",
  data: {
    labels: Object.keys(degreeCounts),
    datasets: [{
      label: "Degree Distribution",
      data: Object.values(degreeCounts),
      backgroundColor: "#8b5cf6"
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#fbbf24' } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#fbbf24' } },
      x: { ticks: { color: '#fbbf24' } }
    },
    onClick: (evt, activeEls) => {
      if (!activeEls.length) return;
      const index = activeEls[0].index;
      const label = degreeChart.data.labels[index];

      const names = participantsData
        .filter(p => (p.user.degree || "Unknown") === label)
        .map(p => p.user.name || "Unknown");

      showDetailsModal(`Degree: ${label} (${names.length})`, names);
    }
  }
});

    // شارت شهادات الحالة (Stacked Bar)
    const statuses = ["Active", "Near Expiry", "Expired", "Missing"];
    const datasets = statuses.map((status, i) => ({
      label: status,
      data: certTypes.map(cert => certStatus[cert][status]),
      backgroundColor: ["#10b981","#fbbf24","#ef4444","#9ca3af"][i]
    }));
const certificatesChart = new Chart(document.getElementById("certificatesChart").getContext("2d"), {
  type: "bar",
  data: {
    labels: certTypes,
    datasets: datasets
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, stacked: true, ticks: { color: '#fbbf24' } },
      x: { stacked: true, ticks: { color: '#fbbf24' } }
    },
    plugins: {
      legend: { labels: { color: '#fbbf24' } }
    },
    onClick: (evt, activeEls) => {
      if (!activeEls.length) return;
      const first = activeEls[0];
      const cert = certificatesChart.data.labels[first.index]; // نوع الشهادة
      const status = certificatesChart.data.datasets[first.datasetIndex].label; // الحالة

      // جلب أسماء المشاركين حسب الحالة والشهادة
      const names = participantsData.filter(p => {
        const expiryRaw = p.cert[cert]?.expiryDate;
        let expiryDate;

        if (!expiryRaw) return status === "Missing";

        if (expiryRaw.seconds) expiryDate = new Date(expiryRaw.seconds * 1000);
        else if (typeof expiryRaw === "string") expiryDate = new Date(expiryRaw);
        else expiryDate = expiryRaw instanceof Date ? expiryRaw : null;

        if (!expiryDate || isNaN(expiryDate)) return status === "Missing";

        const today = new Date();
        const nearExpiryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (status === "Expired") return expiryDate < today;
        if (status === "Near Expiry") return expiryDate >= today && expiryDate <= nearExpiryDate;
        if (status === "Active") return expiryDate > nearExpiryDate;

        return false;
      }).map(p => p.user.name || "Unknown");

      showDetailsModal(`Certificate: ${cert} - Status: ${status} (${names.length})`, names);
    }
  }
});

  }

  document.getElementById("showChartsBtn").addEventListener("click", () => {
    const container = document.getElementById("chartsContainer");
    if (container.classList.contains("hidden")) {
      container.classList.remove("hidden");
      createCharts();
    } else {
      container.classList.add("hidden");
    }
  });


  function showDetailsModal(title, names) {
  const modal = document.getElementById('detailsModal');
  document.getElementById('modalTitle').textContent = title;

  if (!names.length) {
    document.getElementById('modalContent').innerHTML = '<p>No data available.</p>';
  } else {
    document.getElementById('modalContent').innerHTML = `
      <table class="table-auto w-full text-left">
        <thead>
          <tr class="border-b border-gray-600">
            <th class="px-2 py-1">#</th>
            <th class="px-2 py-1">Name</th>
          </tr>
        </thead>
        <tbody>
          ${names.map((name, i) => `
            <tr class="${i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600'}">
              <td class="px-2 py-1">${i + 1}</td>
              <td class="px-2 py-1">${name}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  modal.showModal();
}



function formatContractEndDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const endDate = new Date(dateStr);
    if (isNaN(endDate)) return "-";

    const today = new Date();
    const nearExpiryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const formatted = endDate.toISOString().split("T")[0];

    if (endDate < today) {
      return `<span class="text-red-500">(Expired)</span> ${formatted}`;
    } else if (endDate <= nearExpiryDate) {
      return `<span class="text-orange-400">(Near Expiry)</span> ${formatted}`;
    } else {
      return formatted;
    }
  } catch {
    return "-";
  }
}
