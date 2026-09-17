/** Reveal a destination only when it is outside the workspace's reading area. */
export function revealIfNeeded(target: HTMLElement | null) {
  if (!target || target.getClientRects().length === 0) return;
  // The root scroll padding already accounts for the sticky workspace header.
  const topInset = Number.parseFloat(window.getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const bounds = target.getBoundingClientRect();
  if (bounds.top < topInset || bounds.bottom > window.innerHeight) {
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }
}
