import { supabase } from '../supabase.js';
import { fromDb, toDb } from './mapping.js';
import { newId } from './uuid.js';

const TABLE = 'applications';
const PAGE = 1000;

const fail = (error, what) => {
  if (!error) return;
  const msg = error.message || String(error);
  const e = new Error(`${what}失败：${msg}`);
  e.cause = error;
  throw e;
};

export async function checkAllowed() {
  const { data, error } = await supabase.rpc('am_i_allowed');
  fail(error, '检查授权');
  return data === true;
}

export async function listAll() {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    fail(error, '读取记录');
    out.push(...data.map(fromDb));
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createRecord(rec) {
  const row = toDb({ ...rec, id: rec.id || newId(), sources: rec.sources?.length ? rec.sources : ['manual'] });
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  fail(error, '新增');
  return fromDb(data);
}

export async function updateRecord(id, patch) {
  const row = toDb(patch, { includeId: false });
  const { data, error } = await supabase.from(TABLE).update(row).eq('id', id).select().single();
  fail(error, '保存');
  return fromDb(data);
}

export async function deleteRecord(id) {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
  fail(error, '删除');
  if (!data?.length) throw new Error('删除失败：记录不存在或没有权限');
}

/** 批量导入；主键冲突的行由数据库忽略（ON CONFLICT DO NOTHING），返回实际写入数量 */
export async function importRecords(records, onProgress) {
  let written = 0;
  const CHUNK = 200;
  for (let i = 0; i < records.length; i += CHUNK) {
    const rows = records.slice(i, i + CHUNK).map((r) => toDb(r));
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      .select('id');
    fail(error, `导入第 ${i + 1}–${i + rows.length} 条`);
    written += data.length;
    onProgress?.(Math.min(i + CHUNK, records.length), records.length);
  }
  return written;
}
