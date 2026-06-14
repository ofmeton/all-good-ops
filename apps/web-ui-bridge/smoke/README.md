# web-ui-bridge overlay tracking smoke

Playwright smoke for the overlay decoration tracking invariant:

```js
window.__webUiBridgeAssert()
```

must return `[]` after each operation. Any returned mismatch means an active decoration no longer tracks its target rect.

## Prerequisites

- web-ui-bridge daemon is running on `:7331` with `--target <terra>`.
- terra dev server is running on `:3001`.
- The overlay is loaded by dev injection.
- Override the target URL with `BRIDGE_URL` when needed. Default is `http://localhost:3001/`.

## Run

```bash
cd apps/web-ui-bridge/smoke
npm install
npx playwright install chromium
npm run smoke
```

The smoke defaults to headless Chromium. Use `HEADED=1 npm run smoke` to watch the browser.
