export function initHeaderScroll(documentRef = document, windowRef = window) {
  const header = documentRef.querySelector(".site-header");
  if (!header) return () => {};
  let compact = null;
  let frame = null;
  const expandAt = 24;
  let compactAfter = 96;
  const rootStyle = documentRef.documentElement.style;
  const previousOffset = rootStyle.getPropertyValue("--header-offset");
  const measure = () => {
    const height = Math.ceil(header.getBoundingClientRect().height);
    rootStyle.setProperty("--header-offset", `${height}px`);
    // Keep the hysteresis band wider than any header-induced scroll anchoring shift.
    if (!compact) compactAfter = Math.max(96, height + expandAt);
  };
  const observer = windowRef.ResizeObserver ? new windowRef.ResizeObserver(measure) : null;
  observer?.observe(header);
  const update = () => {
    frame = null;
    const next = compact ? windowRef.scrollY > expandAt : windowRef.scrollY > compactAfter;
    if (compact !== next) {
      compact = next;
      header.classList.toggle("is-scrolled", compact);
      measure();
    }
  };
  const onScroll = () => {
    if (frame === null) frame = windowRef.requestAnimationFrame(update);
  };
  measure();
  update();
  windowRef.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    windowRef.removeEventListener("scroll", onScroll);
    if (frame !== null) windowRef.cancelAnimationFrame(frame);
    observer?.disconnect();
    if (previousOffset) rootStyle.setProperty("--header-offset", previousOffset);
    else rootStyle.removeProperty("--header-offset");
  };
}
