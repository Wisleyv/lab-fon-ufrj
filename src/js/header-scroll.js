export function initHeaderScroll(documentRef = document, windowRef = window) {
  const header = documentRef.querySelector(".site-header");
  if (!header) return () => {};
  let compact = null;
  let frame = null;
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
  windowRef.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    windowRef.removeEventListener("scroll", onScroll);
    if (frame !== null) windowRef.cancelAnimationFrame(frame);
  };
}
