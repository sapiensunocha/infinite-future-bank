// Tap outside (or press Escape) to close the modal, sheet or dropdown that is open.
//
// The app has ~40 hand-built overlays. Rather than change each one, this finds the
// overlay the customer tapped the backdrop of and presses that overlay's own Close
// button, so every overlay keeps its own closing logic (and any "are you sure?").
//
// Opt out with data-no-dismiss on the overlay (PIN entry, camera capture, payments in
// progress). An overlay with no Close button is left alone.

const CLOSE_SELECTOR = [
  'button[aria-label="Close"]', 'button[aria-label="close"]', 'button[aria-label*="Close" i]',
  'button[data-close]', 'button[title="Close"]',
].join(', ');

/** The button that closes this overlay: an explicit Close button, else a button holding only an X icon. */
export function findCloseButton(overlay) {
  if (!overlay) return null;
  const labelled = overlay.querySelector(CLOSE_SELECTOR);
  if (labelled && !labelled.disabled) return labelled;
  for (const b of overlay.querySelectorAll('button')) {
    if (b.disabled) continue;
    if (b.querySelector('svg.lucide-x, svg.lucide-x-circle, svg.lucide-circle-x') && b.textContent.trim() === '') return b;
  }
  return null;
}

const isOverlay = (el) => el instanceof HTMLElement && el.classList.contains('fixed') && el.classList.contains('inset-0');
const isBackdrop = (el) => el instanceof HTMLElement && el.classList.contains('absolute') && el.classList.contains('inset-0');

/** If the tap landed on a backdrop (not on the content), returns the overlay it belongs to. */
export function overlayForBackdropTap(target) {
  if (!(target instanceof HTMLElement)) return null;
  if (isOverlay(target)) return target;
  // Pattern: <div class="fixed inset-0"><div class="absolute inset-0 bg-black/50"/> <div>content</div></div>
  if (isBackdrop(target) && isOverlay(target.parentElement) && target.children.length === 0) return target.parentElement;
  // Pattern: a full-size flex wrapper that centres the content.
  if (isOverlay(target.parentElement) && target.parentElement.children.length === 1 && target.children.length <= 1
      && /\b(flex|grid)\b/.test(target.className) && /\b(items-center|items-end|place-items-center)\b/.test(target.className)) return target.parentElement;
  return null;
}

function topOverlay() {
  const all = [...document.querySelectorAll('.fixed.inset-0')].filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed');
  let best = null; let bestZ = -Infinity;
  for (const el of all) {
    if (getComputedStyle(el).pointerEvents === 'none') continue;
    const z = Number(getComputedStyle(el).zIndex) || 0;
    if (z >= bestZ) { bestZ = z; best = el; }
  }
  return best;
}

const blocked = (overlay) => !overlay || overlay.closest('[data-no-dismiss]') || overlay.hasAttribute('data-no-dismiss');

let installed = false;
export function installDismissHandlers() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  // Only a tap that both starts and ends on the backdrop closes it, so dragging a text
  // selection out of an input never dismisses the form.
  let downOverlay = null;
  document.addEventListener('pointerdown', (e) => { downOverlay = overlayForBackdropTap(e.target); }, true);
  document.addEventListener('click', (e) => {
    const overlay = overlayForBackdropTap(e.target);
    const same = overlay && overlay === downOverlay;
    downOverlay = null;
    if (!same || blocked(overlay) || e.defaultPrevented) return;
    // The overlay closes itself on backdrop taps already (React handler ran and removed it).
    if (!document.contains(overlay)) return;
    findCloseButton(overlay)?.click();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const overlay = topOverlay();
    if (blocked(overlay)) return;
    findCloseButton(overlay)?.click();
  });

  // Dropdowns and menus: a <details> menu closes when the customer taps elsewhere.
  document.addEventListener('pointerdown', (e) => {
    document.querySelectorAll('details[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  }, true);
}
