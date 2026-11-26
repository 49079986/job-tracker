import { FIELD_MAP, READONLY_FIELDS } from './constants.js';

const DATE_KEYS = ['appliedDate', 'lastProgressDate'];

export function fromDb(row) {
  const out = {};
  for (const [k, col] of Object.entries(FIELD_MAP)) out[k] = row[col] ?? null;
  out.sources = out.sources || [];
  out.sourceRefs = out.sourceRefs || [];
  out.timeline = out.timeline || [];
  out.flags = out.flags || [];
  return out;
}

export function toDb(rec, { includeId = true } = {}) {
  const out = {};
  for (const [k, col] of Object.entries(FIELD_MAP)) {
    if (READONLY_FIELDS.includes(k)) continue;
    if (k === 'id' && !includeId) continue;
    if (!(k in rec)) continue;
    let v = rec[k];
    if (typeof v === 'string') {
      v = v.trim();
      if (v === '') v = null;
    }
    if (DATE_KEYS.includes(k) && v === '') v = null;
    out[col] = v;
  }
  return out;
}

export const emptyRecord = () => ({
  company: '', position: '', status: '已投递', appliedDate: '', nextAction: '',
  lastProgressDate: '', lastProgressSummary: '', jobCode: '', location: '', jobType: '', industry: '',
  channel: '', jobUrl: '', jobUrlLabel: '', confirmedEventAt: '', eventTypeAndTimezone: '', notes: '',
});
