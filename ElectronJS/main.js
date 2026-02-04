const { ipcMain, shell } = require('electron');

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});
ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
// Handle open-external-link from renderer
ipcMain.on('open-external-link', (event, url) => {
    if (url) shell.openExternal(url);
});
const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let windowCreated = false;
let backendProcess = null;


// Set to true for development, false for production/release
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
const BACKEND_PORT = 5000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
// In production, girmintok.exe should be in resources/app or resources/ depending on packager
const BACKEND_EXE = isDev ? 'python' : path.join(process.resourcesPath, 'girmintok.exe');
const BACKEND_SCRIPT = 'app.py';

function startBackend() {
    console.log('[Electron] Starting backend...');
    console.log(`[Electron] isDev: ${isDev}`);
    console.log(`[Electron] Backend exe: ${BACKEND_EXE}`);
    console.log(`[Electron] Backend script: ${BACKEND_SCRIPT}`);
    console.log(`[Electron] Backend cwd: ${__dirname}`);
    let spawnOpts;
    if (isDev) {
        spawnOpts = {
            cwd: __dirname,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true
        };
        backendProcess = spawn(BACKEND_EXE, [BACKEND_SCRIPT], spawnOpts);
    } else {
        // In production, girmintok.exe is in resourcesPath
        spawnOpts = {
            cwd: process.resourcesPath,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true
        };
        backendProcess = spawn(BACKEND_EXE, [], spawnOpts);
    }
    if (backendProcess) {
        backendProcess.unref();
        if (backendProcess.stdout) {
            backendProcess.stdout.on('data', (data) => {
                console.log(`[Backend stdout]: ${data.toString()}`);
            });
        }
        if (backendProcess.stderr) {
            backendProcess.stderr.on('data', (data) => {
                console.error(`[Backend stderr]: ${data.toString()}`);
            });
        }
        backendProcess.on('error', (err) => {
            console.error('[Electron] Backend process error:', err);
        });
        backendProcess.on('exit', (code, signal) => {
            console.log(`[Electron] Backend process exited with code ${code}, signal ${signal}`);
        });
    } else {
        console.error('[Electron] Failed to spawn backend process!');
    }
}

function stopBackend() {
    if (backendProcess) {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
            } else {
                backendProcess.kill();
            }
        } catch (e) {
            // ignore
        }
    }
}

function createWindow() {
    if (windowCreated) return;
    windowCreated = true;
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.loadURL(BACKEND_URL);
}

function waitForFlask(retries = 30) {
    const http = require('http');
    const tryConnect = () => {
        console.log(`[Electron] Attempting to connect to Flask backend at ${BACKEND_URL} (retries left: ${retries})`);
        http.get(BACKEND_URL, res => {
            if (res.statusCode === 200) {
                console.log('[Electron] Flask backend is up!');
                createWindow();
            } else {
                console.warn(`[Electron] Unexpected status code from backend: ${res.statusCode}`);
                retry();
            }
        }).on('error', (err) => {
            console.warn(`[Electron] Error connecting to backend: ${err.message}`);
            retry();
        });
    };
    const retry = () => {
        if (!windowCreated && retries > 0) {
            setTimeout(() => {
                waitForFlask(retries - 1);
            }, 500);
        } else if (!windowCreated) {
            console.error('[Electron] Failed to start backend server after multiple attempts.');
            dialog.showErrorBox('Error', 'Failed to start backend server.');
            app.quit();
        }
    };
    tryConnect();
}

function setAppMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.on('ready', () => {
    startBackend();
    waitForFlask();
    setAppMenu();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopBackend();
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
