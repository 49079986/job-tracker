import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INDUSTRIES, PAGE_SIZES, STATUSES, UNCATEGORIZED } from '../lib/constants.js';
import { createRecord, deleteRecord, listAll, updateRecord } from '../lib/repo.js';
import { buildCsvExport, buildJsonExport, download, exportFilename } from '../lib/exporter.js';
import { normKey } from '../lib/importer.js';
import { animateExit, prefersReducedMotion } from '../lib/motion.js';
import { useToast } from './Toast.jsx';
import { ConfirmDialog } from './Modal.jsx';
import EditDialog from './EditDialog.jsx';
import ImportDialog from './ImportDialog.jsx';
import RecordList from './RecordList.jsx';
import useMedia from './useMedia.js';
import avatar from '../assets/avatar.js';
import SignInButton from './Login.jsx';
import NotAllowedBanner from './Unauthorized.jsx';
import Pagination from './Pagination.jsx';
import MultiSelect from './MultiSelect.jsx';

const PAGE_SIZE_KEY = 'job-tracker-page-size';
const OVERVIEW = [
  { status: '全部', label: '全部记录', tone: 'neutral' },
  { status: '面试中', label: '面试中', tone: 'accent' },
  { status: '等待结果', label: '等待结果', tone: 'info' },
  { status: 'Offer', label: 'Offer', tone: 'success' },
];

const readPageSize = () => {
  try {
    const raw = localStorage.getItem(PAGE_SIZE_KEY);
    const v = Number(raw);
    return raw !== null && raw !== '' && PAGE_SIZES.includes(v) ? v : 50;
  } catch {
    return 50;
  }
};

