import { h, render } from 'preact';
import { Widget } from './components/Widget';
import type { WidgetConfig } from './types';

export type { WidgetConfig };

/**
 * Mount the OpenGRADE decision-aid widget into a DOM element.
 *
 * @example
 * ```ts
 * import { mount } from '@opengrade/widget';
 * mount(document.getElementById('widget'), {
 *   apiUrl: 'https://api.example.com',
 *   recommendationId: 'rec-uuid',
 *   theme: 'light',
 * });
 * ```
 */
export function mount(element: Element | ShadowRoot | Document | DocumentFragment, config: WidgetConfig): void {
  render(h(Widget, { config }), element as Element);
}

/**
 * Unmount a previously mounted widget from a DOM element.
 */
export function unmount(element: Element): void {
  render(null, element);
}

// ── Auto-mount on DOMContentLoaded ────────────────────────────────────────
// Scans for `[data-opengrade-widget]` elements and mounts automatically.
// Attribute format:
//   <div
//     data-opengrade-widget
//     data-api-url="https://api.example.com"
//     data-recommendation-id="<uuid>"
//     data-theme="light|dark"
//   ></div>

function autoMount(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-opengrade-widget]');
  elements.forEach((el) => {
    const apiUrl = el.dataset['apiUrl'];
    const recommendationId = el.dataset['recommendationId'];
    const theme = el.dataset['theme'] as WidgetConfig['theme'] | undefined;
    const language = el.dataset['language'];
    const layersRaw = el.dataset['layers'];
    const layers = layersRaw
      ? (layersRaw.split(',').map((s) => s.trim()) as WidgetConfig['layers'])
      : undefined;

    if (!apiUrl || !recommendationId) {
      console.warn(
        '[OpenGRADE Widget] Missing data-api-url or data-recommendation-id on',
        el,
      );
      return;
    }

    mount(el, { apiUrl, recommendationId, theme, language, layers });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    // Already loaded (e.g. script injected dynamically)
    autoMount();
  }
}
