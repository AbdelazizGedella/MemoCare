const firebaseConfig = {
    apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
    authDomain: "ctwo-eee79.firebaseapp.com",
    projectId: "ctwo-eee79",
    storageBucket: "ctwo-eee79.appspot.com",
    messagingSenderId: "788657051205",
    appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
    measurementId: "G-4VTCQR4ZVR"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();



document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserContractEndDate(user.uid); // Fetch contract_end_date
            loadUserSpaces(user.uid); // Fetch joined spaces
            loadAdminRequests(user.uid); // ✅ Load requests only if user is an admin
        } else {
            console.error("No authenticated user found.");
        }
    });
    document.getElementById("submit-request-btn").addEventListener("click", submitRequest);
});


// Fetch and display contract_end_date for the current user
function loadUserContractEndDate(currentUserUID) {
    db.collection("users").doc(currentUserUID).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                // Display contract_end_date
                const contractEndDate = data.contract_end_date || "Not Set";
                const endDateElem = document.getElementById("contract-end-date");
                if (endDateElem) {
                    endDateElem.textContent = contractEndDate;
                }
            }
        })
        .catch(error => console.error("Error fetching user data:", error));
}


function loadUserLeaveHistory(currentUserUID) {
    db.collection("users").doc(currentUserUID).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const leaveHistory = data.leave_history_2024 || [];
                const tbody = document.getElementById("leave-history-list");
                tbody.innerHTML = "";
                if (leaveHistory.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-2">No past leaves recorded.</td></tr>`;
                    return;
                }
                leaveHistory.forEach(leave => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="px-2 py-1 text-yellow-200">${leave.from}</td>
                        <td class="px-2 py-1 text-yellow-200">${leave.to}</td>
                        <td class="px-2 py-1 text-green-200">${leave.days}</td>
                        <td class="px-2 py-1 text-blue-200">${leave.type}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        })
        .catch(error => console.error("Error fetching leave history:", error));
}

// Call this after auth state is ready
document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserLeaveHistory(user.uid);
        }
    });
});




// ✅ Submit Leave Request

// ✅ Submit Leave Request with Validation
async function submitLeaveRequest() {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId) {
        alert("User not authenticated!");
        return;
    }

    const leaveType = document.getElementById("leave-type").value;
    const fromDate = new Date(document.getElementById("leave-from").value);
    const toDate = new Date(document.getElementById("leave-to").value);
    const duration = (toDate - fromDate) / (1000 * 60 * 60 * 24);

    // Get selected space from the front end
    const spaceId = document.getElementById("space-select").value;

    try {
        // Check if user already has a leave request that is not rejected
        const existing = await db.collection("leave_requests")
            .where("user_id", "==", userId)
            .orderBy("start_date", "desc")
            .get();

        let hasPendingOrApproved = false;
        existing.forEach(doc => {
            const status = doc.data().status;
            if (status === "Pending" || status === "Approved") {
                hasPendingOrApproved = true;
            }
        });

        if (hasPendingOrApproved) {
            alert("You already have a pending or approved leave request. You cannot submit a new one.");
            return;
        }

        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            alert("Contract details not found!");
            return;
        }
        const contractEndDate = new Date(userDoc.data().contract_end_date);

        // Prevent leave in last 3 months before contract end
        if (fromDate > new Date(contractEndDate) - 90 * 24 * 60 * 60 * 1000) {
            alert("Leave request denied: Too close to contract end.");
            return;
        }

 
        // Exclude Ramadan & Zulhijjah (based on Hijri calendar, not Gregorian)
        // Use Intl.DateTimeFormat to get the Islamic month name
        function getIslamicMonthName(date) {
            try {
            const hijriFmt = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'long' });
            return hijriFmt.format(date).replace(' هـ', '').trim();
            } catch {
            return "";
            }
        }
        const restrictedMonths = ["Ramadan", "Dhu al-Hijjah", "Zulhijjah"];
        const islamicMonth = getIslamicMonthName(fromDate);
        if (restrictedMonths.some(m => islamicMonth.toLowerCase().includes(m.toLowerCase()))) {
            alert("Leave request denied: Restricted month.");
            return;
        }
        // Store Leave Request in Firestore, including space_id and comment (if any)
        const comment = document.getElementById("leave-comment") ? document.getElementById("leave-comment").value : "";
        await db.collection("leave_requests").add({
            user_id: userId,
            leave_type: leaveType,
            start_date: fromDate.toISOString().split("T")[0],
            end_date: toDate.toISOString().split("T")[0],
            duration: duration,
            status: "Pending",
            space_id: spaceId,
            comment: comment
        });

        alert("Leave request submitted!");
    } catch (error) {
        console.error("Error submitting leave:", error);
    }
}
async function saveContract() {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId) {
        alert("User not authenticated!");
        return;
    }

    const contractDate = document.getElementById("contract-date").value;
    if (!contractDate) {
        alert("Please enter a contract end date.");
        return;
    }

    await db.collection("users").doc(userId).update({ contract_end_date: contractDate });
    alert("Contract date saved!");
}

