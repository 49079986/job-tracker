import { useState } from 'react';

/** 已登录但不在白名单时显示的提示条：可以浏览，不能编辑 */
export default function NotAllowedBanner({ user }) {
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
    <div className="banner fade-in" role="status">
      <div>
        已用 GitHub 账号 <strong>{name}</strong> 登录，但该账号没有编辑权限，目前只能浏览。
        如果这是你的账号，请把下方 UUID 加入 allowlist 表（见 README）。
      </div>
      <div className="uuid-box">
        <code>{user.id}</code>
        <button className="btn ghost small" onClick={copy}>{copied ? '已复制' : '复制'}</button>
      </div>
    </div>
  );
}
