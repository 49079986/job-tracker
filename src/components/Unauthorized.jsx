import { useState } from 'react';

export default function Unauthorized({ user, error, onSignOut }) {
  const [copied, setCopied] = useState(false);
  const name = user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || user?.email || '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时可手动选中 */
    }
  };
  return (
    <main className="center-screen">
      <div className="panel narrow fade-in">
        <h1 className="brand">暂无访问权限</h1>
        <p>
          已用 GitHub 账号 <strong>{name}</strong> 登录，但该账号还不在白名单中。
        </p>
        <p className="muted">如果这是你的账号：在 Supabase Dashboard → Authentication → Users 核对下方 UUID，再由管理员加入 allowlist 表（见 README）。</p>
        <div className="uuid-box">
          <code>{user.id}</code>
          <button className="btn ghost small" onClick={copy}>{copied ? '已复制' : '复制'}</button>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn" onClick={onSignOut}>退出登录</button>
      </div>
    </main>
  );
}