// ✅ Function to Save Past Leave Records
async function savePastLeave() {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId) {
        alert("User not authenticated!");
        return;
    }

    const from = document.getElementById("past-leave-from").value;
    const to = document.getElementById("past-leave-to").value;
    const days = document.getElementById("past-leave-days").value;
    const type = document.getElementById("past-leave-type").value;

    if (!from || !to || !days || !type) {
        alert("Please fill in all past leave fields.");
        return;
    }

    await db.collection("users").doc(userId).update({
        leave_history_2024: firebase.firestore.FieldValue.arrayUnion({
            from: from,
            to: to,
            days: days,
            type: type
        })
    });

    alert("Past leave saved!");
}

// ✅ Dummy Function for Islamic Month Conversion
function getIslamicMonth(date) {
    const month = date.getMonth() + 1;
    return month === 4 ? "Ramadan" : month === 12 ? "Zulhijjah" : "";
}


document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(async user => {
        if (user) {
            // Fetch user's name from Firestore, not from auth
            const userDoc = await db.collection("users").doc(user.uid).get();
            const userName = userDoc.exists ? (userDoc.data().name || "User") : "User";
            loadUserLeaveRequests(user.uid, userName);
        }
    });
});

// Helper: Convert Gregorian date to Hijri month name (simple mapping for demo)
function getHijriMonthName(gregorianDate) {
    // This is a placeholder. For real conversion, use a library like Umm al-Qura.
    const hijriMonths = [
        "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
        "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
        "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
    ];
    // Fake mapping: just shift by 1 for demo
    const gMonth = new Date(gregorianDate).getMonth();
    return hijriMonths[(gMonth + 1) % 12];
}

