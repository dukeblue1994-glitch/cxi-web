let current = null;
export function setSnapshot(s) {
  current = Object.freeze({ ...s });
}
export function getSnapshot() {
  return current;
}
