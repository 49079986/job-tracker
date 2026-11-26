import { useMemo, useState } from 'react';
import { FORM_FIELDS, INDUSTRIES, SOURCE_LABEL } from '../lib/constants.js';
import { emptyRecord } from '../lib/mapping.js';
import Modal from './Modal.jsx';
import { StatusBadge, StatusSelect } from './StatusBadge.jsx';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAIN = FORM_FIELDS.filter((f) => f.group === 'main');
const MORE = FORM_FIELDS.filter((f) => f.group === 'more');
const safeUrl = (u) => (u && /^https?:\/\//i.test(u) ? u : null);
const sourceText = (r) => (r.sources || []).map((s) => SOURCE_LABEL[s] || s).join(' + ');

/** 进展记录（时间线） */
function Timeline({ items }) {
  if (!items?.length) return null;
  return (
    <section className="dd-section">
      <h4>进展记录（{items.length}）</h4>
      <ol className="dd-timeline">
        {items.map((t, i) => (
          <li key={i}>
            <span className="t-date">{t.date || '日期未知'}</span>
            {t.type && <span className="t-type">{t.type}</span>}
            <span className="t-content">{t.content}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 只读详情：主要信息 + 折叠的「更多信息」 */
function DetailView({ record: r }) {
  const url = safeUrl(r.jobUrl);
  const v = (x) => (x ? x : <span className="dd-empty">未填写</span>);
  const moreRows = MORE.filter((f) => f.key !== 'jobUrlLabel' && r[f.key]);
  return (
    <div className="dd">
      <header className="dd-hero">
        <div className="dd-company"><span className="dd-label">公司</span>{r.company}</div>
        <h3 className="dd-title">
          {r.position}
          {r.starred && <span className="dd-star" title="精投" aria-label="精投">★</span>}
        </h3>
      </header>

      <dl className="dd-grid">
        <div>
          <dt>职位行业</dt>
          <dd>{r.industry ? <span className="industry-tag big">{r.industry}</span> : <span className="dd-empty">未分类</span>}</dd>
        </div>
        <div>
          <dt>投递状态</dt>
          <dd><StatusBadge status={r.status} /></dd>
        </div>
        <div className="span2">
          <dt>投递日期 → 最近进展</dt>
          <dd className="dd-dates">
            <span>{r.appliedDate || <span className="dd-empty">投递日期未知</span>}</span>
            <span className="dd-arrow" aria-hidden="true">→</span>
            <span>{r.lastProgressDate || <span className="dd-empty">暂无进展</span>}</span>
          </dd>
        </div>
        <div>
          <dt>工作地点</dt>
          <dd>{v(r.location)}</dd>
        </div>
        <div>
          <dt>薪资水平</dt>
          <dd className={r.salary ? 'dd-salary' : ''}>{v(r.salary)}</dd>
        </div>
        <div className="span2">
          <dt>招聘链接</dt>
          <dd>
            {url ? (
              <a className="dd-link" href={url} target="_blank" rel="noopener noreferrer">
                {r.jobUrlLabel || '打开链接'} ↗<span className="dd-url">{url}</span>
              </a>
            ) : (
              <span className="dd-empty">未填写</span>
            )}
          </dd>
        </div>
      </dl>

      <details className="dd-more">
        <summary>更多信息</summary>
        <div className="dd-more-body">
          {moreRows.length > 0 && (
            <dl className="dd-grid compact">
              {moreRows.map((f) => (
                <div key={f.key} className={f.type === 'textarea' || f.wide ? 'span2' : ''}>
                  <dt>{f.label}</dt>
                  <dd className="pre">{r[f.key]}</dd>
                </div>
              ))}
            </dl>
          )}
          <Timeline items={r.timeline} />
          <p className="dd-meta">
            ID {r.id}
            {r.legacyId ? ` · 原编号 ${r.legacyId}` : ''}
            {sourceText(r) ? ` · 来源 ${sourceText(r)}` : ''}
          </p>
        </div>
      </details>
    </div>
  );
}

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
  const moreFilled = MORE.some((f) => String(initial[f.key] || '').trim());
  const [moreOpen, setMoreOpen] = useState(false);

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

  const field = (f) => (
    <label key={f.key} className={`field ${f.type === 'textarea' || f.wide ? 'wide' : ''}`}>
      <span>{f.label}{f.required && <em aria-hidden="true"> *</em>}</span>
      {f.type === 'status' ? (
        <StatusSelect value={form.status} onChange={(v) => set('status', v)} label="投递状态" />
      ) : f.type === 'industry' ? (
        <>
          <input list="industry-options" value={form.industry} placeholder="选择或输入行业" onChange={(e) => set('industry', e.target.value)} />
          <datalist id="industry-options">
            {INDUSTRIES.map((x) => <option key={x} value={x} />)}
          </datalist>
        </>
      ) : f.type === 'textarea' ? (
        <textarea rows={3} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
      ) : (
        <input
          type={f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
          value={form[f.key]}
          placeholder={f.placeholder || (f.type === 'url' ? 'https://' : '')}
          required={f.required}
          aria-invalid={touched && f.required && !form[f.key].trim()}
          onChange={(e) => set(f.key, e.target.value)}
        />
      )}
    </label>
  );

  return (
    <Modal
      title={readOnly ? '职位详情' : record ? '编辑记录' : '新增记录'}
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
      {readOnly && record ? (
        <DetailView record={record} />
      ) : (
        <form className="edit-form" onSubmit={submit} noValidate>
          <div className="form-grid roomy">{MAIN.map(field)}</div>
          <details className="dd-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
            <summary>
              更多信息
              {!moreOpen && moreFilled && <span className="dd-hint">已有内容</span>}
            </summary>
            <div className="dd-more-body">
              <div className="form-grid roomy">{MORE.map(field)}</div>
              {record && <Timeline items={record.timeline} />}
              {record && (
                <p className="dd-meta">
                  ID {record.id}
                  {record.legacyId ? ` · 原编号 ${record.legacyId}` : ''}
                  {sourceText(record) ? ` · 来源 ${sourceText(record)}` : ''}
                </p>
              )}
            </div>
          </details>
          {touched && problems.length > 0 && <p className="error-text" role="alert">{problems.join('；')}</p>}
          <button type="submit" hidden />
        </form>
      )}
    </Modal>
  );
}