// Fetch leave requests from Firestore and display them
async function loadUserLeaveRequests(userId, userName) {
    try {
        const querySnapshot = await db.collection("leave_requests").where("user_id", "==", userId).get();
        const leaveByMonth = {};

        querySnapshot.forEach(doc => {
            const request = doc.data();
            const gDate = new Date(request.start_date);
            const gMonthIdx = gDate.getMonth();
            const hijriMonth = getHijriMonthName(request.start_date);

            if (!leaveByMonth[gMonthIdx]) {
                leaveByMonth[gMonthIdx] = [];
            }
            leaveByMonth[gMonthIdx].push({
                from: request.start_date,
                to: request.end_date,
                duration: request.duration,
                hijriMonth: hijriMonth,
                status: request.status // Add status property
            });
        });

        // Generate Leave Planner Grid with leave info under each month
        // Prepare Gregorian months and calculate their corresponding Hijri month ranges
        // For accurate conversion, use an Islamic calendar library. Here we use 'ummalqura-calendar' for demo.
        // npm install ummalqura-calendar (for real use, but here is a browser version)
        // We'll use a simple approximation for demo purposes.

        // Helper: Approximate Gregorian to Hijri conversion (for each month's start and end)
        function gregorianToHijriRange(year) {
            // This is a rough approximation. For production, use a proper library.
            // Returns array: [{gMonth, gStart, gEnd, hStart: {y,m,d}, hEnd: {y,m,d}}]
            const hijriMonths = [
            "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
            "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
            "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
            ];
            const months = [];
            for (let m = 0; m < 12; m++) {
            const gStart = new Date(year, m, 1);
            const gEnd = new Date(year, m + 1, 0);
            // Use Intl.DateTimeFormat for Hijri (if supported)
            let hStart, hEnd, hStartStr, hEndStr;
            try {
                const hijriFmt = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
                year: 'numeric', month: 'long', day: 'numeric'
                });
                hStartStr = hijriFmt.format(gStart);
                hEndStr = hijriFmt.format(gEnd);
                // Example: "1 Muharram 1447 AH"
                hStart = hStartStr;
                hEnd = hEndStr;
            } catch {
                // Fallback: just show month name
                hStart = hijriMonths[(m + 1) % 12];
                hEnd = hijriMonths[(m + 1) % 12];
            }
            months.push({
                gMonth: gStart.toLocaleString('default', { month: 'short' }),
                gStart,
                gEnd,
                hStart,
                hEnd
            });
            }
            return months;
        }

        // Get the mapping for 2026
        const months = gregorianToHijriRange(2026).map(m =>
            `${m.gMonth} (${m.hStart} - ${m.hEnd})`
        );
        let gridHTML = "";

        months.forEach((month, index) => {
            let leaveInfo = "";
            if (leaveByMonth[index]) {
                leaveByMonth[index].forEach(l => {
                    // Calculate leave percentage for the month
                    const monthStart = new Date(l.from);
                    monthStart.setDate(1);
                    const monthEnd = new Date(l.from);
                    monthEnd.setMonth(monthEnd.getMonth() + 1);
                    monthEnd.setDate(0);

                    const leaveStart = new Date(l.from);
                    const leaveEnd = new Date(l.to);

                    const effectiveStart = leaveStart < monthStart ? monthStart : leaveStart;
                    const effectiveEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;

                    const msInDay = 1000 * 60 * 60 * 24;
                    const daysInMonth = Math.round((monthEnd - monthStart) / msInDay) + 1;
                    const leaveDaysInMonth = Math.max(0, Math.round((effectiveEnd - effectiveStart) / msInDay) + 1);

                    const percent = daysInMonth > 0 ? Math.round((leaveDaysInMonth / daysInMonth) * 100) : 0;

                    // Count leave requests for this month
                    const leaveCount = leaveByMonth[index] ? leaveByMonth[index].length : 0;

                    leaveInfo += `
                    <div class="text-xs text-yellow-300 mb-2">
                        ${userName}
                    </div>
                    <div class="text-xs text-green-300 mb-2">
                        ${l.from} - ${l.to} (${l.duration} days)<br>
                        <span class="text-gray-400 text-[10px]">
                            Hijri: ${formatHijriDate(l.from)} - ${formatHijriDate(l.to)}
                              <div class="text-xs text-purple-300 mt-1">
                                    Request Status: <b>${l.status}</b>
                                </div>
                        </span><br>
                        ${leaveDaysInMonth > 0 ? `
                            <div class="w-full bg-gray-500 rounded h-3 mt-1 mb-1">
                                <div class="bg-blue-400 h-3 rounded" style="width: ${percent}%"></div>
                            </div>
                            <div class="text-blue-400 text-xs text-right">${percent}% of month on leave</div>
                        ` : ""}
                        <div class="text-xs text-pink-300 mt-1">
                            Leave requests this month: ${leaveCount}
                        </div>
                    </div>`;

                    // Helper to format Hijri date as dd-Month-yyyy (using Intl.DateTimeFormat if available)
                    function formatHijriDate(gregorianDate) {
                        try {
                            const date = new Date(gregorianDate);
                            const hijriFmt = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
                                day: '2-digit', month: 'long', year: 'numeric'
                            });
                            // Output: "dd Month yyyy هـ"
                            let hijriStr = hijriFmt.format(date);
                            hijriStr = hijriStr.replace(' هـ', '');
                            return hijriStr;
                        } catch {
                            return '';
                        }
                    }
                });
            }
            gridHTML += `
                <div class="p-4 bg-gray-700 rounded">
                    <div>${month}</div>
                    ${leaveInfo}
                </div>
            `;
        });

        document.getElementById("leave-grid").innerHTML = gridHTML;

        // Display request details (optional, can be removed if not needed)
        let detailsHTML = "";
        querySnapshot.forEach(doc => {
            const request = doc.data();
            detailsHTML += `<div>
                [Count of days = ${request.duration}] then ${request.start_date} : ${request.end_date} (User: ${userName})
            </div>`;
        });
        document.getElementById("leave-request-details").innerHTML = detailsHTML;

    } catch (error) {
        console.error("Error fetching leave requests:", error);
    }
}




