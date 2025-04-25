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
  const auth = firebase.auth();
  
// Function to automatically update memo count
function updateMemoCount() {
    const memoCountElement = document.getElementById("memo-count");
  
    // Listen for real-time updates from Firestore
    db.collection("memos").onSnapshot((snapshot) => {
      const memoCount = snapshot.size; // Get number of memos
      memoCountElement.innerText = memoCount;
    }, (error) => {
      console.error("Error fetching memo count:", error);
      memoCountElement.innerText = "Error";
    });
  }
  
  // Ensure memo count updates on page load
  document.addEventListener("DOMContentLoaded", updateMemoCount);




  //Logout
  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout-btn");
    
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          alert("Logged out successfully!");
          window.location.replace("login.html"); // Redirect to login page
        }).catch((error) => {
          console.error("Error logging out:", error);
          alert("Error logging out: " + error.message);
        });
      });
    }
  });
  




// Add this logic to fetch and display the user's name:
  document.addEventListener("DOMContentLoaded", () => {
    const userGreeting = document.getElementById("user-greeting");
  
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const uid = user.uid; // Get current user UID
        db.collection("users").doc(uid).get().then((doc) => {
          if (doc.exists) {
            const userName = doc.data().name; // Fetch 'name' field from Firestore
            userGreeting.innerText = ` - Good day, ${userName}!`; // Append message
          } else {
            userGreeting.innerText = ` - Good day!`;
          }
        }).catch((error) => {
          console.error("Error fetching user data:", error);
        });
      }
    });
  });
  



  //Add this function to fetch acknowledgment data based on the current user’s UID:
  document.addEventListener("DOMContentLoaded", () => {
    const memoCountElement = document.getElementById("memo-count");
    const ackCountElement = document.getElementById("ack-count");
    const lastTimestampElement = document.getElementById("last-timestamp");
    const lastMemoTitleElement = document.getElementById("last-memo-title");

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const uid = user.uid; // Get current user UID

            // Fetch total memos in real-time
            db.collection("memos").onSnapshot((snapshot) => {
                memoCountElement.innerText = snapshot.size;
            });

            // Fetch acknowledgment details
            db.collection("memos").get().then((querySnapshot) => {
                let ackCount = 0;
                let lastTimestamp = null;
                let lastMemoTitle = "None";

                querySnapshot.forEach((doc) => {
                    const memo = doc.data();
                    if (memo.acknowledgedDetails && Array.isArray(memo.acknowledgedDetails)) {
                        const userAck = memo.acknowledgedDetails.find((ack) => ack.uid === uid);
                        if (userAck) {
                            ackCount++;
                            if (!lastTimestamp || userAck.timestamp > lastTimestamp) {
                                lastTimestamp = userAck.timestamp;
                                lastMemoTitle = memo.title;
                            }
                        }
                    }
                });

                ackCountElement.innerText = ackCount;

                // Check if timestamp is a Firestore Timestamp or a raw string
                if (lastTimestamp) {
                    if (lastTimestamp instanceof firebase.firestore.Timestamp) {
                        lastTimestampElement.innerText = lastTimestamp.toDate().toLocaleString();
                    } else {
                        let parsedDate = new Date(Date.parse(lastTimestamp));
                        lastTimestampElement.innerText = !isNaN(parsedDate.getTime()) 
                            ? parsedDate.toLocaleString() 
                            : "Never";
                    }
                } else {
                    lastTimestampElement.innerText = "Never"; // Avoid 'Invalid Date'
                }

                lastMemoTitleElement.innerText = lastMemoTitle;
            }).catch((error) => {
                console.error("Error fetching acknowledgment details:", error);
            });
        }
    });
});