export default function Tracker({ user, canEdit, notAllowed, authError, onSignOut }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('全部');
  const [sort, setSort] = useState('desc');
  const [industries, setIndustries] = useState([]); // 空 = 全部行业
  const [starredOnly, setStarredOnly] = useState(false);
  const [pageSize, setPageSize] = useState(readPageSize);
  const [page, setPage] = useState(1);
  const [pageDirection, setPageDirection] = useState('none');
  const [dialog, setDialog] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const mobile = useMedia('(max-width: 760px)');
  const topHeadingRef = useRef(null);
  const contentRef = useRef(null);
  const headingRef = useRef(null);
  const resultsRef = useRef(null);
  const pageExit = useRef(null);

  const closeDialog = () => setDialog((current) => current && { ...current, closing: true });
  const removeDialog = useCallback(() => setDialog((current) => current?.closing ? null : current), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setRecords(await listAll());
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const starredCount = useMemo(() => records.filter((r) => r.starred).length, [records]);

  const counts = useMemo(() => {
    const c = { 全部: records.length };
    STATUSES.forEach((s) => (c[s] = 0));
    records.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [records]);

  // 行业选项：预设行业 + 数据里出现的其他行业 + 未分类；计数按全部记录
  const industryOptions = useMemo(() => {
    const c = new Map();
    records.forEach((r) => {
      const k = r.industry || UNCATEGORIZED;
      c.set(k, (c.get(k) || 0) + 1);
    });
    const extra = [...c.keys()].filter((k) => !INDUSTRIES.includes(k) && k !== UNCATEGORIZED).sort((a, b) => a.localeCompare(b, 'zh'));
    const list = [...INDUSTRIES, ...extra].map((k) => ({ value: k, count: c.get(k) || 0 }));
    if (c.get(UNCATEGORIZED)) list.push({ value: UNCATEGORIZED, count: c.get(UNCATEGORIZED) });
    return list;
  }, [records]);

  const visible = useMemo(() => {
    const q = normKey(query);
    const list = records.filter(
      (r) =>
        (status === '全部' || r.status === status) &&
        (industries.length === 0 || industries.includes(r.industry || UNCATEGORIZED)) &&
        (!starredOnly || r.starred) &&
        (!q || normKey(r.company).includes(q) || normKey(r.position).includes(q)),
    );
    const dir = sort === 'desc' ? -1 : 1;
    return list.sort((a, b) => {
      if (!a.appliedDate && !b.appliedDate) return (a.company || '').localeCompare(b.company || '', 'zh');
      if (!a.appliedDate) return 1; // 无日期始终排最后
      if (!b.appliedDate) return -1;
      if (a.appliedDate !== b.appliedDate) return a.appliedDate < b.appliedDate ? -dir : dir;
      return (a.legacyId || a.id).localeCompare(b.legacyId || b.id) * dir;
    });
  }, [records, query, status, industries, starredOnly, sort]);

  // 分页：筛选、排序或每页条数变化时回到第 1 页
  useEffect(() => {
    setPage(1);
    setPageDirection('none');
  }, [query, status, industries, starredOnly, sort, pageSize]);
  const totalPages = pageSize ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const start = pageSize ? (currentPage - 1) * pageSize : 0;
  const pageItems = pageSize ? visible.slice(start, start + pageSize) : visible;
  const listKey = JSON.stringify([status, industries, starredOnly, sort, query, pageSize, currentPage]);
  useEffect(() => () => pageExit.current?.cancel(), [listKey, loading, totalPages, mobile]);
  const changePageSize = (v) => {
    setPageSize(v);
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(v));
    } catch {
      /* 浏览器不允许存储时只在本次生效 */
    }
  };
  const goPage = async (p) => {
    if (p === currentPage || pageExit.current) return;
    const forward = p > currentPage;
    const animation = animateExit(resultsRef.current, { duration: 105, offset: forward ? -6 : 6, opacity: 0.3 });
    if (animation) {
      pageExit.current = animation;
      try {
        await animation.finished;
      } catch {
        return;
      } finally {
        pageExit.current = null;
      }
    }
    setPageDirection(forward ? 'forward' : 'backward');
    setPage(p);
    headingRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const markBusy = (id, on) =>
    setBusyIds((s) => {
      const n = new Set(s);
      on ? n.add(id) : n.delete(id);
      return n;
    });

  const changeStatus = async (rec, next) => {
    if (rec.status === next) return;
    const prev = rec.status;
    setRecords((rs) => rs.map((r) => (r.id === rec.id ? { ...r, status: next } : r)));
    markBusy(rec.id, true);
    try {
      const saved = await updateRecord(rec.id, { status: next });
      setRecords((rs) => rs.map((r) => (r.id === rec.id ? saved : r)));
      toast(`「${rec.company}」状态已更新为 ${next}`);
    } catch (e) {
      setRecords((rs) => rs.map((r) => (r.id === rec.id ? { ...r, status: prev } : r)));
      toast(e.message, 'error', 6000);
    } finally {
      markBusy(rec.id, false);
    }
  };

  // 精投星标：乐观更新，失败回退
  const toggleStar = async (rec) => {
    const next = !rec.starred;
    setRecords((rs) => rs.map((r) => (r.id === rec.id ? { ...r, starred: next } : r)));
    markBusy(rec.id, true);
    try {
      const saved = await updateRecord(rec.id, { starred: next });
      setRecords((rs) => rs.map((r) => (r.id === rec.id ? saved : r)));
      toast(next ? `已标为精投：${rec.position}` : `已取消精投：${rec.position}`);
    } catch (e) {
      setRecords((rs) => rs.map((r) => (r.id === rec.id ? { ...r, starred: !next } : r)));
      toast(e.message, 'error', 6000);
    } finally {
      markBusy(rec.id, false);
    }
  };

  const save = async (form) => {
    if (dialog.kind === 'new') {
      const saved = await createRecord(form);
      setRecords((rs) => [...rs, saved]);
      toast('已新增记录');
    } else {
      const saved = await updateRecord(dialog.record.id, form);
      setRecords((rs) => rs.map((r) => (r.id === saved.id ? saved : r)));
      toast('已保存修改');
    }
    closeDialog();
  };

  const remove = async () => {
    const { id } = dialog.record;
    try {
      await deleteRecord(id);
      setRecords((rs) => rs.filter((r) => r.id !== id));
      toast('已删除记录');
      closeDialog();
    } catch (e) {
      toast(e.message, 'error', 6000);
    }
  };

  const doExport = (kind) => {
    setExportOpen(false);
    if (kind === 'json') download(buildJsonExport(records), exportFilename('json'), 'application/json');
    else download(buildCsvExport(records), exportFilename('csv'), 'text/csv;charset=utf-8');
    toast(`已导出 ${records.length} 条记录（${kind.toUpperCase()}）`);
  };

  const name = user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || '';
  const dialogProps = { closing: dialog?.closing, onClose: closeDialog, onExited: removeDialog };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-row">
          <img className="logo-mark small avatar" src={avatar} alt="" aria-hidden="true" width="32" height="32" />
          <h1 className="brand" tabIndex={-1} ref={topHeadingRef}>求职投递管理</h1>
        </div>
        <div className="top-actions">
          {canEdit && (
            <>
              <button className="btn primary" onClick={() => setDialog({ kind: 'new' })}>＋ 新增</button>
              <button className="btn" onClick={() => setDialog({ kind: 'import' })}>导入 JSON</button>
              <div className="menu-wrap">
                <button className="btn" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen((v) => !v)}>
                  导出全部记录 ▾
                </button>
                <div className="menu popup-motion" data-open={exportOpen} inert={!exportOpen} role="menu" onMouseLeave={() => setExportOpen(false)}>
                  <button role="menuitem" onClick={() => doExport('json')}>JSON（可重新导入恢复）</button>
                  <button role="menuitem" onClick={() => doExport('csv')}>CSV（Excel 打开）</button>
                </div>
              </div>
            </>
          )}
          {user ? (
            <>
              <span className="user" title={user.id}>{name}</span>
              <button className="btn ghost signout" onClick={onSignOut}>退出</button>
            </>
          ) : (
            <span className="signin">
              <SignInButton className="btn" />
            </span>
          )}
        </div>
      </header>

      {authError && <p className="error-text banner-error" role="alert">{authError}</p>}
      {notAllowed && user && <NotAllowedBanner user={user} />}

      <section className="overview" aria-labelledby="overview-title">
        <h2 id="overview-title">投递总览</h2>
        <dl className="overview-stats">
          {OVERVIEW.map(({ status: key, label, tone }) => (
            <div className={`overview-stat tone-${tone}`} key={key}>
              <dt>{label}</dt>
              <dd>{loading || loadError ? '—' : counts[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <main className="content" ref={contentRef}>
        <div className="list-meta">
          <div className="list-title">
            <h2 tabIndex={-1} ref={headingRef}>投递记录</h2>
            {!loading && !loadError && (
              <p className="result-count" aria-live="polite">
                共 {visible.length} 条{visible.length !== records.length ? `（全部 ${records.length} 条）` : ''}
                {visible.length > 0 && pageSize > 0 && totalPages > 1 && ` · 第 ${start + 1}–${Math.min(start + pageSize, visible.length)} 条`}
              </p>
            )}
          </div>
          {!loading && !loadError && (
            <label className="page-size">
              每页
              <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))} aria-label="每页显示条数">
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n ? `${n} 条` : '全部'}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="filters">
          <label className="search-wrap">
            <span className="search-icon" aria-hidden="true" />
            <input
              className="search"
              type="search"
              placeholder="搜索公司或岗位"
              aria-label="搜索公司或岗位"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <MultiSelect
            label="按职位行业筛选"
            allLabel="全部行业"
            total={records.length}
            options={industryOptions}
            selected={industries}
            onChange={setIndustries}
          />
          <button
            className={`btn star-filter ${starredOnly ? 'on' : ''}`}
            aria-pressed={starredOnly}
            onClick={() => setStarredOnly((v) => !v)}
            title="只看标为精投的职位"
          >
            <span className="star-icon" aria-hidden="true">{starredOnly ? '★' : '☆'}</span>
            精投<span className="star-count">{starredCount}</span>
          </button>
          <button
            className="btn sort-btn"
            onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            aria-label={`按投递日期排序，当前${sort === 'desc' ? '从新到旧' : '从旧到新'}`}
          >
            <span className="sort-icon" aria-hidden="true">{sort === 'desc' ? '↓' : '↑'}</span>
            <span>投递日期<span className="sort-order"> · {sort === 'desc' ? '最新' : '最早'}</span></span>
          </button>
        </div>
        <nav className="chips" aria-label="按状态筛选">
          {['全部', ...STATUSES].map((s) => (
            <button key={s} className={`chip ${status === s ? 'active' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s} <span className="chip-count">{counts[s] || 0}</span>
            </button>
          ))}
        </nav>
        {loading ? (
          <div className="center-pad"><div className="spinner" aria-hidden="true" /><p className="muted">正在读取记录…</p></div>
        ) : loadError ? (
          <div className="center-pad">
            <p className="error-text" role="alert">{loadError}</p>
            <button className="btn" onClick={load}>重试</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty results-motion" key={listKey}>
            {records.length === 0
              ? canEdit ? '还没有记录。可以新增一条，或导入 JSON。' : '还没有记录。'
              : starredOnly && starredCount === 0
                ? canEdit ? '还没有精投职位。点岗位名后面的 ☆ 就能收藏。' : '还没有精投职位。'
                : '没有符合条件的记录。'}
          </div>
        ) : (
          <>
            <div className="results-motion" key={listKey} data-direction={pageDirection} ref={resultsRef}>
              <RecordList
                records={pageItems}
                startIndex={start}
                mobile={mobile}
                readOnly={!canEdit}
                busyIds={busyIds}
                onStatus={changeStatus}
                onStar={toggleStar}
                onView={(record) => setDialog({ kind: 'view', record })}
                onEdit={(record) => setDialog({ kind: 'edit', record })}
                onDelete={(record) => setDialog({ kind: 'delete', record })}
              />
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={goPage} />
          </>
        )}
      </main>

      <BackToTop headingRef={topHeadingRef} />

      {(dialog?.kind === 'view' || (canEdit && (dialog?.kind === 'new' || dialog?.kind === 'edit'))) && (
        <EditDialog
          record={dialog.record}
          readOnly={dialog.kind === 'view'}
          onSave={save}
          {...dialogProps}
        />
      )}
      {canEdit && dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="删除记录"
          danger
          confirmText="删除"
          message={`确定删除「${dialog.record.company} · ${dialog.record.position}」吗？删除后无法撤销，建议先导出备份。`}
          onConfirm={remove}
          {...dialogProps}
        />
      )}
      {canEdit && dialog?.kind === 'import' && (
        <ImportDialog
          existing={records}
          {...dialogProps}
          onDone={async (n) => {
            toast(`导入完成：写入 ${n} 条`);
            await load();
          }}
        />
      )}
    </div>
  );
}

function BackToTop({ headingRef }) {
  const [visible, setVisible] = useState(() => window.scrollY > 0);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 0);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  const goToTop = () => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className="back-to-top"
      data-visible={visible}
      inert={!visible}
      aria-label="回到顶部"
      title="回到顶部"
      onClick={goToTop}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
