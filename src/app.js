// ----------------------------------------
// 1. Prevent iOS pinch-zoom via JS (Optional)
// ----------------------------------------
document.addEventListener('gesturestart', function (e) {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturechange', function (e) {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('gestureend', function (e) {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}, { passive: false });

// ----------------------------------------
// 2. Firebase Imports & Initialization
// ----------------------------------------
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  query,
  orderByChild,
  equalTo,
  push
} from "firebase/database";

// Firebase configuration with your credentials
const firebaseConfig = {
  apiKey: "AIzaSyDWMkL3P7OWlosSFXXRg8gvUQg6-7Y9uu8",
  authDomain: "esp32door-control.firebaseapp.com",
  databaseURL: "https://esp32door-control-default-rtdb.firebaseio.com/",
  projectId: "esp32door-control",
  storageBucket: "esp32door-control.appspot.com",
  messagingSenderId: "605127991992",
  appId: "1:605127991992:web:4d0dccf6ae2d874603ca4d",
  measurementId: "G-91SJ3GLZ0Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ----------------------------------------
// 3. Global Variables: Device Token & Device ID
// ----------------------------------------
let deviceToken = '';
let deviceId = null; // Will store the device node key from /devices

// ----------------------------------------
// 4. Firebase Auth & DB Helper Functions
// ----------------------------------------
export function registerUser(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}

export function onAuthStateChangedListener(callback) {
  return onAuthStateChanged(auth, callback);
}

export function writeData(path, data) {
  const dataRef = ref(db, path);
  return set(dataRef, data);
}

export function readData(path) {
  const dataRef = ref(db, path);
  return get(dataRef);
}

export function onDataChangeListener(path, callback) {
  const dataRef = ref(db, path);
  return onValue(dataRef, callback);
}

// ----------------------------------------
// 5. DOM Elements
// ----------------------------------------
const appContainer    = document.getElementById('appContainer');
const containerEl     = document.getElementById('containerEl'); // <-- Using ID instead of querySelector
const authSection     = document.getElementById('authSection');
const controlSection  = document.getElementById('controlSection');
const emailInput      = document.getElementById('email');
const passwordInput   = document.getElementById('password');
const registerBtn     = document.getElementById('registerBtn');
const loginBtn        = document.getElementById('loginBtn');
const logoutBtn       = document.getElementById('logoutBtn');
const toggleDoorBtn1  = document.getElementById('toggleDoor1');
const toggleDoorBtn2  = document.getElementById('toggleDoor2');
const tokenDisplay    = document.getElementById('token');
const welcomeTitle    = document.getElementById('welcomeTitle');

// ----------------------------------------
// 6. Translation Loading & Application
// ----------------------------------------
let translations = {};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`translations/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Translation file not found for: ${lang}`);
    }
    translations = await response.json();
    applyTranslations();
  } catch (error) {
    console.error("Error loading translations:", error);
    if (lang !== "en") {
      loadTranslations("en"); // Fallback to English if needed
    }
  }
}

function applyTranslations() {
  if (welcomeTitle) welcomeTitle.textContent = translations.welcomeTitle || "Welcome to the future";
  if (emailInput) emailInput.placeholder = translations.emailPlaceholder || "Email";
  if (passwordInput) passwordInput.placeholder = translations.passwordPlaceholder || "Password";
  if (registerBtn) registerBtn.textContent = translations.registerBtn || "Register";
  if (loginBtn) loginBtn.textContent = translations.loginBtn || "Go";
  if (toggleDoorBtn1) toggleDoorBtn1.textContent = translations.toggleDoor1 || "Toggle Door 1";
  if (toggleDoorBtn2) toggleDoorBtn2.textContent = translations.toggleDoor2 || "Toggle Door 2";
  if (logoutBtn) logoutBtn.textContent = translations.logoutBtn || "Logout";
  // Update token label if tokenDisplay's parent has a text node for the label
  if (tokenDisplay && tokenDisplay.parentNode) {
    const parent = tokenDisplay.parentNode;
    if (parent.childNodes[0] && parent.childNodes[0].nodeType === Node.TEXT_NODE) {
      parent.childNodes[0].textContent = translations.tokenLabel || "Your Token: ";
    }
  }
  // If deviceToken is already set (user is logged in), update door status buttons
  if (deviceToken) {
    updateToggleButtons();
  }
}

// Detect user language (using two-letter code) and load translations.
const userLanguage = navigator.language ? navigator.language.split("-")[0] : "en";
loadTranslations(userLanguage);

// ----------------------------------------
// 7. Helper Function: Generate Random Token
// ----------------------------------------
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ----------------------------------------
// 8. Check/Create Device Token for User
// ----------------------------------------
async function checkAndGenerateToken() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userTokenRef = ref(db, `users/${user.uid}/deviceToken`);
    const snapshot = await get(userTokenRef);
    if (snapshot.exists()) {
      deviceToken = snapshot.val();
      console.log("Token already exists:", deviceToken);
    } else {
      deviceToken = generateToken();
      await set(userTokenRef, deviceToken);
      console.log("New token generated and saved:", deviceToken);
    }
    tokenDisplay.textContent = deviceToken;
  } catch (error) {
    console.error("Error checking or saving token:", error);
    alert("Error generating token. Please try again.");
  }
}

