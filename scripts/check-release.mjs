#!/usr/bin/env node
// 发布前检查：Git 已跟踪文件、提交历史、构建产物中不得出现真实数据或高权限密钥。
// 用法：npm run check:release      （发现问题时退出码为 1）
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SELF = 'scripts/check-release.mjs';
const problems = [];

const FORBIDDEN_PATH = [
  [/^local-data\//, '本地真实数据目录'],
  [/^feishu-export\//, '飞书导出目录'],
  [/\.(xlsx|xlsm|xls)$/i, 'Excel 原始文件'],
  [/(^|\/)\.env(\..+)?$/, '环境变量文件'],
];
const ALLOWED_PATH = [/(^|\/)\.env\.example$/];

const CONTENT_RULES = [
  [/sb_secret_[A-Za-z0-9_-]{8,}/, 'Supabase secret key'],
  [/SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['"]?[A-Za-z0-9._-]{20,}/, 'service_role key 赋值'],
  [/\bAPP-\d{4}\b/, '真实投递记录编号（APP-xxxx）'],
  [/file:\/\/\/C:\/Users\//i, '本机文件路径（来自真实数据）'],
  [/"kind"\s*:\s*"job-tracker-export"[\s\S]*"sourceRefs"\s*:\s*\[\s*\{\s*"source"\s*:\s*"excel"/, '从 Excel 整理的真实数据导出'],
];

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.role;
  } catch {
    return null;
  }
}

function scanText(text, where) {
  for (const [re, label] of CONTENT_RULES) if (re.test(text)) problems.push(`${where}：发现${label}`);
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    if (jwtRole(m[0]) === 'service_role') problems.push(`${where}：发现 service_role JWT`);
  }
}

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
const isGit = (() => {
  try {
    sh('git rev-parse --is-inside-work-tree');
    return true;
  } catch {
    return false;
  }
})();

// 1) Git 已跟踪文件
if (isGit) {
  const files = sh('git ls-files -z').split('\0').filter(Boolean);
  for (const f of files) {
    if (ALLOWED_PATH.some((re) => re.test(f))) continue;
    for (const [re, label] of FORBIDDEN_PATH) if (re.test(f)) problems.push(`已跟踪文件 ${f}：${label}不应进入仓库`);
    if (f === SELF || !existsSync(f) || statSync(f).size > 5 * 1024 * 1024) continue;
    scanText(readFileSync(f, 'utf8'), `已跟踪文件 ${f}`);
  }
  // 2) 提交历史（所有分支）
  const names = sh('git log --all --name-only --pretty=format:').split('\n').filter(Boolean);
  for (const f of new Set(names)) {
    if (ALLOWED_PATH.some((re) => re.test(f))) continue;
    for (const [re, label] of FORBIDDEN_PATH) if (re.test(f)) problems.push(`提交历史中出现过 ${f}：${label}`);
  }
  let log = '';
  try {
    log = sh(`git log --all -p --no-color -- . ":(exclude)${SELF}"`);
  } catch {
    /* 尚无提交 */
  }
  scanText(log, '提交历史');
} else {
  console.warn('⚠ 当前目录不是 Git 仓库，跳过已跟踪文件与提交历史检查。');
}

// 3) 构建产物
function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p);
    else {
      const rel = relative('.', p).replace(/\\/g, '/');
      for (const [re, label] of FORBIDDEN_PATH) if (re.test(rel.replace(/^dist\//, ''))) problems.push(`构建产物 ${rel}：${label}`);
      if (/\.(js|css|html|json|txt|map|csv)$/i.test(n)) scanText(readFileSync(p, 'utf8'), `构建产物 ${rel}`);
    }
  }
}
if (existsSync('dist')) walk('dist');
else console.warn('⚠ 没有 dist/，跳过构建产物检查（先运行 npm run build）。');

const uniq = [...new Set(problems)];
if (uniq.length) {
  console.error('✖ 发布检查未通过，请暂停发布并处理：');
  uniq.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('✔ 发布检查通过：未发现真实数据或高权限密钥。');
