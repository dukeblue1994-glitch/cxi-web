export const clamp = (n, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, n));
export const nssToIndex = (nss) => Math.round(((clamp(nss) + 1) / 2) * 100);
export function composite({ nss, rrs, pbi, w = { nss: 0.6, rrs: 0.25, pbi: 0.15 } }) {
  const s =
    w.nss * ((clamp(nss) + 1) / 2) +
    w.rrs * Math.max(0, Math.min(1, rrs)) +
    w.pbi * Math.max(0, Math.min(1, pbi));
  return Math.round(s * 100);
}
export const eligible = ({ composite, rrs }) => composite >= 80 && rrs >= 0.6;
