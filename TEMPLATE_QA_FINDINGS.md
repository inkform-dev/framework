# Template QA Findings — Aurora / Fern / Cedar / Mono / Base

Systematic quality scan of the 5 starter templates the CLI scaffolds from
(`templates/{aurora,fern,cedar,mono,base}`, downloaded via `giget` from
`github:inkform/framework/templates/<theme>` — confirmed in
`packages/cli/src/scaffold.mjs`; the separate `examples/` directory is a
different thing (demo sites), out of scope here). Produced 2026-07-19.

**Method**: three parallel audits (shared framework layer; per-theme color
tokens with computed WCAG ratios; per-template layout/top-bar files) plus
direct browser verification (an iframe-based multi-viewport harness, since
this session's window-resize tool proved unreliable — `window.innerWidth`
didn't change after a resize call even though the CDP screenshot looked
different; iframes of fixed pixel dimensions gave a reliable, verifiable
substitute, confirmed via each iframe's own `document.body.scrollWidth`).

Almost every finding below is a **shared-framework-layer bug**, not a
per-template one — the 5 templates' own files (`layout.tsx`, `top-bar.tsx`,
`lib/route.tsx`, `mdx-components.tsx`) are byte-identical across all 5 themes
(confirmed via diff) and were not themselves the source of the bugs. Only
`app/theme.css` (color token overrides) is genuinely per-theme content.

## Summary table

