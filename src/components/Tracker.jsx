import { useCallback, useEffect, useMemo, useState } from 'react';
import { STATUSES } from '../lib/constants.js';
import { createRecord, deleteRecord, listAll, updateRecord } from '../lib/repo.js';
import { buildCsvExport, buildJsonExport, download, exportFilename } from '../lib/exporter.js';
import { normKey } from '../lib/importer.js';
import { useToast } from './Toast.jsx';
import { ConfirmDialog } from './Modal.jsx';
import EditDialog from './EditDialog.jsx';
import ImportDialog from './ImportDialog.jsx';
import RecordList from './RecordList.jsx';
import useMedia from './useMedia.js';
import SignInButton from './Login.jsx';
import NotAllowedBanner from './Unauthorized.jsx';

export default function Tracker({ user, canEdit, notAllowed, authError, onSignOut }) {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('全部');
  const [sort, setSort] = useState('desc');
  const [editing, setEditing] = useState(null); // null | 'new' | record（只读模式下为查看详情）
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const mobile = useMedia('(max-width: 760px)');

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

  const counts = useMemo(() => {
    const c = { 全部: records.length };
    STATUSES.forEach((s) => (c[s] = 0));
    records.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [records]);

  const visible = useMemo(() => {
    const q = normKey(query);
    const list = records.filter(
      (r) =>
        (status === '全部' || r.status === status) &&
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
  }, [records, query, status, sort]);

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

  const save = async (form) => {
    if (editing === 'new') {
      const saved = await createRecord(form);
      setRecords((rs) => [...rs, saved]);
      toast('已新增记录');
    } else {
      const saved = await updateRecord(editing.id, form);
      setRecords((rs) => rs.map((r) => (r.id === saved.id ? saved : r)));
      toast('已保存修改');
    }
    setEditing(null);
  };

  const remove = async () => {
    try {
      await deleteRecord(deleting.id);
      setRecords((rs) => rs.filter((r) => r.id !== deleting.id));
      toast('已删除记录');
      setDeleting(null);
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
  const listKey = `${status}|${sort}|${query}`;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-row">
          <span className="logo-mark small" aria-hidden="true" />
          <h1 className="brand">求职投递管理</h1>
        </div>
        <div className="top-actions">
          {canEdit && (
            <>
              <button className="btn primary" onClick={() => setEditing('new')}>＋ 新增</button>
              <button className="btn" onClick={() => setImporting(true)}>导入 JSON</button>
              <div className="menu-wrap">
                <button className="btn" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen((v) => !v)}>
                  导出全部记录 ▾
                </button>
                {exportOpen && (
                  <div className="menu fade-in" role="menu" onMouseLeave={() => setExportOpen(false)}>
                    <button role="menuitem" onClick={() => doExport('json')}>JSON（可重新导入恢复）</button>
                    <button role="menuitem" onClick={() => doExport('csv')}>CSV（Excel 打开）</button>
                  </div>
                )}
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
              <SignInButton className="btn ghost" />
            </span>
          )}
        </div>
      </header>

      {authError && <p className="error-text banner-error" role="alert">{authError}</p>}
      {notAllowed && user && <NotAllowedBanner user={user} />}

      <section className="filters">
        <input
          className="search"
          type="search"
          placeholder="搜索公司或岗位"
          aria-label="搜索公司或岗位"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn sort-btn"
          onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
          aria-label={`按投递日期排序，当前${sort === 'desc' ? '从新到旧' : '从旧到新'}`}
        >
          <span className="sort-long">投递日期 </span>{sort === 'desc' ? '↓ 新→旧' : '↑ 旧→新'}
        </button>
      </section>
      <nav className="chips" aria-label="按状态筛选">
        {['全部', ...STATUSES].map((s) => (
          <button key={s} className={`chip ${status === s ? 'active' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s} <span className="chip-count">{counts[s] || 0}</span>
          </button>
        ))}
      </nav>

      <main className="content">
        {loading ? (
          <div className="center-pad"><div className="spinner" aria-hidden="true" /><p className="muted">正在读取记录…</p></div>
        ) : loadError ? (
          <div className="center-pad">
            <p className="error-text" role="alert">{loadError}</p>
            <button className="btn" onClick={load}>重试</button>
          </div>
        ) : (
          <>
            <p className="result-count muted">共 {visible.length} 条{visible.length !== records.length ? `（全部 ${records.length} 条）` : ''}</p>
            {visible.length === 0 ? (
              <div className="empty fade-in" key={listKey}>
                {records.length === 0 ? (canEdit ? '还没有记录。可以新增一条，或导入 JSON。' : '还没有记录。') : '没有符合条件的记录。'}
              </div>
            ) : (
              <RecordList
                key={listKey}
                records={visible}
                mobile={mobile}
                readOnly={!canEdit}
                busyIds={busyIds}
                onStatus={changeStatus}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            )}
          </>
        )}
      </main>

      {editing && (
        <EditDialog
          record={editing === 'new' ? null : editing}
          readOnly={!canEdit}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {canEdit && deleting && (
        <ConfirmDialog
          title="删除记录"
          danger
          confirmText="删除"
          message={`确定删除「${deleting.company} · ${deleting.position}」吗？删除后无法撤销，建议先导出备份。`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
      {canEdit && importing && (
        <ImportDialog
          existing={records}
          onClose={() => setImporting(false)}
          onDone={async (n) => {
            toast(`导入完成：写入 ${n} 条`);
            await load();
          }}
        />
      )}
    </div>
  );
}
