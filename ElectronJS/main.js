
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let backendProcess = null;



function getBackendPath() {
  // In production, app.exe is in the resources folder, not dist
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.exe');
  }
  // In development, it's in dist
  return path.join(__dirname, 'dist', 'app.exe');
}

function startBackend() {
  const exePath = getBackendPath();
  backendProcess = spawn(exePath, [], { stdio: 'ignore', detached: true });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('http://localhost:5000');

  // Ensure the window closes and the backend stops
  win.on('closed', () => {
    stopBackend();
    app.quit();
  });
}

app.whenReady().then(() => {
  startBackend();
  // Wait a moment for backend to start
  setTimeout(createWindow, 2000);
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  stopBackend();
});
