// Initialize Firebase (Remember to replace placeholders with your actual config)
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

document.getElementById("auth-form").addEventListener("submit", (event) => {
  event.preventDefault();
  
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      fetchUserDetails(user.uid);
    })
    .catch((error) => {
      document.getElementById("error-message").innerText = error.message;
    });
});

function fetchUserDetails(userId) {
  database.ref(`users/${userId}`).once('value')
    .then((snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        // Display user details below each other
        document.getElementById("user-details").innerHTML = `
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Role:</strong> ${userData.role}</p>
          <p><strong>Locality:</strong> ${userData.category}</p>
          <p><strong>Branch:</strong> ${userData.Branch}</p>
          <p><strong>Academic Year:</strong> ${userData.year}</p>
          <p><strong>Mobile No.:</strong> ${userData.mobile}</p>
        `;
        document.querySelector(".user-details-section").style.display = "block";
        document.getElementById("delete-btn").style.display = "block"; // Show delete button
        document.getElementById("form-container").style.display = "none";
        
        // Add delete account functionality
        document.getElementById("delete-btn").onclick = () => deleteAccount(userId);
      } else {
        document.getElementById("error-message").innerText = "No user data found.";
      }
    })
    .catch((error) => {
      document.getElementById("error-message").innerText = error.message;
    });
}

function deleteAccount(userId) {
  // Delete user data from Realtime Database
  database.ref(`users/${userId}`).remove()
    .then(() => {
      // Now delete the user from Authentication
      auth.currentUser.delete()
        .then(() => {
          alert("Account deleted successfully!");
          location.reload(); // Reload the page after deletion
        })
        .catch((error) => {
          document.getElementById("error-message").innerText = error.message;
        });
    })
    .catch((error) => {
      document.getElementById("error-message").innerText = error.message;
    });
}
