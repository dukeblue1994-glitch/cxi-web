const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const flags = {
  pitch: q.get('pitch') === '1',
  force: q.get('force') === '1',
  seed: Number(q.get('seed') ?? 42),
  ww: true, rt: true, ah: true, tl: true, sla: true,
  cc: true, ab: true, rr: true, bm: true, roi: true,
  zc: true, po: true
};
export function once(key, fn){
  if (once[key]) return;
  once[key] = 1;
  fn();
}
