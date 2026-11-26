import { useEffect, useRef, useState } from 'react';

/**
 * 多选下拉：每项可单独勾选；一个都不选 = 全部。
 * options: [{ value, count }]，selected: string[]
 */
export default function MultiSelect({ label, allLabel, total, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && (setOpen(false), wrap.current?.querySelector('.ms-trigger')?.focus());
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    listRef.current?.querySelector('[role="option"]:not([aria-disabled="true"])')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (v) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const summary =
    selected.length === 0 ? `${allLabel}（${total}）` : selected.length === 1 ? selected[0] : `已选 ${selected.length} 个行业`;

  // 上下键在选项间移动
  const onListKey = (e) => {
    const items = [...listRef.current.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(i + 1, items.length - 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(i - 1, 0)]?.focus(); }
  };

  return (
    <div className="ms" ref={wrap}>
      <button
        type="button"
        className={`ms-trigger ${selected.length ? 'has-value' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ms-summary">{summary}</span>
        <span className="ms-caret" aria-hidden="true" />
      </button>
      <div className="ms-pop popup-motion" data-open={open} inert={!open}>
        <div className="ms-head">
          <span className="muted">{selected.length ? `已选 ${selected.length} 项` : '未筛选，显示全部'}</span>
          <button type="button" className="ms-clear" disabled={!selected.length} onClick={() => onChange([])}>清空</button>
        </div>
        <ul className="ms-list" role="listbox" aria-multiselectable="true" aria-label={label} ref={listRef} onKeyDown={onListKey}>
          {options.map((o) => {
            const on = selected.includes(o.value);
            const disabled = !o.count && !on;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                className={`ms-option ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && toggle(o.value)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    toggle(o.value);
                  }
                }}
              >
                <span className="ms-check" aria-hidden="true">{on ? '✓' : ''}</span>
                <span className="ms-label">{o.value}</span>
                <span className="ms-count">{o.count}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