//This code will count the memos that do NOT have any user acknowledgments and display the result dynamically.
document.addEventListener("DOMContentLoaded", () => {
    const unackMemoCountElement = document.getElementById("unack-memo-count");
    const unackMemoListElement = document.getElementById("unack-memo-list");
    const showMoreButton = document.getElementById("show-more-btn");

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const uid = user.uid;

            db.collection("memos").get().then((querySnapshot) => {
                let unackMemoCount = 0;
                let unacknowledgedMemos = [];

                querySnapshot.forEach((doc) => {
                    const memo = doc.data();
                    let memoAcknowledged = false;

                    if (memo.acknowledgedDetails && Array.isArray(memo.acknowledgedDetails)) {
                        const userAck = memo.acknowledgedDetails.find((ack) => ack.uid === uid);
                        if (userAck) {
                            memoAcknowledged = true;
                        }
                    }

                    // Store memos not acknowledged by the user
                    if (!memoAcknowledged) {
                        unackMemoCount++;
                        unacknowledgedMemos.push({ title: memo.title, timestamp: memo.timestamp });
                    }
                });

                unackMemoCountElement.innerText = unackMemoCount;

                // Sort unacknowledged memos by timestamp (latest first)
                unacknowledgedMemos.sort((a, b) => (b.timestamp - a.timestamp));

                // Display only the last two unacknowledged memos
                unackMemoListElement.innerHTML = "";
                unacknowledgedMemos.slice(0, 2).forEach(memo => {
                    const memoItem = document.createElement("li");
                    const formattedTimestamp = memo.timestamp instanceof firebase.firestore.Timestamp
                        ? memo.timestamp.toDate().toLocaleString()
                        : "Unknown";

                    memoItem.innerHTML = `
                        <strong>${memo.title}</strong>
                        <p class="text-gray-500 text-sm">${formattedTimestamp}</p>
                    `;
                    unackMemoListElement.appendChild(memoItem);
                });

                // Redirect to memos.html when "Show More" is clicked
                showMoreButton.addEventListener("click", () => {
                    window.location.href = "memos.html";
                });
            }).catch((error) => {
                console.error("Error fetching unacknowledged memos:", error);
            });
        }
    });
});





//To determine the memo with the fastest response and the consumed time, you'll need to:


document.addEventListener("DOMContentLoaded", () => {
    const fastestMemoElement = document.getElementById("fastest-memo");
    const fastestTimeElement = document.getElementById("fastest-time");
    const bestFastestMemoElement = document.getElementById("best-fastest-memo");
    const bestFastestTimeElement = document.getElementById("best-fastest-time");
    const bestFastestUserElement = document.getElementById("best-fastest-user");

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const currentUserUID = user.uid;
            let userMap = {}; // Stores UID -> Username mapping

            // Step 1: Fetch all users first to get names
            db.collection("users").get().then((userSnapshot) => {
                userSnapshot.forEach((doc) => {
                    userMap[doc.id] = doc.data().name; // Map UID to name
                });

                // Step 2: Fetch memos and acknowledgments
                db.collection("memos").get().then((querySnapshot) => {
                    let fastestResponseMemo = null;
                    let fastestResponseTime = Infinity;
                    let bestFastestMemo = null;
                    let bestFastestTime = Infinity;
                    let bestFastestUserUID = null;

                    querySnapshot.forEach((doc) => {
                        const memo = doc.data();

                        if (memo.timestamp instanceof firebase.firestore.Timestamp && memo.acknowledgedDetails) {
                            const memoPostedTime = memo.timestamp.toDate().getTime();
                            
                            memo.acknowledgedDetails.forEach(ack => {
                                if (ack.timestamp instanceof firebase.firestore.Timestamp) {
                                    const ackTime = ack.timestamp.toDate().getTime();
                                    const responseTime = ackTime - memoPostedTime;

                                    // Track current user's fastest response
                                    if (ack.uid === currentUserUID) {
                                        if (responseTime < fastestResponseTime) {
                                            fastestResponseTime = responseTime;
                                            fastestResponseMemo = memo.title;
                                        }
                                    }

                                    // Track globally fastest response
                                    if (responseTime < bestFastestTime) {
                                        bestFastestTime = responseTime;
                                        bestFastestMemo = memo.title;
                                        bestFastestUserUID = ack.uid;
                                    }
                                }
                            });
                        }
                    });

                    // Display current user's fastest memo response
                    fastestMemoElement.innerText = fastestResponseMemo || "No data available";
                    fastestTimeElement.innerText = fastestResponseTime !== Infinity 
                        ? (fastestResponseTime / 1000).toFixed(2) + " seconds" 
                        : "No responses recorded";

                    // Display global best responder memo response
                    bestFastestMemoElement.innerText = bestFastestMemo || "No data available";
                    bestFastestTimeElement.innerText = bestFastestTime !== Infinity 
                        ? (bestFastestTime / 1000).toFixed(2) + " seconds" 
                        : "No responses recorded";
                    
                    // Retrieve and display the best responder's name
                    bestFastestUserElement.innerText = bestFastestUserUID ? (userMap[bestFastestUserUID] || "Unknown User") : "Unknown User";
                });
            }).catch((error) => {
                console.error("Error fetching user data:", error);
            });
        }
    });
});






