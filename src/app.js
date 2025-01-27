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
  onValue
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
// 3. Firebase Auth & DB Helper Functions
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
// 4. DOM Elements
// ----------------------------------------

// NOTE: Make sure your HTML has: <div class="container" id="containerEl">...</div>
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

// Variable to store the device token
let deviceToken = '';

// ----------------------------------------
// 5. Helper Function: Generate Random Token
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
// 6. Check/Create Device Token for User
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
// 7. Update Toggle Buttons
// ----------------------------------------
async function updateToggleButtons() {
  if (deviceToken) {
    await updateToggleButton(toggleDoorBtn1, 'door1Status');
    await updateToggleButton(toggleDoorBtn2, 'door2Status');
  }
}

async function updateToggleButton(buttonElement, doorStatusKey) {
  const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
  const snapshot = await get(doorStatusRef);

  let currentStatus = 'closed'; // Default
  if (snapshot.exists()) {
    currentStatus = snapshot.val().status;
  } else {
    // If no status, set "closed"
    await set(doorStatusRef, { status: 'closed' });
  }

  buttonElement.textContent = (currentStatus === 'open') ? 'Open' : 'Closed';
  buttonElement.classList.toggle('closed', currentStatus === 'closed');
  buttonElement.classList.toggle('open', currentStatus === 'open');
}

// ----------------------------------------
// 8. Toggle Door Status
// ----------------------------------------
async function toggleDoorStatus(buttonElement, doorStatusKey) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to send commands.");
    return;
  }

  if (!deviceToken) {
    console.error("Device token not found for user.");
    alert("Device token not found. Please log out and log in again.");
    return;
  }

  try {
    const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
    const statusSnapshot = await get(doorStatusRef);

    let newStatus = 'open';
    if (statusSnapshot.exists()) {
      const currentStatus = statusSnapshot.val().status;
      newStatus = (currentStatus === 'open') ? 'closed' : 'open';
    }

    await set(doorStatusRef, { status: newStatus });
    buttonElement.textContent = (newStatus === 'open') ? 'Open' : 'Closed';
    buttonElement.classList.toggle('closed', newStatus === 'closed');
    buttonElement.classList.toggle('open', newStatus === 'open');

    alert(`Door is now ${newStatus}`);
  } catch (error) {
    console.error("Error toggling door status:", error);
  }
}

// ----------------------------------------
// 9. Event Listeners (Register, Login, etc.)
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
    });
});

toggleDoorBtn1.addEventListener('click', () => {
  toggleDoorStatus(toggleDoorBtn1, 'door1Status');
});

toggleDoorBtn2.addEventListener('click', () => {
  toggleDoorStatus(toggleDoorBtn2, 'door2Status');
});

// ----------------------------------------
// 10. Listen for Real-Time Updates to Door Status
// ----------------------------------------
function listenToDoorStatuses() {
  if (deviceToken) {
    listenToDoorStatus(toggleDoorBtn1, 'door1Status');
    listenToDoorStatus(toggleDoorBtn2, 'door2Status');
  }
}

function listenToDoorStatus(buttonElement, doorStatusKey) {
  const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
  onValue(doorStatusRef, (snapshot) => {
    if (snapshot.exists()) {
      const status = snapshot.val().status;
      buttonElement.textContent = (status === 'open') ? 'Open' : 'Closed';
      buttonElement.classList.toggle('closed', status === 'closed');
      buttonElement.classList.toggle('open', status === 'open');
    }
  });
}

// ----------------------------------------
// 11. Auth State Change: Show/Hide Sections
//     Then Fade In the Whole Container
// ----------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    authSection.style.display = 'none';
    controlSection.style.display = 'block';
    welcomeTitle.style.display = 'none';

    // -- Add .logged-in (remove container shadow on desktop, if CSS uses .logged-in)
    containerEl.classList.add('logged-in');

    // Setup the user environment
    await checkAndGenerateToken();
    await updateToggleButtons();
    listenToDoorStatuses();
  } else {
    console.log("User is not logged in.");
    authSection.style.display = 'flex';
    controlSection.style.display = 'none';
    welcomeTitle.style.display = 'block';
    tokenDisplay.textContent = '';

    // -- Remove .logged-in so shadow is visible on login screen
    containerEl.classList.remove('logged-in');
  }

  // Fade in the container once auth state is determined
  appContainer.classList.add('fade-in');
});
