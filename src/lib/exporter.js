import { CSV_COLUMNS, FIELD_MAP } from './constants.js';

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export function buildJsonExport(records) {
  const clean = records.map((r) => {
    const o = {};
    for (const k of Object.keys(FIELD_MAP)) o[k] = r[k] ?? null;
    return o;
  });
  return JSON.stringify(
    { schemaVersion: 1, kind: 'job-tracker-export', generatedAt: new Date().toISOString(), count: clean.length, records: clean },
    null,
    2,
  );
}

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  let s = Array.isArray(v) ? v.join('|') : String(v);
  // 防止 Excel 把内容当公式执行
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function buildCsvExport(records) {
  const head = CSV_COLUMNS.map(([, label]) => label).join(',');
  const lines = records.map((r) => CSV_COLUMNS.map(([k]) => csvCell(r[k])).join(','));
  return '﻿' + [head, ...lines].join('\r\n');
}

export function download(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const exportFilename = (ext) => `job-tracker-${stamp()}.${ext}`;