//current user sees their fastest memo response,
document.addEventListener("DOMContentLoaded", () => {
    const fastestMemoElement = document.getElementById("fastest-memo");
    const fastestTimeElement = document.getElementById("fastest-time");
    const fastestTimestampElement = document.getElementById("fastest-time-stamp");

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const currentUserUID = user.uid;

            db.collection("memos").get().then((querySnapshot) => {
                let fastestResponseMemo = null;
                let fastestResponseTime = Infinity;
                let fastestResponseTimestamp = null;

                querySnapshot.forEach((doc) => {
                    const memo = doc.data();

                    if (memo.timestamp instanceof firebase.firestore.Timestamp && memo.acknowledgedDetails) {
                        const memoPostedTime = memo.timestamp.toDate().getTime();
                        
                        let firstAckTime = null;
                        
                        memo.acknowledgedDetails.forEach(ack => {
                            if (ack.uid === currentUserUID && ack.timestamp instanceof firebase.firestore.Timestamp) {
                                const ackTime = ack.timestamp.toDate().getTime();
                                if (!firstAckTime || ackTime < firstAckTime) {
                                    firstAckTime = ackTime;
                                }
                            }
                        });

                        // Calculate response time for current user
                        if (firstAckTime) {
                            const responseTime = firstAckTime - memoPostedTime;
                            if (responseTime < fastestResponseTime) {
                                fastestResponseTime = responseTime;
                                fastestResponseMemo = memo.title;
                                fastestResponseTimestamp = new Date(firstAckTime).toLocaleString();
                            }
                        }
                    }
                });

                // ✅ Corrected: Format response time to HH:MM:SS
                function formatTime(ms) {
                    let totalSeconds = Math.floor(ms / 1000);
                    let hours = Math.floor(totalSeconds / 3600);
                    totalSeconds %= 3600;
                    let minutes = Math.floor(totalSeconds / 60);
                    let seconds = totalSeconds % 60;

                    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }

                // ✅ Ensuring correct display formatting
                fastestMemoElement.innerText = fastestResponseMemo || "No data available";
                fastestTimeElement.innerHTML = fastestResponseTime !== Infinity 
                    ? `<span class="text-yellow-400">${formatTime(fastestResponseTime)}</span>` 
                    : `<span class="text-gray-500 text-sm">No responses recorded</span>`;
                
                fastestTimestampElement.innerHTML = fastestResponseTimestamp 
                    ? `<span class="text-gray-500 text-sm">${fastestResponseTimestamp}</span>` 
                    : `<span class="text-gray-500 text-sm">No timestamp available</span>`;
            }).catch((error) => {
                console.error("Error fetching memo response times:", error);
            });
        }
    });
});










    

