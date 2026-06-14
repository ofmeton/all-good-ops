# web-ui-bridge smoke / probe pack

Playwright checks for the web-ui-bridge dev overlay.

`track.mjs` is the original compact 9-check overlay tracking smoke. `run.mjs`
is the reusable probe pack for broader user-operation bug detection.

The core overlay decoration invariant remains:

```js
window.__webUiBridgeAssert()
```

must return `[]` after each operation. Any returned mismatch means an active decoration no longer tracks its target rect.

## Prerequisites

- web-ui-bridge daemon is running on `:7331` with `--target <terra>`.
- terra dev server is running on `:3001`.
- The overlay is loaded by dev injection.
- Override the target URL with `BRIDGE_URL` when needed. Default is `http://localhost:3001/`.
- Override daemon origin with `WEB_UI_BRIDGE_DAEMON` when needed. Default is `http://localhost:7331`.
- Override terra source root with `TERRA_DIR` when needed. Default is `/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/clients/terra-isshiki/site`.
- The daemon token is read from `<TERRA_DIR>/.web-ui-bridge-token`.

## Run

```bash
cd apps/web-ui-bridge/smoke
npm install
npx playwright install chromium
npm run smoke
npm run probe
```

The smoke defaults to headless Chromium. Use `HEADED=1 npm run smoke` to watch the browser.

The probe pack also defaults to headless Chromium. Use `HEADED=1 npm run probe`
to watch it.

## Probe pack

List all probes:

```bash
npm run probe -- --list
```

Run one cluster:

```bash
npm run probe -- --only selection
npm run probe -- --only style
```

Clusters:

- `selection`: single, meta multi-select, shift multi-select, Esc clear, chip remove, select-mode toggle, selection/hover separation after scroll.
- `highlight`: hover, scroll, resize, HMR-like `replaceWith`, repeated projection, idle rAF stop, scroll hover invalidation.
- `panel`: tabs, breakpoints, normal/hover state switching, collapse/launcher gutter behavior.
- `style`: destructive style edits for numeric/color/enum/toggle and multi batch behavior. Each mutation must parse as JSX and undo back to byte equality.
- `structure`: destructive duplicate/delete, single and multi. Each mutation must parse as JSX and undo back to byte equality.
- `dnd`: dropline display without mouseup, same-parent group move with undo, rejected unsafe reorder, different-parent move disabled state.
- `undo`: chained apply/duplicate with undo/redo/undo byte restoration.
- `queue`: multi-selection prompt enqueue, payloads[] verification, and marker-line cleanup from `.claude-ui-queue.jsonl`.

Non-destructive probes run in parallel browser contexts. Destructive probes run
serially to avoid terra source write races. The runner snapshots terra source
bytes before the destructive phase and verifies the same bytes after each
destructive probe and again at the end.

Any captured `console.error` or uncaught `pageerror` fails the owning probe,
except known Next/React dev noise such as hydration, React DevTools, Fast
Refresh, or webpack HMR messages. Ignored hydration/body-gutter warnings are
reported once as runner info.
