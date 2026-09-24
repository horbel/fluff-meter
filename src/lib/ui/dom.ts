type Child = Node | string | number | false | null | undefined;
type Props = Record<string, string | number | boolean | EventListener | undefined>;

/**
 * Tiny element builder. Text always goes in as text nodes, never as HTML, so nothing that
 * comes back from the network or the page can inject markup.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === false) continue;
    if (typeof value === "function") el.addEventListener(name.replace(/^on/, ""), value);
    else if (name === "style") el.style.cssText = String(value);
    else el.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}
