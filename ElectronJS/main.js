const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let splash = null;
let backendProcess = null;

const isDev = process.env.NODE_ENV === 'development';
const BACKEND_PORT = 5000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const BACKEND_EXE = isDev ? 'python' : path.join(process.resourcesPath, 'GirminTok.exe');
const BACKEND_SCRIPT = 'app.py';

function startBackend() {
    if (isDev) {
        backendProcess = spawn(BACKEND_EXE, [BACKEND_SCRIPT], {
            cwd: __dirname,
            shell: true,
            stdio: 'ignore',
            detached: true
        });
    } else {
        backendProcess = spawn(BACKEND_EXE, [], {
            cwd: process.resourcesPath,
            shell: true,
            stdio: 'ignore',
            detached: true
        });
    }
    if (backendProcess) backendProcess.unref();
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
        if (splash) splash.close();
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.loadURL(BACKEND_URL);
}

function showSplash() {
    splash = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        resizable: false
    });
    splash.loadFile(path.join(__dirname, 'ui', 'welcome.html'));
}

function waitForFlask(retries = 30) {
    const http = require('http');
    const tryConnect = () => {
        http.get(BACKEND_URL, res => {
            if (res.statusCode === 200) {
                createWindow();
            } else {
                retry();
            }
        }).on('error', retry);
    };
    const retry = () => {
        if (retries > 0) {
            setTimeout(() => {
                waitForFlask(retries - 1);
            }, 500);
        } else {
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
    showSplash();
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
