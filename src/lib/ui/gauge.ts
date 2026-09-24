/**
 * The extension's icon in miniature, shared by the badge and the popup. Styles for the
 * `gauge-*` classes live next to each place that shows it.
 */
const SVG = "http://www.w3.org/2000/svg";

function svg(tag: string, attrs: Record<string, string | number>, ...children: SVGElement[]) {
  const el = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  el.append(...children);
  return el;
}

/**
 * A tiny speedometer, the extension's icon in miniature: green on the left, red on the right,
 * and a needle pointing at the score. On first show the needle sweeps up from zero.
 */
export function gauge(index: number, sweep: boolean, size = 26): SVGElement {
  const angle = -90 + (180 * Math.min(100, Math.max(0, index))) / 100;
  const needle = svg("line", { class: "gauge-needle", x1: 14, y1: 14, x2: 14, y2: 5 });
  needle.style.transform = `rotate(${sweep ? -90 : angle}deg)`;
  if (sweep)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        needle.style.transform = `rotate(${angle}deg)`;
      }),
    );
  return svg(
    "svg",
    {
      class: "gauge",
      viewBox: "0 0 28 16",
      width: size,
      height: Math.round((size * 15) / 26),
      "aria-hidden": "true",
    },
    svg(
      "defs",
      {},
      svg(
        "linearGradient",
        { id: "gauge-arc", x1: 0, y1: 0, x2: 1, y2: 0 },
        svg("stop", { offset: 0, "stop-color": "#2fbf71" }),
        svg("stop", { offset: 0.5, "stop-color": "#f2b134" }),
        svg("stop", { offset: 1, "stop-color": "#e5484d" }),
      ),
    ),
    svg("path", { class: "gauge-arc", d: "M3 14 A11 11 0 0 1 25 14" }),
    needle,
    svg("circle", { class: "gauge-hub", cx: 14, cy: 14, r: 2.2 }),
  );
}