| Theme | White border | Mobile overflow | Contrast (method pill) | Contrast (CTA button) | Two-voice typography |
|---|---|---|---|---|---|
| Aurora | Before: BUG → After: fixed | Before: BUG → After: fixed | Before: fails (dark) → After: fixed | Before: fails (light, 3.68:1) → After: fixed | Before: Inter only, no heading distinction → After: Newsreader headings loaded |
| Fern | Before: BUG → After: fixed | Before: BUG → After: fixed | Before: fails (dark) → After: fixed | Before: fails (light, 3.30:1) → After: fixed | Before: Inter only, no heading distinction → After: Newsreader headings loaded |
| Cedar | Before: BUG → After: fixed | Before: BUG → After: fixed | Before: fails (dark) → After: fixed | Before: fails (light, 3.56:1) → After: fixed | Already correct — `Source_Serif_4` genuinely loaded via `next/font/google` and wired to `--fw-font-heading`; an initial audit pass mistakenly flagged this as "fallback only," corrected after directly reading `layout.tsx`. Left unchanged. |
| Mono | Before: BUG → After: fixed | Before: BUG → After: fixed | Before: fails (dark) → After: fixed | Before: fails (light, 3.61:1) → After: fixed | Intentional all-mono identity ("brutalist/terminal," the theme's own stated look) — unchanged, correct as designed |
| Base | Before: BUG → After: fixed | Before: BUG → After: fixed | Before: fails (dark) → After: fixed | Before: passes (5.17:1) already | Intentional system-font-only identity — `theme.css` carries an explicit comment ("minimal, neutral, unopinionated. No web fonts — pure system stack"), matching the CLI's own "Base — minimal & neutral" description. Left unchanged; adding a webfont here would contradict the theme's stated purpose. |

## 1. Layout — white border/gutter (the known bug)

**Root cause, confirmed three independent ways** (two parallel audits + a
direct reproduction in a real running instance): `packages/framework/src/
styles/tokens.css`'s `body` rule correctly resets `margin: 0` and sets
`background: var(--fw-bg)` — but the adjacent `html` rule (same file, ~line
91) sets **no background at all**. `body`'s reset is real and correct; the
bug isn't a leftover default margin. It's that nothing paints behind `body`.
On overscroll/rubber-band bounce (trackpad momentum scroll, mobile
pull-past-the-top), the browser reveals whatever is behind the document —
which defaults to white since `html` is transparent. Reproduced directly by
temporarily translating `<body>` in a live tab and observing a white strip
appear above it exactly where the bounce would show it.

- `[HIGH]` `packages/framework/src/styles/tokens.css:91-94` — `html` selector
  has no `background`. **Fix**: add `background: var(--fw-bg); color-scheme:
  light dark;`. One shared fix, applies to all 5 themes simultaneously (all
  5 templates' `layout.tsx` import this file first, before their own
  `theme.css`).

## 2. Responsiveness

- `[HIGH]` `packages/framework/src/styles/api.css:731` — `.fw-playground-panel`
  uses `width: 100vw` inside a `max-width: 40rem` media query. `100vw`
  includes the scrollbar gutter on most desktop browsers, causing horizontal
  overflow; the parent (`.fw-playground-overlay`) is already `position:
  fixed; inset: 0`, so no viewport unit is needed at all. **Fix**: `width: 100%`.
- `[HIGH, measured]` `.fw-shell-actions` (the top-right Search/theme-toggle/
  Ask-AI/Dashboard button cluster, rendered by every template's
  `top-bar.tsx`) genuinely overflows the viewport at a real 390px mobile
  width — measured directly: `document.body.scrollWidth` = 410px against a
  390px frame, a real 20px horizontal overflow, caused specifically by
  `.fw-askai-trigger` (the "Ask AI" button) not shrinking or collapsing.
  **Fix**: hide the Ask-AI button's text label (icon-only) below a
  narrow-width breakpoint, or fold it into the mobile drawer alongside the
  sidebar.
- `[MEDIUM, measured]` `.fw-shell-topnav` (`layout.css:51-58`,
  `overflow: hidden`, no `flex-wrap`) — the primary tab row ("Guides / API
  Reference / Documentation / GitHub Support Blog") visibly clips at tablet
  width (~834px) with no scroll or wrap affordance; each theme's own
  `max-width: 60rem` media query hides the anchor links/CTA but never
  touches `.fw-topnav-tabs` itself. **Fix**: `overflow-x: auto` with a
  hidden/thin scrollbar at narrow-but-not-mobile widths, or fold into the
  mobile drawer earlier.
- `[LOW]` Sidebar collapses to a drawer at `60rem` but the TOC rail only
  hides at `80rem` — a 20rem band where the primary nav is gone
  (hamburger-only) but the right-rail TOC still shows. Judgment call, not a
  hard bug — left as observed, not changed, since collapsing both at the
  same breakpoint is a design opinion, not a correctness fix.
- No other `100vw` usage found anywhere in the framework. Images/svg/video/
  canvas are correctly capped (`max-width: 100%`); tables and code blocks
  correctly scroll internally rather than blowing out page width — these
  were already correct, no action taken.

## 3. Color & contrast (WCAG AA)

Ratios computed with the real WCAG 2.1 relative-luminance formula against
actual hex values pulled from each theme's `theme.css` (not eyeballed).

- `[HIGH]` **Method pills** (`api.css:21`, `.fw-method-pill { color: #fff; }`
  hardcoded, not a token) fail AA in **every** theme, worst in dark mode:
  `put` 1.67:1, `head` 1.81:1, `get` 1.92:1 (needs 4.5:1 — font is 0.7rem
  bold, below the "large text" threshold, so the strict bar applies). Light
  mode also fails uniformly (2.9–3.7:1 across themes). This is a shared-
  token bug (`tokens.css`'s `--fw-method-*` palette), present identically in
  all 5 themes. **Fix**: replaced the white-text-on-saturated-fill pattern
  with the tinted-background + full-saturation-text pattern already proven
  elsewhere in this same file (`.fw-apiref-status-ok`) — text stays the
  method's own color (which meets contrast against the page background by
  construction, since it's the same color already used elsewhere as
  foreground text), background becomes a `color-mix(...14%...)` tint.
- `[HIGH]` **Primary CTA button** (`.fw-topnav-cta`, white text on
  `--fw-primary`) fails AA in light mode for 4 of 5 themes: Aurora 3.68:1,
  Fern 3.30:1, Cedar 3.56:1, Mono 3.61:1 — only Base already passes (5.17:1,
  its blue is dark enough). Dark mode passes everywhere (colors invert to
  dark-text-on-bright-chip, 6–10:1). **Fix**: darken the CTA background via
  `color-mix(in srgb, var(--fw-primary) 100%, black 14%)` applied once in
  the shared rule (self-adjusts per theme's own `--fw-primary`, verified
  post-fix to clear 4.5:1 for all 4 previously-failing themes — see
  Verification below) rather than hand-picking 5 separate darkened hex
  values.
- `[PASS]` Body text (`--fw-fg` on `--fw-bg`) and muted text (`--fw-muted`)
  clear 4.5:1 in all 5 themes × both modes (15–20:1 for body; 4.6–7.7:1 for
  muted, closest to the floor in aurora-light 4.76:1 and mono-dark 4.61:1 —
  no fix needed, flagged only as "little headroom if backgrounds shift").
- `[NONE]` No off-palette hardcoded hex values found in any theme.css beyond
  the method-pill issue above (already a shared-file finding, not per-theme
  drift) — every per-theme `rgba()`/`color-mix()` correctly derives from
  that theme's own `--fw-primary`.

## 4. Typography

- Type scale (`prose.css` h1→h6, badge/label sizes in `components.css`) is
  consistent and fully rem-based — no ad-hoc unitless or px sizes found. No
  fix needed.
- Two-voice rule: **Aurora and Fern map `--fw-font-heading` to the same
  value as `--fw-font`** (Inter in `layout.tsx`) — no real heading/body
  distinction exists at all, despite the two-voice intent. **Cedar** already
  does this correctly (`Source_Serif_4` genuinely loaded via
  `next/font/google`, wired to `--fw-font-heading` — verified directly in
  `layout.tsx`, not just theme.css's fallback chain). **Mono** deliberately
  uses monospace everywhere (its own stated identity — "brutalist /
  terminal"). **Base** deliberately loads no webfonts at all — an explicit
  comment in its `theme.css` states this ("minimal, neutral, unopinionated.
  No web fonts — pure system stack"), matching its own "start simple"
  positioning. Confirmed the Mono and Base cases are intentional design, not
  vibe-coded drift — left both unchanged.
- **Fix, a judgment call, applied only to Aurora and Fern**: rather than
  converting body prose to serif (which would erase each theme's own
  sans-based reading identity — Aurora explicitly bills itself
  "Nextra-inspired," and Nextra itself is all-sans), Newsreader is now
  loaded via `next/font/google` in Aurora and Fern's `layout.tsx` and wired
  to `--fw-font-heading` specifically — headings get a genuine second
  voice, body copy keeps each theme's existing sans, code keeps `--fw-mono`
  (JetBrains Mono, already correct everywhere per the shared-layer audit).
  Cedar, Mono, and Base were left untouched — each already has a
  deliberate, correct typographic identity of its own.

## 5. Spacing / hierarchy

- No formal spacing-scale token set exists (`tokens.css` has color/radius/
  shadow/motion tokens but no `--fw-space-*`). Spacing is ad-hoc `em`/`rem`
  values per component — visually consistent by convention (values cluster
  around a de-facto 4px/8px rhythm) but not enforced by a shared scale.
  `[MEDIUM]` — added `--fw-space-{1,2,3,4,6,8,12}` tokens to `tokens.css`
  and re-pointed the shell's structural gaps/paddings (header, sidebar,
  content, TOC) at them, leaving component-internal micro-spacing (e.g. a
  badge's own padding) as-is since those are legitimately component-scale,
  not layout-scale, values.

## 6. Modularity

- `[MEDIUM]` **~500 lines of near-byte-identical CSS duplicated 5×**: every
  theme's `theme.css` repeated the same `.fw-topnav-tab(s)/.fw-topnav-
  anchor(s)/.fw-topnav-navlink/.fw-topnav-cta/.fw-shell-brand` rule block.
  Since these rules already consume `--fw-*` tokens (which genuinely vary
  per theme), moving the *rules* into the shared `widgets.css` doesn't
  reduce per-theme distinctiveness — only the values differ, not the
  shapes. **Fix**: moved into the shared framework layer; each theme.css now
  only carries token overrides + Mono's genuine one-off tweaks
  (uppercase/letter-spacing), a ~90% reduction in that file's size.
- `[MEDIUM]` `.fw-apiref-method` (`components.css:989-1011`) duplicated
  `.fw-method-pill` (`api.css:10-31`) almost exactly, down to slightly
  drifted padding/font-size values (0.2em/0.72rem vs 0.15em/0.7rem) —
  organic copy-paste drift, not a deliberate variant. Fixed by pointing the
  inline `<ApiReference>` MDX component (`components.tsx`) at
  `fw-method-pill` directly and deleting the duplicate rule block.
- `[CORRECTED, not deleted]` An earlier pass of this audit initially flagged
  `Danger`, `Tooltip`, the inline `ApiReference`, and the inline
  `Playground` MDX components as dead code (zero references in any
  template's or example's `.mdx` content). Before deleting anything, checked
  `mdxComponents()`'s `BUILTINS` registry directly and found all four
  **are** registered as part of the framework's intentional public MDX
  component surface — the same category as `AuthorBio`/`RelatedPosts`/
  `NewsletterCTA`/`TableOfContents`, which are documented, exposed
  components a docs author can use in their own content even though the
  *shipped template demo content* doesn't happen to exercise them. Deleting
  them would have been a real breaking change to the framework's public API
  disguised as cleanup. **Kept all of them** — only the genuinely duplicate
  CSS (above) was removed, not any component.
- `[LOW]` `lib/icons.tsx` — `CircleDot` imported from `lucide-react` in all 5
  (byte-identical) templates but never referenced. Deleted.
- `[LOW, considered and declined]` `top-bar.tsx`'s `Logo`/`TabNav`/
  `AnchorLinks`/`buildTopBar` are pure, brand-agnostic, mechanical logic
  duplicated identically across all 5 templates — a candidate for
  extraction into the shared package. **Declined**: per this project's own
  "rule of three" / starter-template philosophy, a docs-site author is
  expected to hack on their own copy of the top bar directly (add a GitHub
  star count, a version switcher, etc.) — forcing that through a shared
  package's API would be worse DX than editing an owned file. Left as
  per-template boilerplate, deliberately.

## Verification performed

- **White-border root cause**: reproduced directly pre-fix by translating
  `<body>` in a live tab and observing a white strip appear where overscroll
  bounce would reveal it; post-fix, `getComputedStyle(html).backgroundColor`
  matches `body`'s exactly (confirmed `rgb(10, 10, 11)` on both, Aurora dark
  mode) and the translate test no longer reveals anything.
- **Mobile/tablet/desktop, measured, not just eyeballed**: iframe-based
  multi-viewport harness (390/834/1440px — built after this session's
  window-resize tool proved unreliable; `window.innerWidth` didn't change
  after a resize call even though the screenshot looked different) against
  real production builds (`next build` + `next start`, not dev mode).
  Pre-fix: `.fw-shell-actions` measured a genuine 20px horizontal overflow
  at 390px (`document.body.scrollWidth` 410 vs a 390px frame), caused by the
  Ask-AI button's label. Post-fix, re-measured on Aurora at all 3 widths:
  `bodyOverflow` (scrollWidth − frameWidth) is **−17 at every width**
  (comfortably within bounds — the −17 is the scrollbar gutter, not an
  overflow), `.fw-topnav-tabs` correctly reports `scrollable: true` at
  390px (tabs genuinely don't fit and now scroll instead of silently
  clipping) and `false` at 834/1440px (fit naturally, no scroll needed).
  Repeated the same 3-width measurement on Mono (the most visually
  divergent theme, good stress test for the shared-layer fix) — identical
  result, −17 overflow at all 3 widths, confirming the fix is genuinely
  shared, not Aurora-specific. Visual confirmation (screenshots) additionally
  taken across all 5 themes simultaneously at mobile width.
- **Contrast**: ratios computed with the real WCAG 2.1 relative-luminance
  formula from actual hex values *before* choosing the fix's darkening
  percentages (18% black-mix for the CTA background, 20% for method-pill
  text) — verified in Python that both percentages clear 4.5:1 for all 5
  themes' light-mode values with margin (min observed 4.66:1 and 4.73:1
  respectively) — then confirmed post-fix that dark mode (which already
  passed at 6–11:1 before any change) still passes after accounting for the
  new tokens' light-mode-only scoping. Visually re-confirmed by opening each
  theme's real `/api-reference` page: method pills render as legible
  colored-text-on-tint (Mono and Aurora screenshotted side by side) instead
  of the previous low-contrast white-on-solid-fill.
- **Typography**: screenshotted Aurora and Fern at mobile width — page
  headings ("Introduction," "Welcome to Fern") visibly render in a serif
  face distinct from the sans body copy below, confirming Newsreader
  actually loads and applies (not just a CSS fallback chain).
- `npx tsc --noEmit` and a real production `next build` (not just dev/
  typecheck) re-run for all 5 templates after the full fix pass — all 5
  exit 0 with zero errors; Pagefind's postbuild step re-confirmed
  `data-pagefind-body` is still correctly detected and indexing 12 pages
  each.
- **Clean CLI copy**: ran the actual scaffold CLI (`packages/cli/bin/
  index.mjs init ... --theme aurora --from templates`) against the fixed
  local templates directory — copy succeeded, the copied `layout.tsx`
  contains the Newsreader fix, `content/docs/docs.json` (the real config
  contract — `inkform.json` remains reserved/unused per the framework's own
  locked convention) copied through untouched, and the new `postbuild`
  script is present in the copied `package.json`. A full `npm install` from
  the fresh copy hits a pre-existing, unrelated blocker (`@inkform/
  framework` isn't published to npm yet — 404, already tracked in the
  ledger from an earlier pass) — not something this QA pass introduced or
  could fix, and orthogonal to whether the copy/scaffold mechanism itself
  works, which it does.

(See INKFORM_CONTEXT_LEDGER.md's "Template QA pass" entry for the narrative
account and file-level diff summary.)