// This code will: ✅ Filter memos by month ✅ Identify the fastest response per user ✅ Rank users and display the top 3
document.addEventListener("DOMContentLoaded", () => {
    const userRankElement = document.getElementById("user-rank");
    const topUsersListElement = document.getElementById("top-users-list");
    const monthSelectElement = document.getElementById("month-select");

    function updateLeaderboard(selectedMonth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const currentUserUID = user.uid;
                let userTimes = {};
                let userMap = {}; // Stores UID -> Username mapping

                // Fetch all users first
                db.collection("users").get().then((userSnapshot) => {
                    userSnapshot.forEach((doc) => {
                        userMap[doc.id] = doc.data().name; // Save UID -> Name mapping
                    });

                    // Now fetch memo acknowledgments
                    db.collection("memos").get().then((querySnapshot) => {
                        querySnapshot.forEach((doc) => {
                            const memo = doc.data();
    
                            if (memo.timestamp instanceof firebase.firestore.Timestamp) {
                                const memoDate = memo.timestamp.toDate();
                                const memoMonth = memoDate.getMonth() + 1;
    
                                if (memoMonth === selectedMonth) {
                                    memo.acknowledgedDetails?.forEach((ack) => {
                                        if (ack.timestamp instanceof firebase.firestore.Timestamp) {
                                            const responseTime = ack.timestamp.toDate().getTime() - memoDate.getTime();
    
                                            if (!userTimes[ack.uid] || responseTime < userTimes[ack.uid]) {
                                                userTimes[ack.uid] = responseTime;
                                            }
                                        }
                                    });
                                }
                            }
                        });

                        // Rank users by fastest response
                        let rankedUsers = Object.entries(userTimes)
                            .map(([uid, time]) => ({ name: userMap[uid] || "Unknown User", time })) // Use mapped names
                            .sort((a, b) => a.time - b.time);

                        // Display user's rank
                        const userIndex = rankedUsers.findIndex(user => user.name === userMap[currentUserUID]);
                        userRankElement.innerText = userIndex !== -1 ? `#${userIndex + 1}` : "Not Ranked";

                        // Display top 3 users
                        topUsersListElement.innerHTML = "";
                        rankedUsers.slice(0, 3).forEach((user, index) => {
                            const listItem = document.createElement("li");
                            listItem.innerHTML = `<strong>#${index + 1}</strong> - ${user.name} (${(user.time / 1000).toFixed(2)} seconds)`;
                            topUsersListElement.appendChild(listItem);
                        });
                    });
                }).catch((error) => {
                    console.error("Error fetching user data:", error);
                });
            }
        });
    }

    // Default load for April
    updateLeaderboard(4);

    // Handle dropdown change
    monthSelectElement.addEventListener("change", (event) => {
        updateLeaderboard(parseInt(event.target.value));
    });
});





//This script: ✅ Fetches the user's profile data ✅ Displays the correct profile picture, name, points, email, and UID
document.addEventListener("DOMContentLoaded", () => {
    const profilePicElement = document.getElementById("user-profile-pic");
    const userNameElement = document.getElementById("user-name");
    const userPointsElement = document.getElementById("user-points");
    const userEmailElement = document.getElementById("user-email");
    const userUidElement = document.getElementById("user-uid");

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const userUid = user.uid;

            // Fetch user data from Firestore
            db.collection("users").doc(userUid).get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    userNameElement.innerText = userData.name || "Unknown User";
                    userPointsElement.innerText = userData.points || "0";
                    userEmailElement.innerText = userData.email || "No Email";
                    userUidElement.innerText = userUid;

                    // Set profile picture
                    if (userData.profilePic) {
                        profilePicElement.src = userData.profilePic;
                    }
                } else {
                    console.error("User data not found.");
                }
            }).catch((error) => {
                console.error("Error fetching user profile:", error);
            });
        }
    });
});












