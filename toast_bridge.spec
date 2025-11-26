# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['python/toast_bridge.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'winsdk',
        'winsdk.windows.ui.notifications.management',
        'winsdk.windows.ui.notifications',
        'win32com.client',
        'pythoncom',
        'asyncio',
        'json',
        'sys',
        'io',
        'os',
        'datetime',
    ],
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
    name='toast_bridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPXはWindowsで問題を起こすことがあるため無効化
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # コンソールウィンドウを表示（spawnで実行するため）
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
