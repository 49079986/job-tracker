import { STATUSES } from './constants.js';
import { isUuid, uuidv5 } from './uuid.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_KEYS = [
  'legacyId', 'company', 'position', 'status', 'nextAction', 'lastProgressSummary', 'confirmedEventAt',
  'eventTypeAndTimezone', 'jobCode', 'location', 'salary', 'jobType', 'industry', 'channel', 'jobUrl', 'jobUrlLabel',
  'sourceDocLabel', 'notes',
];

export const normKey = (s) =>
  String(s ?? '').toLowerCase().replace(/[\s（）()【】\[\]\-—_·/,，、.。:：]/g, '');

function validDate(v) {
  if (v === null || v === undefined || v === '') return true;
  if (!DATE_RE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** 解析文件文本，返回原始条目数组 */
export function parseImportText(text) {
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch (e) {
    throw new Error('文件不是有效的 JSON：' + e.message);
  }
  const list = Array.isArray(data) ? data : data?.records;
  if (!Array.isArray(list)) throw new Error('找不到记录数组：文件应为记录数组，或包含 records 字段的对象');
  return list;
}

/** 规范化并校验一条记录，返回 { record, errors } */
export async function normalizeRecord(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { record: null, errors: ['不是对象'] };
  const r = {};
  for (const k of TEXT_KEYS) {
    const v = input[k];
    if (v === undefined || v === null) r[k] = null;
    else if (typeof v === 'string') r[k] = v.trim() || null;
    else if (typeof v === 'number') r[k] = String(v);
    else errors.push(`${k} 不是文本`);
  }
  if (!r.company) errors.push('缺少公司');
  if (!r.position) errors.push('缺少岗位');
  if (!r.status) r.status = '已投递';
  else if (!STATUSES.includes(r.status)) errors.push(`未知状态「${r.status}」`);
  for (const k of ['appliedDate', 'lastProgressDate']) {
    const v = typeof input[k] === 'string' ? input[k].trim() : input[k];
    if (!validDate(v)) errors.push(`${k === 'appliedDate' ? '投递日期' : '最近进展日期'}格式应为 YYYY-MM-DD`);
    r[k] = v || null;
  }
  r.sources = Array.isArray(input.sources) && input.sources.length ? input.sources.map(String) : ['import'];
  r.sourceRefs = Array.isArray(input.sourceRefs) ? input.sourceRefs : [];
  r.timeline = Array.isArray(input.timeline) ? input.timeline : [];
  r.flags = Array.isArray(input.flags) ? input.flags.map(String) : [];
  r.raw = input.raw && typeof input.raw === 'object' ? input.raw : null;
  r.starred = input.starred === true;

  if (input.id !== undefined && input.id !== null && input.id !== '') {
    if (!isUuid(String(input.id))) errors.push('id 不是有效的 UUID');
    r.id = String(input.id).toLowerCase();
  } else if (!errors.length) {
    // 没有 id 时生成确定性 ID，保证同一文件再次导入得到同一 ID，被数据库主键拦截
    const basis = r.legacyId
      ? `${r.sources[0]}:${r.legacyId}`
      : `content:${normKey(r.company)}|${normKey(r.position)}|${r.appliedDate || ''}|${r.jobUrl || ''}`;
    r.id = await uuidv5(basis);
  }
  return { record: r, errors };
}

const brief = (r, where) => ({ id: r.id, company: r.company, position: r.position, appliedDate: r.appliedDate, legacyId: r.legacyId, where });

/**
 * 对导入条目分类：
 *  new        —— 新记录
 *  duplicate  —— 确定重复（ID 已存在，或同来源同原编号已存在 / 文件内重复），自动跳过
 *  suspected  —— 疑似重复（公司+岗位相同，或公司+岗位编号相同，但 ID 不同），需要确认
 *  invalid    —— 无效
 */
export async function classifyImport(rawList, existing) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const byLegacy = new Map(existing.filter((r) => r.legacyId).map((r) => [`${r.sources?.[0]}|${r.legacyId}`, r]));
  const byName = new Map();
  const byCode = new Map();
  const addIndex = (r, where) => {
    const nk = normKey(r.company) + '|' + normKey(r.position);
    if (!byName.has(nk)) byName.set(nk, []);
    byName.get(nk).push(brief(r, where));
    if (r.jobCode) {
      const ck = normKey(r.company) + '|' + normKey(r.jobCode);
      if (!byCode.has(ck)) byCode.set(ck, []);
      byCode.get(ck).push(brief(r, where));
    }
  };
  existing.forEach((r) => addIndex(r, '已有记录'));

  const seenIds = new Map();
  const seenLegacy = new Map();
  const items = [];
  for (let i = 0; i < rawList.length; i++) {
    const { record, errors } = await normalizeRecord(rawList[i]);
    const item = { index: i + 1, record, kind: 'new', reasons: [], matches: [], decision: null };
    if (errors.length) {
      item.kind = 'invalid';
      item.reasons = errors;
      items.push(item);
      continue;
    }
    const legacyKey = record.legacyId ? `${record.sources[0]}|${record.legacyId}` : null;
    if (byId.has(record.id)) {
      item.kind = 'duplicate';
      item.reasons.push('ID 已存在');
      item.matches.push(brief(byId.get(record.id), '已有记录'));
    } else if (legacyKey && byLegacy.has(legacyKey)) {
      item.kind = 'duplicate';
      item.reasons.push(`同来源编号 ${record.legacyId} 已存在`);
      item.matches.push(brief(byLegacy.get(legacyKey), '已有记录'));
    } else if (seenIds.has(record.id)) {
      item.kind = 'duplicate';
      item.reasons.push(`与文件第 ${seenIds.get(record.id)} 条 ID 相同`);
    } else if (legacyKey && seenLegacy.has(legacyKey)) {
      item.kind = 'duplicate';
      item.reasons.push(`与文件第 ${seenLegacy.get(legacyKey)} 条同来源编号相同`);
    } else {
      const nk = normKey(record.company) + '|' + normKey(record.position);
      const nameHits = byName.get(nk) || [];
      const codeHits = record.jobCode ? byCode.get(normKey(record.company) + '|' + normKey(record.jobCode)) || [] : [];
      const hits = [...nameHits, ...codeHits.filter((c) => !nameHits.some((n) => n.id === c.id))];
      if (hits.length) {
        item.kind = 'suspected';
        if (nameHits.length) item.reasons.push('公司和岗位名称相同');
        if (codeHits.length) item.reasons.push('公司和岗位编号相同');
        item.matches = hits;
      }
    }
    if (item.kind !== 'duplicate') {
      seenIds.set(record.id, i + 1);
      if (legacyKey) seenLegacy.set(legacyKey, i + 1);
      addIndex(record, `文件第 ${i + 1} 条`);
    }
    items.push(item);
  }
  const count = (k) => items.filter((x) => x.kind === k).length;
  return {
    items,
    summary: { total: items.length, valid: items.length - count('invalid'), new: count('new'), duplicate: count('duplicate'), suspected: count('suspected'), invalid: count('invalid') },
  };
}

/** 根据用户决定，返回要写入的记录 */
export function recordsToWrite(items) {
  return items
    .filter((x) => x.kind === 'new' || (x.kind === 'suspected' && x.decision === 'import'))
    .map((x) => x.record);
}
