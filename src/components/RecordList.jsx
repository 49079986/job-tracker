import { StatusBadge, StatusSelect } from './StatusBadge.jsx';

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

/** 精投星标：可编辑时可点击切换；只读时只显示已收藏的实心星 */
function Star({ r, readOnly, busy, onToggle }) {
  const on = Boolean(r.starred);
  if (readOnly) return on ? <span className="star on static" title="精投" aria-label="精投">★</span> : null;
  return (
    <button
      type="button"
      className={`star ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `取消精投：${r.position}` : `标为精投：${r.position}`}
      title={on ? '取消精投' : '标为精投'}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(r);
      }}
    >
      {on ? '★' : '☆'}
    </button>
  );
}

export default function RecordList({ records, startIndex = 0, mobile, readOnly, busyIds, onStatus, onStar, onEdit, onDelete }) {
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
  const star = (r) => <Star r={r} readOnly={readOnly} busy={busyIds.has(r.id)} onToggle={onStar} />;

  if (mobile) {
    return (
      <ul className="cards">
        {records.map((r, i) => (
          <li key={r.id} className={`card row-anim ${r.starred ? 'starred' : ''}`} style={{ '--i': Math.min(i, 12) }}>
            <div className="card-head">
              <div>
                <div className="card-title">
                  <span className="card-star">{star(r)}</span>
                  <span className="seq">#{startIndex + i + 1}</span>
                  <span className="position-title">{r.position}</span>
                </div>
                <div className="company-line">{r.company}</div>
              </div>
              {status(r, `${r.company} 状态`)}
            </div>
            <div className="card-sub">
              <span>{r.appliedDate || '日期未知'}</span>
              <span className="dot" aria-hidden="true">·</span>
              <span>{r.industry || '未分类'}</span>
            </div>
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
            <th className="star-col" title="精投"><span aria-hidden="true">★</span><span className="sr-only">精投</span></th>
            <th className="seq-col">#</th>
            <th>职位</th>
            <th>行业</th>
            <th>状态</th>
            <th className="nowrap">投递日期</th>
            <th className="actions-col"><span className="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={r.id} className={`row-anim ${r.starred ? 'starred' : ''}`} style={{ '--i': Math.min(i, 12) }}>
              <td className="star-col">{star(r)}</td>
              <td className="seq-col muted">{startIndex + i + 1}</td>
              <td className="job-cell">
                <div className="job-title">
                  <span className="position-title">{r.position}</span>
                </div>
                <div className="job-sub">
                  <span className="company-line">{r.company}</span>
                  <JobLink r={r} />
                </div>
              </td>
              <td className="industry"><span className="industry-tag">{r.industry || '未分类'}</span></td>
              <td>{status(r, `${r.company} ${r.position} 状态`)}</td>
              <td className="date-cell nowrap">{r.appliedDate || <span className="muted">未知</span>}</td>
              <td className="actions-col nowrap">{actions(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
