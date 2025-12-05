import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// package.jsonからバージョンを読み込む
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

// テンプレートファイルを読み込む
const templatePath = join(rootDir, '.github', 'RELEASE_NOTES_TEMPLATE.md');
const template = readFileSync(templatePath, 'utf-8');

// バージョンを差し込む
const releaseNotes = template
  .replace(/\$\{version\}/g, version)
  .replace(/\$\{productName\}/g, packageJson.productName || 'ToSpeak');

// リリースノートファイルを生成
const outputPath = join(rootDir, 'RELEASE_NOTES.md');
writeFileSync(outputPath, releaseNotes, 'utf-8');

console.log(`✅ リリースノートを生成しました: v${version}`);
console.log(`📝 ファイル: ${outputPath}`);