// ----------------------------------------
// 9. Load or Create Device Node for Sharing
// ----------------------------------------
async function loadDevice() {
  if (!deviceToken) return;
  const devicesRef = ref(db, 'devices');
  // Query for a device node with deviceToken matching the user's token
  const deviceQuery = query(devicesRef, orderByChild('deviceToken'), equalTo(deviceToken));
  const snapshot = await get(deviceQuery);
  if (snapshot.exists()) {
    // If found, use the first matching device node's key.
    snapshot.forEach((childSnapshot) => {
      deviceId = childSnapshot.key;
      console.log("Device found:", deviceId);
    });
  } else {
    // If not found, create a new device node.
    const newDeviceRef = push(devicesRef);
    deviceId = newDeviceRef.key;
    await set(newDeviceRef, {
      deviceToken: deviceToken,
      door1Status: { status: 'closed' },
      door2Status: { status: 'closed' }
    });
    console.log("New device created:", deviceId);
  }
}

// ----------------------------------------
// 10. Update Toggle Buttons (Door Status)
// ----------------------------------------
async function updateToggleButtons() {
  if (deviceId) {
    await updateToggleButton(toggleDoorBtn1, 'door1Status');
    await updateToggleButton(toggleDoorBtn2, 'door2Status');
  }
}

async function updateToggleButton(buttonElement, doorStatusKey) {
  if (!deviceId) return;
  const doorStatusRef = ref(db, `devices/${deviceId}/${doorStatusKey}`);
  const snapshot = await get(doorStatusRef);
  let currentStatus = 'closed'; // Default
  if (snapshot.exists()) {
    currentStatus = snapshot.val().status;
  } else {
    // If no status exists, initialize it to "closed"
    await set(doorStatusRef, { status: 'closed' });
  }
  buttonElement.textContent = (currentStatus === 'open')
    ? (translations.doorOpen || 'Open')
    : (translations.doorClosed || 'Closed');
  buttonElement.classList.toggle('closed', currentStatus === 'closed');
  buttonElement.classList.toggle('open', currentStatus === 'open');
}

// ----------------------------------------
// 11. Toggle Door Status (on button click)
// ----------------------------------------
async function toggleDoorStatus(buttonElement, doorStatusKey) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to send commands.");
    return;
  }
  if (!deviceId) {
    console.error("Device not found for user.");
    alert("Device not found. Please log out and log in again.");
    return;
  }
  try {
    const doorStatusRef = ref(db, `devices/${deviceId}/${doorStatusKey}`);
    const statusSnapshot = await get(doorStatusRef);
    let newStatus = 'open';
    if (statusSnapshot.exists()) {
      const currentStatus = statusSnapshot.val().status;
      newStatus = (currentStatus === 'open') ? 'closed' : 'open';
    }
    await set(doorStatusRef, { status: newStatus });
    buttonElement.textContent = (newStatus === 'open')
      ? (translations.doorOpen || 'Open')
      : (translations.doorClosed || 'Closed');
    buttonElement.classList.toggle('closed', newStatus === 'closed');
    buttonElement.classList.toggle('open', newStatus === 'open');
    alert(`${translations.doorStatusAlertPrefix || "Door is now"} ${newStatus === 'open' ? (translations.doorOpen || 'Open') : (translations.doorClosed || 'Closed')}`);
  } catch (error) {
    console.error("Error toggling door status:", error);
  }
}

// ----------------------------------------
// 12. Listen for Real-Time Updates to Door Status
// ----------------------------------------
function listenToDoorStatuses() {
  if (deviceId) {
    listenToDoorStatus(toggleDoorBtn1, 'door1Status');
    listenToDoorStatus(toggleDoorBtn2, 'door2Status');
  }
}

function listenToDoorStatus(buttonElement, doorStatusKey) {
  if (!deviceId) return;
  const doorStatusRef = ref(db, `devices/${deviceId}/${doorStatusKey}`);
  onValue(doorStatusRef, (snapshot) => {
    if (snapshot.exists()) {
      const status = snapshot.val().status;
      buttonElement.textContent = (status === 'open')
        ? (translations.doorOpen || 'Open')
        : (translations.doorClosed || 'Closed');
      buttonElement.classList.toggle('closed', status === 'closed');
      buttonElement.classList.toggle('open', status === 'open');
    }
  });
}

// ----------------------------------------
// 13. Event Listeners (Register, Login, etc.)
// ----------------------------------------
registerBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => console.log('Registered successfully'))
    .catch(error => console.error("Registration error:", error.message));
});

loginBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => console.log('Logged in successfully'))
    .catch(error => console.error("Login error:", error.message));
});

logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => {
      console.log('Logged out');
      tokenDisplay.textContent = ''; // Clear token on logout
      // Optionally, reset deviceId to force reloading on next login:
      deviceId = null;
    });
});

toggleDoorBtn1.addEventListener('click', () => {
  toggleDoorStatus(toggleDoorBtn1, 'door1Status');
});

toggleDoorBtn2.addEventListener('click', () => {
  toggleDoorStatus(toggleDoorBtn2, 'door2Status');
});

// ----------------------------------------
// 14. Auth State Change: Show/Hide Sections, then Fade In the Container
// ----------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    authSection.style.display = 'none';
    controlSection.style.display = 'block';
    welcomeTitle.style.display = 'none';
    containerEl.classList.add('logged-in'); // e.g., remove container shadow on desktop if needed
    await checkAndGenerateToken();
    await loadDevice();
    await updateToggleButtons();
    listenToDoorStatuses();
  } else {
    console.log("User is not logged in.");
    authSection.style.display = 'flex';
    controlSection.style.display = 'none';
    welcomeTitle.style.display = 'block';
    tokenDisplay.textContent = '';
    containerEl.classList.remove('logged-in');
  }
  appContainer.classList.add('fade-in'); // Fade in the container once auth state is determined
});
