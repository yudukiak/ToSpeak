import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// .envファイルを読み込む
const envPath = join(rootDir, '.env');
config({ path: envPath });

// package.jsonからバージョンを読み込む
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

// RELEASE_NOTES_TEMPLATE.mdからリリースノートを生成
const templatePath = join(rootDir, '.github', 'RELEASE_NOTES_TEMPLATE.md');
const template = readFileSync(templatePath, 'utf-8');
let releaseNotes = template
  .replace(/\$\{version\}/g, version)
  .replace(/\$\{productName\}/g, packageJson.productName || 'ToSpeak');

// タイトルを抽出（最初の行の`# `を削除、またはデフォルトで`v${version}`を使用）
let releaseTitle = `v${version}`;
const lines = releaseNotes.split('\n');
if (lines[0] && lines[0].startsWith('# ')) {
  releaseTitle = lines[0].substring(2).trim();
  // 本文からタイトル行を削除（最初の行と空行を削除）
  releaseNotes = lines.slice(2).join('\n');
}

// GitHubトークンを取得
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error('❌ GITHUB_TOKENまたはGH_TOKENが設定されていません');
  process.exit(1);
}

const owner = 'yudukiak';
const repo = 'ToSpeak';
const tag = `v${version}`;

// GitHub APIでリリースを取得
const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
const updateReleaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

console.log(`📝 GitHub Releaseのリリースノートを更新中: ${tag}`);

try {
  // ドラフトを含む、全リリースを取得
  const getResponse = await fetch(releasesUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!getResponse.ok) {
    throw new Error(`リリースの取得に失敗しました: ${getResponse.status} ${getResponse.statusText}`);
  }

  const releases = await getResponse.json();
  console.log("releases", releases);
  
  // ドラフトを含む、タグ名でリリースを検索
  const release = releases.find(r => r.tag_name === tag);
  
  if (!release) {
    // 編集時にTagが変わるので注意
    console.error(`❌ リリースが見つかりません: ${tag}`);
    console.error(`💡 electron-builderがリリースを作成するまで待ってから実行してください`);
    console.error(`💡 または、GitHub上で手動でリリースを作成してください`);
    process.exit(1);
  }

  const releaseId = release.id;

  // リリースノートを更新
  const updateResponse = await fetch(`${updateReleaseUrl}/${releaseId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: releaseTitle,
      body: releaseNotes,
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`リリースノートの更新に失敗しました: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
  }

  console.log(`✅ GitHub Releaseのリリースノートを更新しました: ${tag}`);
  console.log(`🔗 https://github.com/${owner}/${repo}/releases/tag/${tag}`);
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

