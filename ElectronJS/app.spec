# -*- mode: python ; coding: utf-8 -*-
import os

project_dir = os.path.abspath('.')

a = Analysis(
    ['app.py'],
    pathex=[project_dir],
    binaries=[],
    datas=[
        (os.path.join('ui', ''), 'ui'),
        (os.path.join('dictionaries', ''), 'dictionaries'),
        # Uncomment if you have these folders:
        # (os.path.join('templates', ''), 'templates'),
        # (os.path.join('static', ''), 'static'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='GirminTok',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Set to False for production if you don't want a terminal window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)