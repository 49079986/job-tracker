export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animateExit(element, { duration, offset, opacity = 0 }) {
  if (prefersReducedMotion() || !element?.animate) return null;
  return element.animate(
    [{ opacity: 1, transform: 'none' }, { opacity, transform: `translateY(${offset}px)` }],
    { duration, easing: 'ease-in', fill: 'forwards' },
  );
}

export function animateExternalLink(event) {
  if (prefersReducedMotion()) return;
  event.currentTarget.querySelector('.link-arrow')?.animate?.(
    [{ offset: 0 }, { transform: 'translate(5px, -5px)', opacity: 0.45, offset: 0.5 }, { offset: 1 }],
    { duration: 230, easing: 'ease-out' },
  );
}
