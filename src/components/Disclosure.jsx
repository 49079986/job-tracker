import { useId, useState } from 'react';

export default function Disclosure({ className, label, hint, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <section className={`${className} disclosure`} data-open={open}>
      <button type="button" className="disclosure-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        {label}
        {!open && hint}
      </button>
      <div className="disclosure-panel" id={id} inert={!open}>
        <div className="disclosure-inner">{children}</div>
      </div>
    </section>
  );
}
