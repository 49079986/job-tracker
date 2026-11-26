import { STATUSES, STATUS_TONE } from '../lib/constants.js';

export function StatusBadge({ status }) {
  return <span className={`badge tone-${STATUS_TONE[status] || 'neutral'}`}>{status}</span>;
}

export function StatusSelect({ value, onChange, disabled, label = '状态' }) {
  return (
    <select
      className={`status-select tone-${STATUS_TONE[value] || 'neutral'}`}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
