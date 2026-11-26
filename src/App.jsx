import { useEffect, useState } from 'react';
import { configured, supabase } from './supabase.js';
import { checkAllowed } from './lib/repo.js';
import Tracker from './components/Tracker.jsx';
import { ToastProvider } from './components/Toast.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = 加载中
  const [allowed, setAllowed] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!configured) return;
    // OAuth 回调出错时 Supabase 会把错误放在 URL 中
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.slice(1));
    const err = params.get('error_description');
    if (err) setAuthError(err);
    bootAuth().then(({ session: s, error: e }) => {
      if (e) setAuthError(e);
      setSession(s);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAllowed(null);
      return;
    }
    // 去掉地址栏里的 OAuth 参数
    if (window.location.search.includes('code=') || window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    let alive = true;
    setAllowed(null);
    checkAllowed()
      .then((ok) => alive && setAllowed(ok))
      .catch((e) => {
        if (!alive) return;
        setAuthError(e.message);
        setAllowed(false);
      });
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  const signOut = () => supabase.auth.signOut();

  // 公开只读：未登录也能浏览；登录且在白名单中才能编辑
  let body;
  if (!configured) body = <NotConfigured />;
  else if (session === undefined) body = <Splash text="正在加载…" />;
  else if (session && allowed === null) body = <Splash text="正在验证编辑权限…" />;
  else
    body = (
      <Tracker
        user={session?.user ?? null}
        canEdit={Boolean(session && allowed)}
        notAllowed={Boolean(session && !allowed)}
        authError={authError}
        onSignOut={signOut}
      />
    );

  return <ToastProvider>{body}</ToastProvider>;
}

function Splash({ text }) {
  return (
    <main className="center-screen">
      <div className="spinner" aria-hidden="true" />
      <p className="muted">{text}</p>
    </main>
  );
}

function NotConfigured() {
  return (
    <main className="center-screen">
      <div className="panel narrow fade-in">
        <h1 className="brand">求职投递管理</h1>
        <p>尚未配置 Supabase。请在 <code>.env.local</code>（本地）或 GitHub Actions Variables（部署）中设置：</p>
        <pre>VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_PUBLISHABLE_KEY</pre>
        <p className="muted">详见 README。</p>
      </div>
    </main>
  );
}

/** 读取本地保存的、尚未完成的 PKCE 登录流程（新版 supabase-js 按流程 ID 分槽保存验证码） */
function pendingPkceFlows() {
  const storageKey = supabase.auth.storageKey || 'sb-auth-token';
  let flowIds = [];
  try {
    const idx = JSON.parse(localStorage.getItem(`${storageKey}-flows-code-verifier`) || '[]');
    if (Array.isArray(idx)) flowIds = idx.filter((id) => typeof id === 'string' && localStorage.getItem(`${storageKey}-flow-${id}-code-verifier`));
  } catch {
    /* 忽略损坏的索引 */
  }
  const legacy = Boolean(localStorage.getItem(`${storageKey}-code-verifier`));
  return { flowIds, legacy };
}

/**
 * 处理 OAuth 回跳并读取当前会话。只执行一次（React StrictMode 开发模式会把 effect 跑两遍，
 * 同一个 code 不能被换取两次）。
 */
let bootPromise = null;
function bootAuth() {
  bootPromise ??= (async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const hadHashToken = /[#&](access_token|error_description)=/.test(window.location.hash);
    // initialize() 会返回处理回跳地址时的错误；getSession() 不会，所以先取一次
    const init = await supabase.auth.initialize();
    const { data, error } = await supabase.auth.getSession();
    let s = data.session ?? null;
    if (!s && hadHashToken) {
      const msg = init?.error?.message || '回跳地址中的登录令牌未能换成会话';
      console.error('[job-tracker] 登录回调失败', init?.error);
      window.history.replaceState(null, '', window.location.pathname);
      clearPkceLeftovers();
      return { session: null, error: `登录未完成：${msg}${init?.error?.status ? `（HTTP ${init.error.status}）` : ''}` };
    }
    if (s || !code) {
      clearPkceLeftovers();
      return { session: s, error: error ? '登录未完成：' + error.message + '。请再点一次「使用 GitHub 登录」。' : '' };
    }

    // 回跳带了 code 却没有拿到会话。新版 supabase-js 会在 redirectTo 后追加 ?sb_flow_id=…，
    // 若该参数在回跳时丢失，库不会把这次访问识别为登录回调。这里按本地保存的流程 ID 尝试换取会话。
    const { flowIds, legacy } = pendingPkceFlows();
    const hasVerifier = flowIds.length > 0 || legacy;
    let reason = error?.message || '';
    if (!reason && hasVerifier) {
      const attempts = [...flowIds.reverse().map((flowId) => ({ flowId })), ...(legacy ? [undefined] : [])];
      for (const opts of attempts) {
        const r = await supabase.auth.exchangeCodeForSession(code, opts);
        s = r.data?.session ?? null;
        reason = r.error?.message || '';
        if (s) break;
      }
    }
    window.history.replaceState(null, '', window.location.pathname);
    clearPkceLeftovers();
    if (s) return { session: s, error: '' };
    console.error('[job-tracker] OAuth 回调未完成', { error: reason, hasVerifier });
    return {
      session: null,
      error: hasVerifier
        ? `登录未完成：${reason || '换取会话失败'}。地址栏已清理，请再点一次「使用 GitHub 登录」。`
        : '登录未完成：这个浏览器里找不到发起登录时保存的验证信息（可能是在别的标签页、窗口或浏览器里完成了 GitHub 授权，或者点了多次登录）。请在当前页面重新点一次「使用 GitHub 登录」。',
    };
  })();
  return bootPromise;
}

/** 清除早期 PKCE 登录尝试留下的验证码，避免旧数据干扰后续登录 */
function clearPkceLeftovers() {
  try {
    Object.keys(localStorage)
      .filter((k) => /-code-verifier$/.test(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 存储不可用时忽略 */
  }
}