//This script will: ✅ Fetch user details from Firestore ✅ Display only the Top 3 profile pictures in the fastest responders section ✅ Rank users by both fastest response times and highest points
document.addEventListener("DOMContentLoaded", () => {
    const fastestLeaderboardElement = document.getElementById("fastest-leaderboard");
    const pointsLeaderboardElement = document.getElementById("points-leaderboard");
    const monthSelectElement = document.getElementById("month-select");
    const showMoreFastestButton = document.getElementById("show-more-fastest");
    const showMorePointsButton = document.getElementById("show-more-points");

    function updateLeaderboards(selectedMonth) {
        let userMap = {};

        db.collection("users").get().then((userSnapshot) => {
            userSnapshot.forEach((doc) => {
                userMap[doc.id] = { 
                    name: doc.data().name, 
                    points: doc.data().points || 0, 
                    profilePic: doc.data().profilePic || "" 
                };
            });

            db.collection("memos").get().then((querySnapshot) => {
                let userTimes = {};

                querySnapshot.forEach((doc) => {
                    const memo = doc.data();

                    if (memo.timestamp instanceof firebase.firestore.Timestamp) {
                        const memoDate = memo.timestamp.toDate();
                        const memoMonth = memoDate.getMonth() + 1; // Months are 0-based

                        // Apply month filter if not "Overall"
                        if (selectedMonth === 0 || memoMonth === selectedMonth) {
                            memo.acknowledgedDetails?.forEach((ack) => {
                                if (ack.timestamp instanceof firebase.firestore.Timestamp) {
                                    const responseTime = ack.timestamp.toDate().getTime() - memoDate.getTime();

                                    if (!userTimes[ack.uid] || responseTime < userTimes[ack.uid]) {
                                        userTimes[ack.uid] = responseTime;
                                    }
                                }
                            });
                        }
                    }
                });

                // Rank users by fastest response time
                let rankedFastestUsers = Object.entries(userTimes)
                    .map(([uid, time]) => ({ uid, name: userMap[uid]?.name || "Unknown", time, profilePic: userMap[uid]?.profilePic }))
                    .sort((a, b) => a.time - b.time);

                // Rank users by highest points
                let rankedPointUsers = Object.values(userMap)
                    .sort((a, b) => b.points - a.points);

                // Populate fastest responders leaderboard
                fastestLeaderboardElement.innerHTML = "";
                rankedFastestUsers.slice(0, 5).forEach((user, index) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${index < 3 ? medals[index] : `#${index + 1}`}</td>
                        <td class="flex justify-center">${index < 3 && user.profilePic ? `<img src="${user.profilePic}" class="w-10 h-10 rounded-full border-2 border-blue-500">` : "-"}</td>
                        <td>${user.name}</td>
                        <td>${(user.time / 1000).toFixed(2)} sec</td>
                    `;
                    fastestLeaderboardElement.appendChild(row);
                });

                // Populate highest points collectors leaderboard
                pointsLeaderboardElement.innerHTML = "";
                rankedPointUsers.slice(0, 5).forEach((user, index) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${index < 3 ? medals[index] : `#${index + 1}`}</td>
                        <td class="flex justify-center">${index < 3 && user.profilePic ? `<img src="${user.profilePic}" class="w-10 h-10 rounded-full border-2 border-blue-500">` : "-"}</td>
                        <td>${user.name}</td>
                        <td>${user.points}</td>
                    `;
                    pointsLeaderboardElement.appendChild(row);
                });
            }).catch((error) => {
                console.error("Error fetching memo response times:", error);
            });
        }).catch((error) => {
            console.error("Error fetching user data:", error);
        });
    }

    // Default load: "Overall" (month = 0)
    updateLeaderboards(0);

    // Handle dropdown change for fastest responders
    monthSelectElement.addEventListener("change", (event) => {
        updateLeaderboards(parseInt(event.target.value));
    });

    // Redirect to leaderboard.html when "Show More" is clicked
    showMoreFastestButton.addEventListener("click", () => {
        window.location.href = "leaderboard.html";
    });

    showMorePointsButton.addEventListener("click", () => {
        window.location.href = "leaderboard.html";
    });
});







//This script: ✅ Calculates the user's average response time ✅ Ranks all users by acknowledgment speed ✅ Displays the user's rank & trend indicator
document.addEventListener("DOMContentLoaded", () => {
    const avgResponseTimeElement = document.getElementById("avg-response-time");
    const userRankElement = document.getElementById("user-rank");
    const leaderboardElement = document.getElementById("acknowledge-leaderboard");
    const performanceTrendElement = document.getElementById("performance-trend");

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const currentUserUID = user.uid;
            let userResponseTimes = {};
            let userMap = {};

            db.collection("users").get().then((userSnapshot) => {
                userSnapshot.forEach((doc) => {
                    userMap[doc.id] = { 
                        name: doc.data().name, 
                        profilePic: doc.data().profilePic || "" 
                    };
                });

                db.collection("memos").get().then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        const memo = doc.data();

                        if (memo.timestamp instanceof firebase.firestore.Timestamp) {
                            const memoPostedTime = memo.timestamp.toDate().getTime();

                            memo.acknowledgedDetails?.forEach((ack) => {
                                if (ack.timestamp instanceof firebase.firestore.Timestamp) {
                                    const ackTime = ack.timestamp.toDate().getTime();
                                    const responseTime = ackTime - memoPostedTime;

                                    if (!userResponseTimes[ack.uid]) {
                                        userResponseTimes[ack.uid] = [];
                                    }
                                    userResponseTimes[ack.uid].push(responseTime);
                                }
                            });
                        }
                    });

                    // Ensure current user exists in response times
                    if (!userResponseTimes[currentUserUID]) {
                        userResponseTimes[currentUserUID] = [Infinity]; // Prevent "Not Ranked" issue
                    }

                    // Calculate average response times per user
                    let rankedUsers = Object.entries(userResponseTimes).map(([uid, times]) => ({
                        uid,
                        name: userMap[uid]?.name || "Unknown",
                        avgTime: times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : Infinity
                    })).sort((a, b) => a.avgTime - b.avgTime);

                    // Find current user's rank
                    const userIndex = rankedUsers.findIndex(user => user.uid === currentUserUID);
                    userRankElement.innerText = userIndex !== -1 ? `#${userIndex + 1}` : "Not Ranked";

                    // Format time to HH:MM:SS
                    function formatTime(ms) {
                        let totalSeconds = Math.floor(ms / 1000);
                        let hours = Math.floor(totalSeconds / 3600);
                        totalSeconds %= 3600;
                        let minutes = Math.floor(totalSeconds / 60);
                        let seconds = totalSeconds % 60;
                        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    }

                    // Calculate user's average response time
                    const userAvgTime = userResponseTimes[currentUserUID] && userResponseTimes[currentUserUID].length
                        ? formatTime(userResponseTimes[currentUserUID].reduce((sum, time) => sum + time, 0) / userResponseTimes[currentUserUID].length)
                        : "No Data";

                    avgResponseTimeElement.innerText = userAvgTime;

                    // Populate leaderboard
                    leaderboardElement.innerHTML = "";
                    rankedUsers.forEach((user, index) => {
                        const row = document.createElement("li");
                        row.innerHTML = `<strong>#${index + 1}</strong> - ${user.name} (${formatTime(user.avgTime)})`;
                        leaderboardElement.appendChild(row);
                    });

                    // Determine performance trend
                    if (userIndex !== -1 && userIndex < 3) {
                        performanceTrendElement.innerHTML = `<span class="text-green-400">⬆ Trending Up - Top Performer</span>`;
                    } else if (userIndex !== -1 && userIndex > rankedUsers.length / 2) {
                        performanceTrendElement.innerHTML = `<span class="text-red-400">⬇ Trending Down - Improve Your Speed</span>`;
                    } else {
                        performanceTrendElement.innerHTML = `<span class="text-gray-400">Steady Performance</span>`;
                    }

                }).catch((error) => {
                    console.error("Error fetching memo response times:", error);
                });
            }).catch((error) => {
                console.error("Error fetching user data:", error);
            });
        }
    });
});




// Activity log


document.addEventListener("DOMContentLoaded", () => {
    const activityLogElement = document.getElementById("activity-log");

    db.collection("updates").orderBy("timestamp", "desc").limit(10).onSnapshot((querySnapshot) => {
        activityLogElement.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const update = doc.data();
            const listItem = document.createElement("li");
            listItem.innerHTML = `<a href="${update.link}" class="text-blue-400 hover:underline">${update.message}</a>`;
            activityLogElement.appendChild(listItem);
        });
    });
});
