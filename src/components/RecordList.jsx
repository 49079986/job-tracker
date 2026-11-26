import { SOURCE_LABEL } from '../lib/constants.js';
import { StatusBadge, StatusSelect } from './StatusBadge.jsx';

const sourceText = (r) => (r.sources || []).map((s) => SOURCE_LABEL[s] || s).join(' + ');
const safeUrl = (u) => (u && /^https?:\/\//i.test(u) ? u : null);

function JobLink({ r }) {
  const url = safeUrl(r.jobUrl);
  if (!url) return null;
  return (
    <a className="job-link" href={url} target="_blank" rel="noopener noreferrer">
      {r.jobUrlLabel || '链接'} ↗
    </a>
  );
}

export default function RecordList({ records, startIndex = 0, mobile, readOnly, busyIds, onStatus, onEdit, onDelete }) {
  const status = (r, label) =>
    readOnly ? <StatusBadge status={r.status} /> : <StatusSelect value={r.status} disabled={busyIds.has(r.id)} onChange={(v) => onStatus(r, v)} label={label} />;
  const actions = (r) =>
    readOnly ? (
      <button className="btn small action-btn" onClick={() => onEdit(r)}>详情</button>
    ) : (
      <>
        <button className="btn small action-btn" onClick={() => onEdit(r)}>编辑</button>
        <button className="btn small danger-ghost" onClick={() => onDelete(r)}>删除</button>
      </>
    );
  if (mobile) {
    return (
      <ul className="cards">
        {records.map((r, i) => (
          <li key={r.id} className="card row-anim" style={{ '--i': Math.min(i, 12) }}>
            <div className="card-head">
              <div>
                <div className="company"><span className="seq">#{startIndex + i + 1}</span>{r.company}</div>
                <div className="position">{r.position}</div>
              </div>
              {status(r, `${r.company} 状态`)}
            </div>
            <dl className="card-meta">
              <div><dt>投递日期</dt><dd>{r.appliedDate || <span className="muted">未知</span>}</dd></div>
              <div><dt>职位行业</dt><dd>{r.industry || <span className="muted">未分类</span>}</dd></div>
              {r.nextAction && <div className="span2"><dt>下一步</dt><dd>{r.nextAction}</dd></div>}
              <div><dt>来源</dt><dd>{sourceText(r)}</dd></div>
            </dl>
            <div className="card-actions">
              <JobLink r={r} />
              <span className="grow" />
              {actions(r)}
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="table-wrap" role="region" aria-label="投递记录表格" tabIndex={0}>
      <table className="table">
        <thead>
          <tr>
            <th className="seq-col">#</th>
            <th>公司</th>
            <th>岗位</th>
            <th>行业</th>
            <th>状态</th>
            <th className="nowrap">投递日期</th>
            <th>下一步行动</th>
            <th>来源</th>
            <th className="actions-col"><span className="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={r.id} className="row-anim" style={{ '--i': Math.min(i, 12) }}>
              <td className="seq-col muted">{startIndex + i + 1}</td>
              <td className="company">{r.company}</td>
              <td className="position-cell">
                <div>{r.position}</div>
                <JobLink r={r} />
              </td>
              <td className="industry">{r.industry || <span className="muted">未分类</span>}</td>
              <td>{status(r, `${r.company} ${r.position} 状态`)}</td>
              <td className="date-cell nowrap">{r.appliedDate || <span className="muted">未知</span>}</td>
              <td className="next">{r.nextAction}</td>
              <td className="nowrap muted">{sourceText(r)}</td>
              <td className="actions-col nowrap">
                {actions(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
