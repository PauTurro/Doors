/************************************************
 *           Firebase & App Logic
 ************************************************/
// 1. Import Firebase modules (make sure versions match your setup)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// 2. Firebase configuration (Use your real credentials)
const firebaseConfig = {
  apiKey: "AIzaSyD*************",
  authDomain: "esp32door-control.firebaseapp.com",
  databaseURL: "https://esp32door-control-default-rtdb.firebaseio.com/",
  projectId: "esp32door-control",
  storageBucket: "esp32door-control.appspot.com",
  messagingSenderId: "605127991992",
  appId: "1:605127991992:web:4d0dccf6ae2d874603ca4d",
  measurementId: "G-91SJ3GLZ0Z",
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/************************************************
 *            DOM Element References
 ************************************************/
const authSection     = document.getElementById("authSection");
const controlSection  = document.getElementById("controlSection");
const emailInput      = document.getElementById("email");
const passwordInput   = document.getElementById("password");
const registerBtn     = document.getElementById("registerBtn");
const loginBtn        = document.getElementById("loginBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const toggleDoorBtn1  = document.getElementById("toggleDoor1");
const toggleDoorBtn2  = document.getElementById("toggleDoor2");
const tokenDisplay    = document.getElementById("token");
const welcomeTitle    = document.getElementById("welcomeTitle");

let deviceToken = ""; // store the device token for the logged-in user

/************************************************
 *                  Routing
 ************************************************/
/**
 * handleRouteChange() determines what to show based on:
 *   - window.location.hash (e.g. #login or #control)
 *   - whether a user is logged in (auth.currentUser)
 */
function handleRouteChange() {
  const hash = window.location.hash.replace("#", ""); // e.g. "login" or "control"
  // Hide everything by default
  authSection.style.display = "none";
  controlSection.style.display = "none";
  welcomeTitle.style.display = "none";

  // Check if user is logged in
  const user = auth.currentUser;

  // If no hash, default to #login
  if (!hash) {
    window.location.hash = "#login";
    return;
  }

  // If user is not logged in but tries #control, redirect to #login
  if (!user && hash === "control") {
    window.location.hash = "#login";
    return;
  }

  // If user is logged in and tries #login, push to #control
  if (user && hash === "login") {
    window.location.hash = "#control";
    return;
  }

  // Show relevant sections
  switch (hash) {
    case "login":
      authSection.style.display = "flex";
      welcomeTitle.style.display = "block";
      break;
    case "control":
      controlSection.style.display = "block";
      break;
    default:
      // unknown route => go to #login
      window.location.hash = "#login";
      break;
  }
}

// Listen for changes in the URL hash
window.addEventListener("hashchange", handleRouteChange);

/************************************************
 *              Token & Door Helpers
 ************************************************/
// Generate a random 8-char token
function generateToken() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function checkAndGenerateToken() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userTokenRef = ref(db, `users/${user.uid}/deviceToken`);
    const snapshot = await get(userTokenRef);

    if (snapshot.exists()) {
      deviceToken = snapshot.val();
      console.log("Existing token:", deviceToken);
    } else {
      deviceToken = generateToken();
      await set(userTokenRef, deviceToken);
      console.log("New token generated:", deviceToken);
    }
    tokenDisplay.textContent = deviceToken;
  } catch (error) {
    console.error("Error generating token:", error);
    alert("Error generating token. Please try again.");
  }
}

async function updateToggleButtons() {
  if (!deviceToken) return;
  await updateToggleButton(toggleDoorBtn1, "door1Status");
  await updateToggleButton(toggleDoorBtn2, "door2Status");
}

async function updateToggleButton(buttonElement, doorStatusKey) {
  const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
  const snapshot = await get(doorStatusRef);

  let currentStatus = "closed"; // default
  if (snapshot.exists()) {
    currentStatus = snapshot.val().status;
  } else {
    // If no status in DB, set to "closed"
    await set(doorStatusRef, { status: "closed" });
  }

  // Update button text & styling
  buttonElement.textContent = currentStatus === "open" ? "Open" : "Closed";
  buttonElement.classList.toggle("closed", currentStatus === "closed");
  buttonElement.classList.toggle("open", currentStatus === "open");
}

function listenToDoorStatuses() {
  if (!deviceToken) return;
  listenToDoorStatus(toggleDoorBtn1, "door1Status");
  listenToDoorStatus(toggleDoorBtn2, "door2Status");
}

function listenToDoorStatus(buttonElement, doorStatusKey) {
  const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
  onValue(doorStatusRef, (snapshot) => {
    if (snapshot.exists()) {
      const status = snapshot.val().status;
      buttonElement.textContent = status === "open" ? "Open" : "Closed";
      buttonElement.classList.toggle("closed", status === "closed");
      buttonElement.classList.toggle("open", status === "open");
    }
  });
}

async function toggleDoorStatus(buttonElement, doorStatusKey) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in first.");
    return;
  }
  if (!deviceToken) {
    alert("No device token found. Please log out and log in again.");
    return;
  }

  try {
    const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
    const snapshot = await get(doorStatusRef);

    let newStatus = "open";
    if (snapshot.exists()) {
      const currentStatus = snapshot.val().status;
      newStatus = currentStatus === "open" ? "closed" : "open";
    }

    // Write new status
    await set(doorStatusRef, { status: newStatus });

    // Update UI
    buttonElement.textContent = newStatus === "open" ? "Open" : "Closed";
    buttonElement.classList.toggle("closed", newStatus === "closed");
    buttonElement.classList.toggle("open", newStatus === "open");

    alert("Door is now " + newStatus);
  } catch (error) {
    console.error("Error toggling door:", error);
  }
}

/************************************************
 *         Event Listeners (Auth / Toggle)
 ************************************************/
registerBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Registration successful! You can now log in.");
    })
    .catch((error) => {
      alert("Registration failed: " + error.message);
      console.error("Registration error:", error);
    });
});

loginBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      console.log("Logged in successfully");
      // Go to #control route
      window.location.hash = "#control";
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
      console.error("Login error:", error);
    });
});

logoutBtn.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      console.log("Logged out");
      tokenDisplay.textContent = "";
      // Return to #login route
      window.location.hash = "#login";
    })
    .catch((error) => {
      alert("Logout error: " + error.message);
      console.error("Logout error:", error);
    });
});

toggleDoorBtn1.addEventListener("click", () => {
  toggleDoorStatus(toggleDoorBtn1, "door1Status");
});
toggleDoorBtn2.addEventListener("click", () => {
  toggleDoorStatus(toggleDoorBtn2, "door2Status");
});

/************************************************
 *         Auth State Change
 ************************************************/
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    // Generate/check token
    checkAndGenerateToken().then(() => {
      // Update door buttons & start listening
      updateToggleButtons();
      listenToDoorStatuses();
    });

    // If we're currently on #login, push to #control
    if (window.location.hash === "#login") {
      window.location.hash = "#control";
    }
  } else {
    console.log("No user logged in.");
    deviceToken = "";
    tokenDisplay.textContent = "";

    // If we were on #control, push back to #login
    if (window.location.hash === "#control") {
      window.location.hash = "#login";
    }
  }

  // Always handle route after auth changes
  handleRouteChange();
});

// Initial route check on page load
handleRouteChange();
