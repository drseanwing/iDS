# @opengrade/widget

Embeddable decision-aid micro-bundle for OpenGRADE. Built with Preact (~3 kB gzipped), zero runtime dependencies beyond the bundle itself.

## Quick start

### Script tag (auto-mount)

Add the bundle to any page, then drop a `data-opengrade-widget` element:

```html
<script type="module" src="https://your-cdn.example.com/opengrade-widget.js"></script>

<div
  data-opengrade-widget
  data-api-url="https://api.example.com"
  data-recommendation-id="<recommendation-uuid>"
  data-theme="light"
></div>
```

The widget scans for `[data-opengrade-widget]` elements on `DOMContentLoaded` and mounts automatically.

### Programmatic API

```ts
import { mount, unmount } from '@opengrade/widget';
import type { WidgetConfig } from '@opengrade/widget';

const config: WidgetConfig = {
  apiUrl: 'https://api.example.com',
  recommendationId: '<recommendation-uuid>',
  theme: 'light',           // 'light' | 'dark'  (optional, default 'light')
  language: 'en',           // BCP-47 tag        (optional)
  layers: ['overview', 'benefits-harms'], // restrict visible tabs (optional)
};

mount(document.getElementById('widget')!, config);

// Later, to tear down:
unmount(document.getElementById('widget')!);
```

## Configuration

| Attribute / property | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | — | Base URL of the OpenGRADE API |
| `recommendationId` | `string` | — | UUID of the recommendation |
| `theme` | `'light' \| 'dark'` | `'light'` | Visual theme |
| `language` | `string` | — | BCP-47 language tag (informational) |
| `layers` | `Array<'overview' \| 'benefits-harms' \| 'full-evidence'>` | all three | Which tabs to show |

## Data attributes (auto-mount)

| Attribute | Maps to |
|---|---|
| `data-api-url` | `apiUrl` |
| `data-recommendation-id` | `recommendationId` |
| `data-theme` | `theme` |
| `data-language` | `language` |
| `data-layers` | `layers` (comma-separated, e.g. `"overview,benefits-harms"`) |

## Layers

| Layer | What it shows |
|---|---|
| **Overview** | Recommendation strength, certainty of evidence badge, PICO summaries |
| **Benefits & Harms** | Critical and important outcomes with effect sizes, baseline risk, and interactive pictographs (10×10 person-icon grid) |
| **Full Evidence** | All outcomes (including lower-importance ones) plus practical issues |

## Pictograph

The Benefits & Harms layer includes an interactive pictograph for outcomes that have both `absoluteEffectIntervention` and `absoluteEffectComparison` populated. Click "Show pictograph" on any outcome row to expand it.

The 10×10 grid of 100 person icons uses three colours:
- **Green** – events avoided by the intervention
- **Red/Harm** – events that still occur
- **Grey** – no event

## iframe embedding

The API exposes a self-contained embed page:

```
GET /embed/decision-aid/:recommendationId?theme=light
```

Serve this URL in an `<iframe>`:

```html
<iframe
  src="https://api.example.com/embed/decision-aid/<uuid>"
  width="720"
  height="500"
  frameborder="0"
></iframe>
```

## Building

```bash
pnpm --filter @opengrade/widget build
```

Output files in `dist/`:
- `opengrade-widget.js` – ES module
- `opengrade-widget.umd.cjs` – UMD bundle (CDN / `<script>` tag)

## Browser support

ES2020 + native `fetch`. Requires a modern browser (Chrome 87+, Firefox 78+, Safari 14+). No polyfills included.
