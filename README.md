# Whiteboard

A quiet, minimal canvas for drawing and erasing. Built with React, TypeScript,
and Vite.

**Live:** [board.manuk.win](https://board.manuk.win)

## Features

- Freehand pen and eraser with smooth pointer input
- Eight chalk colors, plus a custom color picker
- Four paper tones, plus a custom background color
- Undo (including after clearing) and clear
- Download the board as a PNG at full canvas resolution
- Installable PWA with offline support
- High-DPI canvas that redraws cleanly on resize
- Board contents and settings persist in `localStorage`
- Keyboard shortcuts: `B` pen, `E` eraser, `Cmd/Ctrl + Z` undo
- Responsive toolbar and touch-friendly canvas

No backend, no accounts, no network calls. Fonts are self-hosted.

## Install as an app

Open [board.manuk.win](https://board.manuk.win) in a supported browser:

- **Chrome/Edge:** use the install icon in the address bar.
- **iOS Safari:** Share → Add to Home Screen.
- **Android Chrome:** menu → Install app.

The app shell, fonts, and icons are precached by the service worker, so the
board keeps working offline.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build    # type-check and production build
npm run lint     # oxlint
npm run preview  # preview the production build, including the PWA
```

The service worker is only enabled in production builds. Use `npm run preview`
to test installation and offline behavior locally.

## Structure

```
public/
  favicon.svg
  icons/            PWA and Apple touch icons
src/
  components/
    Whiteboard.tsx   canvas, drawing state, history, persistence, PNG export
    Toolbar.tsx      tool buttons and color popovers
  lib/
    board.ts         stroke types, rendering, storage, palettes
  App.tsx
  App.css
  index.css
vite.config.ts       Vite + PWA manifest and service worker
```

## Agent skills

Installed locally in `.opencode/skills` with
`npx @tech-leads-club/agent-skills`:

- `coding-guidelines`
- `react-best-practices`
- `react-composition-patterns`
- `frontend-design`
- `accessibility`
- `perf-web-optimization`

Skill content is provided by
[Tech Leads Club](https://github.com/tech-leads-club/agent-skills) under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
