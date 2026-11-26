/** 分页：首尾页、当前页附近的页码，其余用省略号 */
function pageList(page, total) {
  const set = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => set.add(p));
  const nums = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((p, i) => {
    if (i && p - nums[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="分页">
      <button className="btn small" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ 上一页</button>
      <span className="page-nums">
        {pageList(page, totalPages).map((p) =>
          typeof p === 'number' ? (
            <button
              key={p}
              className={`page-num ${p === page ? 'active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`第 ${p} 页`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ) : (
            <span key={p} className="page-gap" aria-hidden="true">…</span>
          ),
        )}
      </span>
      <span className="page-mobile muted">{page} / {totalPages}</span>
      <button className="btn small" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>下一页 ›</button>
    </nav>
  );
}
