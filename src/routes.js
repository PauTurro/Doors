
const appDiv = document.getElementById('app');

function navigateTo(route) {
  appDiv.innerHTML = '';
  switch (route) {
    case 'home':
      appDiv.innerHTML = '<h1>Welcome to the ESP32 Door Control PWA</h1>';
      break;
    case 'login':
      appDiv.innerHTML = `
        <h1>Login</h1>
        <input type="email" id="email" placeholder="Email" />
        <input type="password" id="password" placeholder="Password" />
        <button onclick="handleLogin()">Login</button>
      `;
      break;
    case 'control':
      appDiv.innerHTML = `
        <h1>Control Panel</h1>
        <button onclick="toggleDoor('door1')">Toggle Door 1</button>
        <button onclick="toggleDoor('door2')">Toggle Door 2</button>
      `;
      break;
    default:
      appDiv.innerHTML = '<h1>404 - Page Not Found</h1>';
  }
}

function handleLogin() {
  // Placeholder: Replace with real login logic
  alert('Logged in!');
}

function toggleDoor(door) {
  // Placeholder: Replace with real toggle logic
  alert(`Toggling ${door}`);
}

// Default route
navigateTo('home');
