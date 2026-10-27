# Whiteboard

A quiet, minimal canvas for drawing and erasing. Built with React, TypeScript,
and Vite.

## Features

- Freehand pen and eraser with smooth pointer input
- Eight chalk colors, plus a custom color picker
- Four paper tones, plus a custom background color
- Undo (including after clearing) and clear
- High-DPI canvas that redraws cleanly on resize
- Board contents and settings persist in `localStorage`
- Keyboard shortcuts: `B` pen, `E` eraser, `Cmd/Ctrl + Z` undo
- Responsive toolbar and touch-friendly canvas

No backend, no accounts, no network calls. Fonts are self-hosted.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build    # type-check and production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## Structure

```
src/
  components/
    Whiteboard.tsx   canvas, drawing state, history, persistence
    Toolbar.tsx      tool buttons and color popovers
  lib/
    board.ts         stroke types, rendering, storage, palettes
  App.tsx
  App.css
  index.css
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
