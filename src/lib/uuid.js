// 稳定 ID：UUID v5（SHA-1，RFC 4122）。与第一阶段整理脚本使用同一命名空间。
export const ID_NAMESPACE = '6b1f2c1e-4a8e-5c3d-9f00-6a6f62747261';

const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function uuidv5(name, namespace = ID_NAMESPACE) {
  const ns = namespace.replace(/-/g, '').match(/../g).map((h) => parseInt(h, 16));
  const data = new Uint8Array([...ns, ...new TextEncoder().encode(name)]);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', data)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hex(hash);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

export const newId = () => crypto.randomUUID();
