
// Initialize Firebase (Replace with your actual config)
var config = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  };
firebase.initializeApp(config);
const database = firebase.database();
const auth = firebase.auth();

function isValidCollegeEmail(email) {
    // New regex: allows dot in username with format [name].[branch][numbers]@vit.edu
    const collegeEmailRegex = /^[A-Za-z]+\.[A-Za-z]+[0-9]{2}@vit\.edu$/;
    return collegeEmailRegex.test(email);
}

let isLoginMode = false;

document.getElementById("toggle-btn").addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        document.getElementById("form-title").innerText = "Login";
        document.getElementById("auth-btn").innerText = "Login";
        document.getElementById("toggle-btn").innerText = "Don't have an account? Register";
        document.getElementById("role-container").style.display = "none";
        document.getElementById("category-container").style.display = "none";
        document.getElementById("Branch-container").style.display = "none";
        document.getElementById("year-container").style.display = "none";
        
        
        
    } else {
        document.getElementById("form-title").innerText = "Register";
        document.getElementById("auth-btn").innerText = "Register";
        document.getElementById("toggle-btn").innerText = "Already have an account? Login";
        document.getElementById("role-container").style.display = "block";
        document.getElementById("category-container").style.display = "block";
        document.getElementById("Branch-container").style.display = "block";
        document.getElementById("year-container").style.display = "block";
        
        
    }
});

document.getElementById("auth-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!isValidCollegeEmail(email)) {
        alert("Please enter valid college email (format: abc.xyz24@vit.edu)");
        return; // Stop execution if invalid
    }

    if (isLoginMode) {
        auth.signInWithEmailAndPassword(email, password)
            .then((user) => {
                const userId = user.user.uid;
                database.ref(`users/${userId}`).once('value')
                    .then((snapshot) => {
                        const userData = snapshot.val();
                        const role = userData.role;

                        // Hide the form container after successful login
                        document.getElementById("form-container").style.display = 'none';

                        // Check if secondary user is already coupled
                        if (role === "secondary" && userData.coupledWith) {
                            showCouplesSection(userId); // Show the couple they made with
                        } else if (role === "primary") {
                            showCouplesSection(userId); // Primary user goes straight to couples
                            // Start listening for changes
                            listenForChanges(userId);
                        } else { // Secondary user who hasn't selected a primary user
                            showPrimaryUsersList(userId);
                        }
                    })
                    .catch(handleFirebaseError);
            })
            .catch(handleFirebaseError);
    } else {
        const Branch = document.getElementById("Branch").value;
        const year = document.getElementById("year").value;
        const role = document.getElementById("role").value;
        const category = document.getElementById("category").value; // Get selected category
        const mobile = document.getElementById("mobile").value; 
        auth.createUserWithEmailAndPassword(email, password)
            .then((user) => {
                database.ref(`users/${user.user.uid}`).set({
                    email,
                    Branch,
                    year,
                    role,
                    category,
                    mobile, // Store selected category
                    coupledWith: null // Added to track couples
                })
                .then(() => {
                    alert("Registration successful!");
                    document.getElementById("auth-form").reset();
                })
                .catch(handleFirebaseError);
            })
            .catch(handleFirebaseError);
    }
});

// Add real-time email validation
document.getElementById("email").addEventListener("input", function() {
    const email = this.value;
    const errorDiv = document.getElementById("email-error");
    
    if (!isValidCollegeEmail(email)) {
        errorDiv.textContent = "(e.g.: abc.xyz24@vit.edu)";
        errorDiv.style.display = "block";
    } else {
        errorDiv.style.display = "none";
    }
});


function handleFirebaseError(error) {
    console.error("Firebase Error:", error);
    alert("An error occurred. Please try again later.");
}

// Function to display the list of available primary users for secondary users
function showPrimaryUsersList(secondaryUserId) {
    document.querySelector(".primary-users-section").style.display = "block";
    document.querySelector("#primary-users-list").innerHTML = "";

    database.ref("users")
      .orderByChild("role")
      .equalTo("primary")
      .once("value")
      .then((snapshot) => {
          snapshot.forEach((userSnapshot) => {
              const primaryUserData = userSnapshot.val();
              const primaryUserId = userSnapshot.key;

              // Check if primary user is already coupled
              if (!primaryUserData.coupledWith) {
                  addPrimaryUserToList(primaryUserData.email, primaryUserData.category, primaryUserId, secondaryUserId);
              }
          });
      })
      .catch(handleFirebaseError);

    // Add event listener for filtering input (text search)
    document.getElementById('filter-input').addEventListener('input', function() {
        const filterValue = this.value.toLowerCase(); // Get input value in lowercase
        const selectedCategory = document.getElementById('category-filter').value; // Get selected category
        filterPrimaryUsers(filterValue, selectedCategory); // Apply both filters
    });

    // Add event listener for category filter dropdown
    document.getElementById('category-filter').addEventListener('change', function() {
        const filterValue = document.getElementById('filter-input').value.toLowerCase(); // Get input value in lowercase
        const selectedCategory = this.value; // Get selected category
        filterPrimaryUsers(filterValue, selectedCategory); // Apply both filters
    });
}

