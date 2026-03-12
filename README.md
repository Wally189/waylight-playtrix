# Waylight-Playtrix

Waylight-Playtrix is a static internal operating console for a solo business and its companion personal desk.

## Live structure

- `index.html`
  Redirect entry point to the business Front Desk.
- `playtrix-console.html`
  Main business Front Desk and working surface.
- `playtrix-focus.html`
  Shared focused-page shell for smaller subject pages across Workbench, Governance, Finance, and Library.
- `tools.html`
  Tools Deck launcher.
- `contacts.html`
  Contact register.
- `analytics.html`
  Simple business analytics view.
- `governance-calendar.html`
  Full governance calendar rendered from shared governance data.
- `personal-console.html`
  Personal companion console.
- `privacy.html`, `gdpr.html`, `terms.html`
  Waylight Atlantic legal/editorial pages.

## Shared app files

- `Assets/js/playtrix-storage.js`
  Shared localStorage helpers.
- `Assets/js/playtrix-governance.js`
  Canonical governance rhythm and shared timing logic.
- `Assets/js/playtrix-common.js`
  Shared footer/time helpers.
- `Assets/js/playtrix-shell.js`
  Shared grouped navigation.
- `Assets/js/playtrix-organiser.js`
  Shared registers, analytics, pressure view, and supporting business panels.
- `Assets/js/playtrix-kanban.js`
  Drag-and-drop workboard.
- `Assets/js/playtrix-tools.js`
  Tools Deck interactions.
- `Assets/css/playtrix-filofax.css`
  Shared Waylight-Playtrix visual system.
- `Assets/css/playtrix-kanban.css`
  Workboard styling.

## Important rule

The governance rhythm is a protected backbone. If you change it, update shared governance data in `Assets/js/playtrix-governance.js` rather than editing page copies.

## Current direction

The system is being refactored away from page-local logic toward:

- one shared navigation shell
- one shared focused-page shell for split subject views
- one shared governance source
- one shared storage layer
- derived front-desk summaries rather than duplicated manual panels