// ✅ Fetch Spaces the User Is In
function loadUserSpaces(currentUserUID) {
    db.collection("spaces").where("joinedParticipants", "array-contains", currentUserUID).get()
        .then(snapshot => {
            const spaceSelect = document.getElementById("space-select");
            spaceSelect.innerHTML = "";
            snapshot.forEach(doc => {
                const spaceData = doc.data();
                const option = document.createElement("option");
                option.value = doc.id; // 🔥 Space ID
                option.textContent = spaceData.name;
                spaceSelect.appendChild(option);
            });
        })
        .catch(error => console.error("Error fetching joined spaces:", error));
}




// ✅ Admin: Load Leave Requests for Spaces Owned by Current User
async function loadAdminRequests(currentUserUID) {
    try {
        // 1. Find spaces owned by current user
        const spacesSnapshot = await db.collection("spaces").where("createdBy", "==", currentUserUID).get();
        const adminSpaces = [];
        spacesSnapshot.forEach(doc => adminSpaces.push({ id: doc.id, name: doc.data().name }));

        if (adminSpaces.length === 0) {
            document.getElementById("leave-grid-admin").innerHTML = `<div class="text-gray-400 p-4">You do not own any spaces.</div>`;
            return;
        }

        // 2. Fetch leave requests for these spaces
        const leaveRequests = [];
        for (const space of adminSpaces) {
            const reqs = await db.collection("leave_requests").where("space_id", "==", space.id).get();
            reqs.forEach(doc => leaveRequests.push({ ...doc.data(), id: doc.id, spaceName: space.name }));
        }

        // 3. Group by month
        const leaveByMonth = {};
        leaveRequests.forEach(request => {
            const gDate = new Date(request.start_date);
            const gMonthIdx = gDate.getMonth();
            if (!leaveByMonth[gMonthIdx]) leaveByMonth[gMonthIdx] = [];
            leaveByMonth[gMonthIdx].push(request);
        });

        // 4. Prepare months grid (same as user grid)
        function gregorianToHijriRange(year) {
            const hijriMonths = [
                "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
                "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
                "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
            ];
            const months = [];
            for (let m = 0; m < 12; m++) {
                const gStart = new Date(year, m, 1);
                const gEnd = new Date(year, m + 1, 0);
                let hStart, hEnd;
                try {
                    const hijriFmt = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    });
                    hStart = hijriFmt.format(gStart);
                    hEnd = hijriFmt.format(gEnd);
                } catch {
                    hStart = hijriMonths[(m + 1) % 12];
                    hEnd = hijriMonths[(m + 1) % 12];
                }
                months.push({
                    gMonth: gStart.toLocaleString('default', { month: 'short' }),
                    gStart,
                    gEnd,
                    hStart,
                    hEnd
                });
            }
            return months;
        }
        const months = gregorianToHijriRange(2026).map(m =>
            `${m.gMonth} (${m.hStart} - ${m.hEnd})`
        );

        // 5. Helper to fetch user details (contract, past leaves)
        async function getUserDetails(userId) {
            try {
                const doc = await db.collection("users").doc(userId).get();
                if (!doc.exists) return {};
                const data = doc.data();
                return {
                    name: data.name || "User",
                    contract_end_date: data.contract_end_date || "Not Set",
                    leave_history_2024: data.leave_history_2024 || []
                };
            } catch {
                return {};
            }
        }

        // 6. Helper to format Hijri date
        function formatHijriDate(gregorianDate) {
            try {
                const date = new Date(gregorianDate);
                const hijriFmt = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
                    day: '2-digit', month: 'long', year: 'numeric'
                });
                let hijriStr = hijriFmt.format(date);
                hijriStr = hijriStr.replace(' هـ', '');
                return hijriStr;
            } catch {
                return '';
            }
        }

        // 7. Render grid
        let gridHTML = "";
        for (let index = 0; index < months.length; index++) {
            let leaveInfo = "";
            if (leaveByMonth[index]) {
                for (const l of leaveByMonth[index]) {
                    // Fetch user details for tooltip
                    const userDetails = await getUserDetails(l.user_id);
                    const leaveStart = new Date(l.start_date);
                    const leaveEnd = new Date(l.end_date);
                    const monthStart = new Date(leaveStart.getFullYear(), index, 1);
                    const monthEnd = new Date(leaveStart.getFullYear(), index + 1, 0);
                    const effectiveStart = leaveStart < monthStart ? monthStart : leaveStart;
                    const effectiveEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;
                    const msInDay = 1000 * 60 * 60 * 24;
                    const daysInMonth = Math.round((monthEnd - monthStart) / msInDay) + 1;
                    const leaveDaysInMonth = Math.max(0, Math.round((effectiveEnd - effectiveStart) / msInDay) + 1);
                    const percent = daysInMonth > 0 ? Math.round((leaveDaysInMonth / daysInMonth) * 100) : 0;

                    // Tooltip content
                    let tooltip = `
                        <div class="p-2 text-xs">
                            <div><b>Name:</b> ${userDetails.name}</div>
                            <div><b>Contract End:</b> ${userDetails.contract_end_date}</div>
                            <div><b>Past Leaves:</b></div>
                            <ul class="ml-2">
                                ${userDetails.leave_history_2024.map(h =>
                                    `<li>${h.from} - ${h.to} (${h.days} days, ${h.type})</li>`
                                ).join("") || "<li>None</li>"}
                            </ul>
                        </div>
                    `;

                    leaveInfo += `
                        <div class="relative group mb-3">
                            <div class="flex items-center gap-2">
                                <span class="text-yellow-300 text-xs">${userDetails.name || "User"}</span>
                                
                                <button class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs mr-1" onclick="approveLeaveRequest('${l.id}')">&#10003;</button>
                                <button class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs" onclick="rejectLeaveRequest('${l.id}')">&#10007;</button>
                            </div>
                  
                                <span class="text-gray-400 text-xs">(${l.spaceName})</span>
                            <div class="text-green-300 text-xs">
                                ${l.start_date} - ${l.end_date} (${l.duration} days)
                             <br>
                                 <span class="text-gray-400 text-[10px]">
                                    Hijri: ${formatHijriDate(l.start_date)} - ${formatHijriDate(l.end_date)}
                                </span>
                                <div class="w-full bg-gray-500 rounded h-3 mt-1 mb-1">
                                    <div class="bg-blue-400 h-3 rounded" style="width: ${percent}%"></div>
                                </div>
                                <div class="text-blue-400 text-xs text-right">${percent}% of month on leave</div>
                                <div class="text-xs text-pink-300 mt-1">
                                    Status: ${l.status}
                                </div>
                                ${l.comment ? `
                                    <div class="w-full bg-purple-500 rounded h-2 mt-1 mb-1">
                                        <div class="bg-purple-300 h-2 rounded" style="width: 100%"></div>
                                    </div>
                                    <div class="text-xs text-purple-200 mt-1">
                                        Comment: ${l.comment}
                                    </div>
                                ` : ""}
                            </div>
                            <div class="absolute left-0 top-full z-10 hidden group-hover:block bg-gray-800 border border-gray-600 rounded shadow-lg mt-1 w-64">
                                ${tooltip}
                            </div>
                        </div>
                    `;
                }
            }
            gridHTML += `
                <div class="p-4 bg-gray-700 rounded mb-2">
                    <div>${months[index]}</div>
                    ${leaveInfo}
                </div>
            `;
        }
        document.getElementById("leave-grid-admin").innerHTML = gridHTML;
    } catch (error) {
        console.error("Error loading admin leave requests:", error);
    }
}

// ✅ Approve/Reject Leave Request Functions
async function approveLeaveRequest(requestId) {
    if (!confirm("Approve this leave request?")) return;
    try {
        await db.collection("leave_requests").doc(requestId).update({ status: "Approved" });
        alert("Leave request approved.");
        location.reload();
    } catch (e) {
        alert("Error approving request.");
    }
}
async function rejectLeaveRequest(requestId) {
    if (!confirm("Reject this leave request?")) return;
    try {
        await db.collection("leave_requests").doc(requestId).update({ status: "Rejected" });
        alert("Leave request rejected.");
        location.reload();
    } catch (e) {
        alert("Error rejecting request.");
    }
}
