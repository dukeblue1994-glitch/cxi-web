// Utility functions for the CXI app

export function performanceMark(name) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function animateNumber(
  element,
  { from = 0, to = 0, duration = 800, decimals = 0, prefix = "", suffix = "" } = {}
) {
  if (!element) return;
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    element.textContent = `${prefix}${end.toFixed?.(decimals) ?? end}${suffix}`;
    return;
  }
  const delta = end - start;
  const startTime = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function tick(now) {
    const elapsed = Math.min(1, (now - startTime) / duration);
    const eased = easeOut(elapsed);
    const value = start + delta * eased;
    element.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    if (elapsed < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export async function typewriter(element, text, { delay = 22 } = {}) {
  if (!element) return;
  element.textContent = "";
  for (const char of text.split("")) {
    element.textContent += char;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export function seededRandom(seed = "", key = "") {
  const str = `${seed}:${key}`;
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  const normalized = ((h >>> 0) % 10000) / 10000;
  return normalized;
}
