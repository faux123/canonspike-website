// Hide the top bar while scrolling down, show it on scroll up. Runs only where CSS scroll-state
// container queries are missing (Safari, Firefox); Chrome does this in CSS alone.
// From guides/user-experience/content-first-noise-reduction.md (GoogleChrome/modern-web-guidance).
if (!CSS.supports('container-type', 'scroll-state')) {
  const bar = document.querySelector('.topbar');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    // Clamp so rubber-band overscroll at the top or bottom does not flip the direction.
    const y = Math.max(0, Math.min(scrollY, document.documentElement.scrollHeight - innerHeight));
    if (y === lastY) return;
    bar?.classList.toggle('is-hidden', y > lastY && y > bar.offsetHeight);
    lastY = y;
  }, { passive: true });
}
