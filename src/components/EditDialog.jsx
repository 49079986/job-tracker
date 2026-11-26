import { useMemo, useState } from 'react';
import { FORM_FIELDS } from '../lib/constants.js';
import { emptyRecord } from '../lib/mapping.js';
import Modal from './Modal.jsx';
import { StatusSelect } from './StatusBadge.jsx';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function EditDialog({ record, readOnly = false, onSave, onClose }) {
  const initial = useMemo(() => {
    const base = emptyRecord();
    if (record) for (const k of Object.keys(base)) base[k] = record[k] ?? '';
    return base;
  }, [record]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const problems = [];
  if (!form.company.trim()) problems.push('请填写公司');
  if (!form.position.trim()) problems.push('请填写岗位');
  for (const k of ['appliedDate', 'lastProgressDate']) if (form[k] && !DATE_RE.test(form[k])) problems.push('日期格式应为 YYYY-MM-DD');
  if (form.jobUrl && !/^https?:\/\//i.test(form.jobUrl.trim())) problems.push('链接需以 http:// 或 https:// 开头');

  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (problems.length) return;
    setBusy(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      // 保存失败：保留表单内容，方便重试
      setError(err.message + '。已填写的内容已保留，可直接重试。');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={readOnly ? '记录详情' : record ? '编辑记录' : '新增记录'}
      wide
      busy={busy}
      onClose={onClose}
      footer={
        readOnly ? (
          <button className="btn" onClick={onClose}>关闭</button>
        ) : (
        <>
          {error && <p className="error-text foot-error" role="alert">{error}</p>}
          <button className="btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="btn primary" onClick={submit} disabled={busy}>{busy ? '保存中…' : error ? '重试保存' : '保存'}</button>
        </>
        )
      }
    >
      <form className="form-grid" onSubmit={submit} noValidate>
        <fieldset className="contents" disabled={readOnly}>
        {FORM_FIELDS.map((f) => (
          <label key={f.key} className={`field ${f.type === 'textarea' || f.wide ? 'wide' : ''}`}>
            <span>{f.label}{f.required && <em aria-hidden="true"> *</em>}</span>
            {f.type === 'status' ? (
              <StatusSelect value={form.status} onChange={(v) => set('status', v)} />
            ) : f.type === 'textarea' ? (
              <textarea rows={3} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input
                type={f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
                value={form[f.key]}
                required={f.required}
                aria-invalid={touched && f.required && !form[f.key].trim()}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
        </fieldset>
        <button type="submit" hidden />
      </form>
      {!readOnly && touched && problems.length > 0 && <p className="error-text" role="alert">{problems.join('；')}</p>}
      {record?.timeline?.length > 0 && (
        <details className="timeline">
          <summary>进展记录（{record.timeline.length}）</summary>
          <ol>
            {record.timeline.map((t, i) => (
              <li key={i}>
                <span className="t-date">{t.date || '日期未知'}</span>
                <span className="t-type">{t.type}</span>
                <span>{t.content}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      {record && (
        <p className="muted small-print">
          ID {record.id}{record.legacyId ? ` · 原编号 ${record.legacyId}` : ''} · 来源 {(record.sources || []).join(', ')}
        </p>
      )}
    </Modal>
  );
}
