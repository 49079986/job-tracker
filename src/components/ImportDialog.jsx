import { useState } from 'react';
import { classifyImport, parseImportText, recordsToWrite } from '../lib/importer.js';
import { importRecords } from '../lib/repo.js';
import Modal from './Modal.jsx';


export default function ImportDialog({ existing, onClose, onDone }) {
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(null);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setError('');
    setResult(null);
    try {
      const list = parseImportText(await f.text());
      setResult(await classifyImport(list, existing));
    } catch (err) {
      setError(err.message);
    }
  };

  const decide = (index, decision) =>
    setResult((r) => ({ ...r, items: r.items.map((x) => (x.index === index ? { ...x, decision } : x)) }));
  const decideAll = (decision) =>
    setResult((r) => ({ ...r, items: r.items.map((x) => (x.kind === 'suspected' ? { ...x, decision } : x)) }));

  const suspected = result?.items.filter((x) => x.kind === 'suspected') || [];
  const undecided = suspected.filter((x) => !x.decision).length;
  const toWrite = result ? recordsToWrite(result.items) : [];

  const write = async () => {
    setBusy(true);
    setError('');
    try {
      const n = await importRecords(toWrite, (a, b) => setProgress(`${a} / ${b}`));
      setDone({ written: n, blocked: toWrite.length - n });
      await onDone(n);
    } catch (err) {
      setError(err.message + '。已写入的部分保留在数据库中，重新导入同一文件不会产生重复。');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const footer = done ? (
    <button className="btn primary" onClick={onClose}>完成</button>
  ) : (
    <>
      <button className="btn" onClick={onClose} disabled={busy}>取消</button>
      {result && (
        <button className="btn primary" onClick={write} disabled={busy || undecided > 0 || toWrite.length === 0}>
          {busy ? `写入中 ${progress || ''}` : `确认写入 ${toWrite.length} 条`}
        </button>
      )}
    </>
  );

  return (
    <Modal title="导入 JSON" wide busy={busy} onClose={onClose} footer={footer}>
      {done ? (
        <div className="fade-in">
          <p className="ok-text">导入完成：写入 {done.written} 条。</p>
          {done.blocked > 0 && <p className="muted">另有 {done.blocked} 条在写入时被数据库识别为已存在，已跳过。</p>}
        </div>
      ) : (
        <>
          <label className="file-pick">
            <input type="file" accept=".json,application/json" onChange={onFile} disabled={busy} />
            <span className="btn">选择文件</span>
            <span className="muted">{fileName || '支持本站导出的 JSON 或第一阶段整理的 applications.json'}</span>
          </label>
          {error && <p className="error-text" role="alert">{error}</p>}
          {result && (
            <div className="fade-in">
              <div className="summary-grid">
                <Stat label="有效记录" value={result.summary.valid} />
                <Stat label="新记录" value={result.summary.new} tone="accent" />
                <Stat label="确定重复（跳过）" value={result.summary.duplicate} />
                <Stat label="疑似重复" value={result.summary.suspected} tone={result.summary.suspected ? 'warn' : ''} />
                <Stat label="无效" value={result.summary.invalid} tone={result.summary.invalid ? 'error' : ''} />
              </div>

              {suspected.length > 0 && (
                <section className="imp-section">
                  <div className="imp-head">
                    <h3>疑似重复：请逐条确认{undecided ? `（还有 ${undecided} 条未选择）` : ''}</h3>
                    <div className="imp-bulk">
                      <button className="btn small" onClick={() => decideAll('import')}>全部仍然导入</button>
                      <button className="btn small" onClick={() => decideAll('skip')}>全部跳过</button>
                    </div>
                  </div>
                  <ul className="imp-list">
                    {suspected.map((x) => (
                      <li key={x.index} className={x.decision ? 'decided' : ''}>
                        <div className="imp-main">
                          <strong>第 {x.index} 条</strong> {x.record.company} · {x.record.position}
                          <span className="muted"> · {x.record.appliedDate || '日期未知'}{x.record.legacyId ? ` · ${x.record.legacyId}` : ''}</span>
                          <div className="muted small-print">
                            {x.reasons.join('，')}；相似：
                            {x.matches.map((m) => `${m.where}「${m.company} · ${m.position}」${m.appliedDate || '日期未知'}${m.legacyId ? ` ${m.legacyId}` : ''}`).join('；')}
                          </div>
                        </div>
                        <div className="seg" role="radiogroup" aria-label={`第 ${x.index} 条处理方式`}>
                          <button role="radio" aria-checked={x.decision === 'import'} className={x.decision === 'import' ? 'on' : ''} onClick={() => decide(x.index, 'import')}>仍然导入</button>
                          <button role="radio" aria-checked={x.decision === 'skip'} className={x.decision === 'skip' ? 'on' : ''} onClick={() => decide(x.index, 'skip')}>跳过</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <Detail title="无效条目" items={result.items.filter((x) => x.kind === 'invalid')} />
              <Detail title="确定重复（将自动跳过）" items={result.items.filter((x) => x.kind === 'duplicate')} />
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
    </div>
  );
}

function Detail({ title, items }) {
  if (!items.length) return null;
  return (
    <details className="imp-section">
      <summary>{title}（{items.length}）</summary>
      <ul className="imp-list compact">
        {items.slice(0, 300).map((x) => (
          <li key={x.index}>
            <span>第 {x.index} 条 {x.record ? `${x.record.company || '（无公司）'} · ${x.record.position || '（无岗位）'}` : ''}</span>
            <span className="muted"> — {x.reasons.join('，')}</span>
          </li>
        ))}
        {items.length > 300 && <li className="muted">……其余 {items.length - 300} 条省略</li>}
      </ul>
    </details>
  );
}
