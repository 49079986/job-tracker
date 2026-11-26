import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function Modal({ title, onClose, onExited, closing, children, footer, wide, busy }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  useLayoutEffect(() => {
    const prev = document.activeElement;
    document.body.classList.add('modal-open');
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.classList.remove('modal-open');
      if (prev?.isConnected) prev.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!closing) return;
    const animations = [overlayRef.current, panelRef.current].flatMap((element) => element?.getAnimations?.() ?? []);
    let active = true;
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (active) onExited();
    });
    return () => { active = false; };
  }, [closing, onExited]);

  const dismiss = () => { if (!busy && !closing) onClose(); };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    const focusable = [...panel.querySelectorAll('button, input, select, textarea, a[href], summary')]
      .filter((node) => !node.matches(':disabled') && !node.closest('[inert]') && node.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    const focused = document.activeElement;
    if (!first || (e.shiftKey ? focused === first || focused === panel : focused === last)) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  };

  return (
    <div className="overlay" data-closing={Boolean(closing)} ref={overlayRef} onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef} onKeyDown={onKeyDown}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-close" type="button" onClick={dismiss} disabled={busy || closing} aria-label="关闭">×</button>
        </header>
        <div className="modal-body" inert={Boolean(closing)}>{children}</div>
        {footer && <footer className="modal-foot" inert={Boolean(closing)}>{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmText = '确认', danger, onConfirm, onClose, closing, onExited }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      closing={closing}
      onExited={onExited}
      busy={busy}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>取消</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={go} disabled={busy}>
            {busy ? '处理中…' : confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
