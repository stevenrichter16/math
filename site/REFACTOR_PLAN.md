# Refactor Plan: Break `main.js` Monolith Into Modules

## Goals
- Keep current behavior stable while reducing risk of regressions.
- Move from one large script to focused modules by feature.
- Preserve static-site compatibility (plain browser JS, no framework rewrite).

## Current Status
- `site/public/main.js` is now a small entry loader.
- Existing monolith logic was moved to `site/public/js/app/legacyApp.js`.
- `site/public/js/app/bootstrap.js` handles one-time app startup.

## Target Folder Layout

```text
site/public/
  main.js                          # tiny entrypoint (already done)
  css/
    app.css                        # shared app styles
    ai-panel.css                   # AI/QA panel styles
    indicators.css                 # sentence/section marker styles
  js/
    app/
      bootstrap.js                 # boot sequence and init order
      legacyApp.js                 # temporary bridge during migration
      appState.js                  # global mutable state container
    core/
      dom.js                       # query helpers, delegation, ids
      storage.js                   # localStorage read/write + versioning
      events.js                    # lightweight event bus
      mathRender.js                # KaTeX helpers and render queues
    math/
      functions.js                 # f, f', f'' definitions/config
      colors.js                    # slope/sign color mapping rules
      formatting.js                # numeric + latex formatting helpers
    viz/
      shared/
        graphAdapter.js            # Desmos adapter and expression helpers
        traces.js                  # tangent/secant/point trace utilities
      derivativeViz.js             # derivative-specific visualization logic
      rulesViz.js                  # power/product/quotient/chain interactions
      launcher.js                  # wire visualization launch buttons
    ai/
      state/
        qaStore.js                 # Q&A state and persistence format
      providers/
        openaiProvider.js          # ChatGPT request adapter
        claudeProvider.js          # Claude request adapter
        providerRouter.js          # provider selection/fallback
      prompt/
        templates.js               # system/user prompt builders
      context/
        selectionAnchor.js         # exact text anchoring + sentence mapping
        sectionContext.js          # heading/section context resolution
      indicators/
        markerLayer.js             # marker placement + hover highlighting
        badgeCounts.js             # heading rule-count and Q&A count badges
      panel/
        panelController.js         # collapsible Q&A UI behavior
        askControls.js             # ask form, provider toggle, states
      render/
        markdownLatex.js           # markdown rendering + full LaTeX pass
        historyList.js             # persisted Q&A list rendering
```

## Migration Phases

1. **Boot + State Boundary (in progress)**
- Keep all behavior in `legacyApp.js`.
- Introduce `appState.js` and move raw globals into one state object.
- Add tests/checkpoints for initialization order and DOM-ready behavior.

2. **Core Utilities Extraction**
- Extract generic helpers from legacy file into `core/dom.js`, `core/storage.js`, `core/mathRender.js`.
- Replace direct localStorage usage with a versioned storage wrapper.

3. **Math + Visualization Split**
- Move function configuration and sign/color logic into `math/` modules.
- Extract Desmos integration to `viz/shared/graphAdapter.js`.
- Split derivative/rule-specific visualization logic into `viz/*.js` modules.

4. **AI Feature Split**
- Extract Q&A persistence/state to `ai/state/qaStore.js`.
- Split provider adapters (OpenAI/Claude) and router.
- Move selection anchoring and indicator placement into dedicated context/indicator modules.
- Keep panel/controls/rendering separate to reduce UI coupling.

5. **CSS Decomposition**
- Move monolithic inline/style blocks to `public/css/*` by feature.
- Keep a minimal shared baseline in `app.css`.

6. **Legacy Removal**
- Once feature parity is complete, delete `legacyApp.js`.
- `bootstrap.js` should only compose module init calls.

## Guardrails
- Maintain one behavior-preserving PR per phase.
- Run `npm run build` after every extraction step.
- For visual logic changes, manually verify:
  - slope sign colors for `f(x)`, `f'(x)`, rule visualizations
  - sentence marker placement and hover exact-text highlighting
  - Q&A persistence, delete flow, and provider switching

## Immediate Next Steps
1. Create `site/public/js/app/appState.js` and move shared mutable vars there.
2. Extract localStorage helpers into `site/public/js/core/storage.js`.
3. Wire `legacyApp.js` to consume those modules before deeper feature extraction.
