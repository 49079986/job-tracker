import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configured = Boolean(url && key);

if (configured && /^sb_secret_|service_role/.test(key)) {
  throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY 只能填 publishable key，不能填 secret / service_role key');
}

export const supabase = configured
  ? createClient(url, key, {
      // 纯前端站点使用 implicit 流程：令牌经 URL #片段 带回并立即清除，不依赖本地保存的 PKCE 验证码
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