// Function to add a primary user to the list
function addPrimaryUserToList(email, category, primaryUserId, secondaryUserId) {
    const li = document.createElement("li");
    const infoIcon = document.createElement("span");
    const tick = document.createElement("span");
    
    // Create text node instead of textContent
    const textNode = document.createTextNode(`${email} (${category}) `);
    
    // Build structure correctly
    infoIcon.className = "info-icon";
    infoIcon.innerHTML = "&#9432";
    infoIcon.dataset.userId = primaryUserId;
    infoIcon.onclick = showUserDetails;

    tick.innerHTML = "&#10004;";
    tick.style.cssText = "cursor: pointer; margin-left: 10px;";
    tick.onclick = () => handleApprove(secondaryUserId, primaryUserId, email);

    li.appendChild(textNode);
    li.appendChild(infoIcon);
    li.appendChild(tick);
    
    li.dataset.category = category.toLowerCase();
    document.querySelector("#primary-users-list").appendChild(li);
}

function showUserDetails(event) {
    const userId = event.target.dataset.userId;
    
    // Fetch user details from Firebase
    database.ref(`users/${userId}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            
            // Add null checks for data safety
            if (!userData) {
                console.error("No user data found");
                return;
            }

            // Populate modal content
            document.getElementById("modal-email").textContent = userData.email || 'N/A';
            document.getElementById("modal-branch").textContent = userData.Branch || 'N/A';
            document.getElementById("modal-year").textContent = userData.year || 'N/A';
            document.getElementById("modal-mobile").textContent = userData.mobile || 'N/A';
            
          
            document.getElementById("info-modal").style.display = "block";
            document.getElementById("modal-backdrop").style.display = "block";
            document.getElementById("modal-backdrop").addEventListener("click", closeModal);
        })
        .catch(error => {
            console.error("Error fetching user details:", error);
            // Removed the alert here
        });
}

function closeModal() {
    document.getElementById("info-modal").style.display = "none";
    document.getElementById("modal-backdrop").style.display = "none";
    
}




// Function to filter primary users based on input text and selected category
function filterPrimaryUsers(filterValue, selectedCategory) {
    
    const listItems = document.querySelectorAll("#primary-users-list li");
    
    
    listItems.forEach(item => {
        const textContent = item.textContent.toLowerCase(); // Convert text content to lowercase for case-insensitive comparison
        
        // Check if item matches the input text filter
        const matchesFilterValue = textContent.includes(filterValue);
        
        // Check if item matches the selected category
        let matchesCategory;
        if (selectedCategory === "") {
            matchesCategory = true; // Show all if no category is selected
        } else {
            matchesCategory = textContent.includes(selectedCategory.toLowerCase()); // Compare against selected category
        }

        // Show item only if it matches both filters
        if (matchesFilterValue && matchesCategory) {
            item.style.display = ""; // Show the list item
        } else {
            item.style.display = "none"; // Hide the list item
        }
    });
}

// Function to handle the "Approve" (tick) symbol click
function handleApprove(secondaryUserId, primaryUserId, primaryUserEmail) {
    // Atomically update both user records to prevent race conditions
    database.ref().update({
        [`users/${secondaryUserId}/coupledWith`]: primaryUserId,
        [`users/${primaryUserId}/coupledWith`]: secondaryUserId
    })
      .then(() => {
          showCouplesSection(secondaryUserId); // Show couples section after approval
          document.querySelector(".primary-users-section").style.display = "none"; // Hide primary users list

          // Check if the primary user is logged in
          database.ref(`users/${primaryUserId}`).once('value')
              .then((snapshot) => {
                  if (snapshot.val().loggedIn) {
                      alert(`Notification: ${auth.currentUser.email} has selected you!`);
                  }
              })
              .catch(handleFirebaseError);
      })
      .catch(handleFirebaseError);
}

// Function to display the couples section
function showCouplesSection(userId) {
    document.querySelector(".couples-section").style.display = "block";
    document.querySelector("#couples-list").innerHTML = "";

    database.ref(`users/${userId}/coupledWith`).once('value')
      .then((snapshot) => {
          const coupledWithId = snapshot.val();
          if (coupledWithId) {
              // Fetch both users' data
              const currentUserEmail = auth.currentUser.email;
              database.ref(`users/${coupledWithId}`).once('value')
                  .then((coupledSnapshot) => {
                      const coupledUser = coupledSnapshot.val();
                      addCoupleToList(
                          currentUserEmail,
                          coupledUser.email,
                          coupledWithId  // Pass the coupled user's ID
                      );
                  })
                  .catch(handleFirebaseError);
          }
      })
      .catch(handleFirebaseError);
}




// New helper function to add couples to list
function addCoupleToList(currentUserEmail, coupledEmail, coupledUserId) {
    const li = document.createElement("li");
    const infoIcon = document.createElement("span");
    
    
    // Create text node
    const textNode = document.createTextNode(`${currentUserEmail} with ${coupledEmail} `);
    
    // Create info icon
    infoIcon.className = "info-icon";
    infoIcon.innerHTML = "&#9432";
    infoIcon.dataset.userId = coupledUserId;
    infoIcon.onclick = showUserDetails;

    

    li.appendChild(textNode);
    li.appendChild(infoIcon);
    
    document.querySelector("#couples-list").appendChild(li);
}




// Function to listen for changes in coupledWith field
function listenForChanges(primaryUserId) {
    database.ref(`users/${primaryUserId}/coupledWith`).on('value', (snapshot) => {
        if (snapshot.val()) {
            alert(`Notification: You have been selected by ${auth.currentUser.email}!`);
            showCouplesSection(primaryUserId);
        }
    });
}


