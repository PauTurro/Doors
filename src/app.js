// Import necessary Firebase modules
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
  apiKey: "AIzaSyDWMkL3P7OWlosSFXXRg8gvUQg6-7Y9uu8", // Replace with your actual API key
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

// Example usage of Firebase functions for authentication
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

// Example usage of Firebase Realtime Database functions
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

// DOM elements
const authSection = document.getElementById('authSection');
const controlSection = document.getElementById('controlSection');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toggleDoorBtn1 = document.getElementById('toggleDoor1');
const toggleDoorBtn2 = document.getElementById('toggleDoor2');
const tokenDisplay = document.getElementById('token');
const welcomeTitle = document.getElementById('welcomeTitle');

// Variable to store the device token
let deviceToken = '';

// Helper function to generate a random token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Function to check and generate the device token
async function checkAndGenerateToken() {
  const user = auth.currentUser;
  if (user) {
    try {
      // Reference to the user's device token
      const userTokenRef = ref(db, `users/${user.uid}/deviceToken`);
      const snapshot = await get(userTokenRef);

      if (snapshot.exists()) {
        // If token already exists, use it
        deviceToken = snapshot.val();
        console.log("Token already exists:", deviceToken);
      } else {
        // If no token exists, generate a new one and save it
        deviceToken = generateToken();
        await set(userTokenRef, deviceToken);
        console.log("New token generated and saved:", deviceToken);
      }
      // Display the token
      tokenDisplay.textContent = deviceToken;
    } catch (error) {
      console.error("Error checking or saving token:", error);
      alert("Error generating token. Please try again.");
    }
  } else {
    alert("Please log in to generate a token.");
  }
}

// Function to update the toggle buttons based on door statuses
async function updateToggleButtons() {
  if (deviceToken) {
    // Update Door 1 Button
    await updateToggleButton(toggleDoorBtn1, 'door1Status');

    // Update Door 2 Button
    await updateToggleButton(toggleDoorBtn2, 'door2Status');
  }
}

// Helper function to update a single toggle button
async function updateToggleButton(buttonElement, doorStatusKey) {
  const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
  const snapshot = await get(doorStatusRef);

  let currentStatus = 'closed'; // Default status

  if (snapshot.exists()) {
    currentStatus = snapshot.val().status;
  } else {
    // If no status exists, set it to 'closed' by default
    await set(doorStatusRef, { status: 'closed' });
  }

  // Update button text and class
  buttonElement.textContent = currentStatus === 'open' ? 'Open' : 'Closed';
  buttonElement.classList.toggle('closed', currentStatus === 'closed');
  buttonElement.classList.toggle('open', currentStatus === 'open');
}

// Function to toggle door status
async function toggleDoorStatus(buttonElement, doorStatusKey) {
  const user = auth.currentUser;
  if (user) {
    try {
      if (deviceToken) {
        console.log(`Toggling ${doorStatusKey} for device token: ${deviceToken}`);

        // Reference to the door status
        const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);

        // Get the current status
        const statusSnapshot = await get(doorStatusRef);
        let newStatus = 'open';

        if (statusSnapshot.exists()) {
          const currentStatus = statusSnapshot.val().status;
          // Toggle the status
          newStatus = currentStatus === 'open' ? 'closed' : 'open';
        }

        // Update the door status
        await set(doorStatusRef, { status: newStatus });

        // Update the button
        buttonElement.textContent = newStatus === 'open' ? 'Open' : 'Closed';
        buttonElement.classList.toggle('closed', newStatus === 'closed');
        buttonElement.classList.toggle('open', newStatus === 'open');

        alert(`Door is now ${newStatus}`);
      } else {
        console.error("Device token not found for user.");
        alert("Device token not found. Please log out and log in again.");
      }
    } catch (error) {
      console.error("Error toggling door status:", error);
    }
  } else {
    alert("Please log in to send commands.");
  }
}

// Event listeners
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

// Listen for real-time updates to the door statuses
function listenToDoorStatuses() {
  if (deviceToken) {
    // Listen to Door 1 Status
    listenToDoorStatus(toggleDoorBtn1, 'door1Status');

    // Listen to Door 2 Status
    listenToDoorStatus(toggleDoorBtn2, 'door2Status');
  }
}

// Helper function to listen to a single door status
function listenToDoorStatus(buttonElement, doorStatusKey) {
  const doorStatusRef = ref(db, `devices/${deviceToken}/${doorStatusKey}`);
  onValue(doorStatusRef, (snapshot) => {
    if (snapshot.exists()) {
      const status = snapshot.val().status;
      // Update button text and class
      buttonElement.textContent = status === 'open' ? 'Open' : 'Closed';
      buttonElement.classList.toggle('closed', status === 'closed');
      buttonElement.classList.toggle('open', status === 'open');
    }
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    console.log("User is logged in:", user.uid);
    authSection.style.display = 'none';
    controlSection.style.display = 'block';
    welcomeTitle.style.display = 'none'; // Hide the welcome title after login
    checkAndGenerateToken().then(() => {
      updateToggleButtons();
      listenToDoorStatuses();
    });
  } else {
    console.log("User is not logged in.");
    authSection.style.display = 'flex';
    controlSection.style.display = 'none';
    welcomeTitle.style.display = 'block'; // Show the welcome title when logged out
    tokenDisplay.textContent = ''; // Clear token display when logged out
  }
});
