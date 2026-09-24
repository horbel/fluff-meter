/**
 * An S-curve that keeps 0 at 0 and 1 at 1 but pulls values away from `mid`. Jev's calibrated
 * answers cluster in the middle for ordinary posts; this spreads them so a feed shows the
 * whole range instead of a wall of 35–55%.
 */
export function contrast(x: number, mid: number, steepness: number): number {
  const s = (t: number) => 1 / (1 + Math.exp(-steepness * (t - mid)));
  const low = s(0);
  const high = s(1);
  const clamped = Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
  return (s(clamped) - low) / (high - low);
}
