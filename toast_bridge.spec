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

# package.jsonからバージョンと作者情報を取得
import json
from datetime import datetime

try:
    # specpathはPyInstallerが提供する変数（.specファイルのディレクトリパス）
    spec_dir = os.path.dirname(os.path.abspath(specpath)) if 'specpath' in globals() else os.path.dirname(os.path.abspath('toast_bridge.spec'))
    package_json_path = os.path.join(spec_dir, 'package.json')
    with open(package_json_path, 'r', encoding='utf-8') as f:
        package_data = json.load(f)
    
    version = package_data.get('version', '0.0.0')
    author = package_data.get('author', '')
    product_name = package_data.get('productName', 'ToSpeak')
    current_year = datetime.now().year
    
    # バージョンを数値のタプルに変換（例: "0.1.0" -> (0, 1, 0, 0)）
    version_parts = version.split('.')
    version_tuple = tuple(int(v) for v in version_parts[:4]) + (0,) * (4 - len(version_parts))
    if len(version_tuple) > 4:
        version_tuple = version_tuple[:4]
    
    # バージョン情報ファイルを生成
    version_file_content = f'''# UTF-8
#
# For more details about fixed file info 'ffi' see:
# http://msdn.microsoft.com/en-us/library/ms646997.aspx
VSVersionInfo(
  ffi=FixedFileInfo(
    filevers={version_tuple},
    prodvers={version_tuple},
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
  ),
  kids=[
    StringFileInfo(
      [
      StringTable(
        u'040904B0',
        [StringStruct(u'CompanyName', u'{author}'),
        StringStruct(u'FileDescription', u'{product_name} Bridge'),
        StringStruct(u'FileVersion', u'{version}'),
        StringStruct(u'InternalName', u'ToSpeak-Bridge'),
        StringStruct(u'LegalCopyright', u'Copyright © {current_year} {author}'),
        StringStruct(u'OriginalFilename', u'ToSpeak-Bridge.exe'),
        StringStruct(u'ProductName', u'{product_name}'),
        StringStruct(u'ProductVersion', u'{version}')])
      ]), 
    VarFileInfo([VarStruct(u'Translation', [1033, 1200])])
  ]
)
'''
    
    # バージョン情報ファイルをdist-pythonディレクトリに出力
    # dist-pythonディレクトリが存在しない場合は作成
    dist_python_dir = os.path.join(spec_dir, 'dist-python')
    os.makedirs(dist_python_dir, exist_ok=True)
    version_file_path = os.path.join(dist_python_dir, 'version.txt')
    with open(version_file_path, 'w', encoding='utf-8') as f:
        f.write(version_file_content)
    
    print(f"INFO: Generated version.txt with version {version}, copyright © {current_year} {author}")
except Exception as e:
    print(f"Warning: Failed to generate version.txt: {e}")
    version_file_path = None

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ToSpeak-Bridge',  # ToSpeakの子プロセスだと分かるように名前を変更
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPXはWindowsで問題を起こすことがあるため無効化
    console=True,  # コンソールウィンドウを表示（spawnで実行するため）
    icon='public/icon.png',  # アイコンを設定（PNGから自動変換される）
    version=version_file_path if 'version_file_path' in locals() and version_file_path else None,  # バージョン情報を設定
)
