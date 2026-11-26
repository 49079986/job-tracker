import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { animateExit } from '../lib/motion.js';

/** GitHub 登录按钮（只有白名单账号登录后才能编辑） */
export default function SignInButton({ className = 'btn', label = '登录以编辑' }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const departure = useRef(null);

  useEffect(() => {
    const restore = (event) => {
      if (!event.persisted) return;
      departure.current?.cancel();
      departure.current = null;
      setBusy(false);
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  const login = async () => {
    setBusy(true);
    setMsg('');
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github', options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('未收到登录地址');
      departure.current = animateExit(document.getElementById('root'), { duration: 145, offset: 0, opacity: 0.2 });
      await departure.current?.finished;
      window.location.assign(data.url);
    } catch (error) {
      departure.current?.cancel();
      departure.current = null;
      setMsg('无法跳转到 GitHub 登录：' + error.message);
      setBusy(false);
    }
  };

  return (
    <>
      <button className={className} onClick={login} disabled={busy} title="使用 GitHub 登录">
        <GithubIcon /> {busy ? '正在跳转…' : label}
      </button>
      {msg && (
        <span className="error-text small-print" role="alert">
          {msg}
        </span>
      )}
    </>
  );
}

export function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
