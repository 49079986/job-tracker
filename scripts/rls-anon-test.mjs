#!/usr/bin/env node
// 权限复测：验证未登录访客（只有 publishable key）和未授权账号都无法读写记录。
//
// 用法（PowerShell）：
//   $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."; npm run test:rls
// 额外测试“已登录但未授权”的账号：再设置
//   $env:TEST_ACCESS_TOKEN="<另一个 GitHub 账号登录后的 access_token>"
//
// 脚本只会尝试写入一条虚构记录，并对所有行发起更新/删除请求；授权账号的令牌会被拒绝使用。

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.TEST_ACCESS_TOKEN;
if (!url || !key) {
  console.error('请设置 SUPABASE_URL 和 SUPABASE_PUBLISHABLE_KEY');
  process.exit(2);
}
if (/^sb_secret_/.test(key)) {
  console.error('这里只能用 publishable key');
  process.exit(2);
}

const REST = `${url}/rest/v1`;
const headers = (auth) => ({
  apikey: key,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
  ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
});

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

async function call(method, path, auth, body) {
  const res = await fetch(REST + path, { method, headers: headers(auth), body: body ? JSON.stringify(body) : undefined });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
const denied = (r) => r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0);
const desc = (r) => `HTTP ${r.status}${Array.isArray(r.data) ? `，返回 ${r.data.length} 行` : r.data?.message ? `，${r.data.message}` : ''}`;
const probe = { id: '00000000-0000-4000-8000-000000000001', company: 'RLS测试公司', position: 'RLS测试岗位', status: '已投递', sources: ['manual'] };

async function suite(label, auth) {
  console.log(`\n== ${label} ==`);
  let r = await call('GET', '/applications?select=id,company&limit=5', auth);
  check('读取记录被阻止', denied(r), desc(r));
  r = await call('POST', '/applications', auth, probe);
  check('新增记录被阻止', r.status >= 400, desc(r));
  r = await call('PATCH', '/applications?id=not.is.null', auth, { notes: 'rls-test' });
  check('更新记录被阻止', denied(r), desc(r));
  r = await call('DELETE', '/applications?id=not.is.null', auth);
  check('删除记录被阻止', denied(r), desc(r));
  r = await call('GET', '/allowlist?select=user_id', auth);
  check('读取白名单被阻止', denied(r), desc(r));
}

await suite('未登录访客（publishable key）', null);
if (token) {
  const me = await call('POST', '/rpc/am_i_allowed', token, {});
  if (me.data === true) {
    console.error('\n该令牌属于白名单账号，为避免改动真实数据，已停止。请换未授权账号的令牌。');
    process.exit(2);
  }
  await suite('已登录但未授权的账号', token);
} else {
  console.log('\n（未设置 TEST_ACCESS_TOKEN，跳过“未授权账号”测试）');
}
console.log(failed ? `\n✖ ${failed} 项未通过` : '\n✔ 全部通过');
process.exit(failed ? 1 : 0);
