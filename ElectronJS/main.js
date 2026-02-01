
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let backendProcess = null;




function getBackendPath() {
  // In production, app.exe is in the resources folder
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.exe');
  }
  // In development, use the PyInstaller build output
  return path.join(__dirname, 'dist', 'app.exe');
}

function startBackend() {
  const exePath = getBackendPath();
  try {
    backendProcess = spawn(exePath, [], { stdio: 'ignore', detached: true });
    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
    });
    backendProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        console.error(`Backend exited with code ${code} and signal ${signal}`);
      }
    });
  } catch (err) {
    console.error('Exception while starting backend:', err);
  }
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
    icon: path.join(__dirname, 'ui', 'assets', 'logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('http://localhost:5000');

  // Create a custom menu with Help > User Guide
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'User Guide',
          click: () => {
            shell.openExternal('http://localhost:5000/user-guide.html');
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  // Ensure the window closes and the backend stops
  win.on('close', (e) => {
    stopBackend();
  });
}

app.whenReady().then(() => {
  startBackend();
  // Wait longer for backend to start (10 seconds)
  setTimeout(createWindow, 10000);
});



app.on('window-all-closed', () => {
  stopBackend();
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
