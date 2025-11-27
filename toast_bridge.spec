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
        'e2k',
        'e2k.models',
        'e2k.inference',
        'numpy',
        'numpy.core',
        'numpy.core.multiarray',
        'numpy.core._multiarray_umath',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

# e2kパッケージのデータファイルとサブモジュールを収集
from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import os

try:
    # e2kパッケージをインポートしてパスを取得
    import e2k
    e2k_path = os.path.dirname(e2k.__file__)
    e2k_parent = os.path.dirname(e2k_path)
    
    # e2kパッケージ全体をデータファイルとして追加
    # importlib.resourcesが正しく動作するように、パッケージ構造を保持
    # e2kパッケージディレクトリ全体を追加（modelsディレクトリを含む）
    for root, dirs, files in os.walk(e2k_path):
        # __pycache__ディレクトリは除外
        dirs[:] = [d for d in dirs if d != '__pycache__']
        
        for file in files:
            # .pycファイルは除外
            if file.endswith('.pyc'):
                continue
                
            src_file = os.path.join(root, file)
            # 相対パスを計算（e2k/... の形式）
            rel_path = os.path.relpath(src_file, e2k_parent)
            # TOC形式: (dest_name, src_name, 'DATA')
            # dest_nameは e2k/... の形式で、パッケージ構造を保持
            # Windowsのパス区切り文字をスラッシュに変換
            dest_name = rel_path.replace(os.sep, '/')
            a.datas.append((dest_name, src_file, 'DATA'))
    
    # サブモジュールを追加
    e2k_submodules = collect_submodules('e2k')
    if e2k_submodules:
        a.hiddenimports.extend(e2k_submodules)
        
    e2k_data_count = len([d for d in a.datas if isinstance(d, tuple) and len(d) >= 2 and 'e2k' in str(d[0])])
    print(f"INFO: Added {e2k_data_count} e2k data files")
except Exception as e:
    # エラーが発生した場合は警告を出して続行
    import traceback
    print(f"Warning: Failed to collect e2k files: {e}")
    traceback.print_exc()

# numpyはPyInstallerの標準フックで自動処理されるため、
# hiddenimportsに追加するだけで十分です。
# collect_allを使うと、バイナリファイルの抽出に問題が発生する可能性があります。

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='toast_bridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPXはWindowsで問題を起こすことがあるため無効化
    console=True,  # コンソールウィンドウを表示（spawnで実行するため）
)
