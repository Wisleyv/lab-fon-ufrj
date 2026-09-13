export function initHeaderScroll(documentRef = document, windowRef = window) {
  const header = documentRef.querySelector(".site-header");
  if (!header) return () => {};
  let compact = null;
  let frame = null;
  const rootStyle = documentRef.documentElement.style;
  const previousOffset = rootStyle.getPropertyValue("--header-offset");
  const measure = () => rootStyle.setProperty("--header-offset", `${Math.ceil(header.getBoundingClientRect().height)}px`);
  const observer = windowRef.ResizeObserver ? new windowRef.ResizeObserver(measure) : null;
  observer?.observe(header);
  const update = () => {
    frame = null;
    const next = windowRef.scrollY > 24;
    if (compact !== next) {
      compact = next;
      header.classList.toggle("is-scrolled", compact);
    }
  };
  const onScroll = () => {
    if (frame === null) frame = windowRef.requestAnimationFrame(update);
  };
  update();
  measure();
  windowRef.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    windowRef.removeEventListener("scroll", onScroll);
    if (frame !== null) windowRef.cancelAnimationFrame(frame);
    observer?.disconnect();
    if (previousOffset) rootStyle.setProperty("--header-offset", previousOffset);
    else rootStyle.removeProperty("--header-offset");
  };
}
