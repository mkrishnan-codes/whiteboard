export type Tool = 'pen' | 'eraser'

export type Point = { x: number; y: number }

export type Stroke = {
  tool: Tool
  color: string
  width: number
  points: Point[]
}

export type BoardSettings = {
  tool: Tool
  color: string
  background: string
}

export const PEN_WIDTH = 3
export const ERASER_WIDTH = 28
export const STORAGE_KEY = 'whiteboard:v1'

export type Swatch = {
  name: string
  value: string
}

export const INK_COLORS: Swatch[] = [
  { name: 'Graphite', value: '#23211e' },
  { name: 'Chalk white', value: '#f7f4ec' },
  { name: 'Cobalt', value: '#2f5bd0' },
  { name: 'Vermilion', value: '#d14b32' },
  { name: 'Forest', value: '#2e6b4f' },
  { name: 'Ochre', value: '#c18f24' },
  { name: 'Plum', value: '#7a3f74' },
  { name: 'Sky', value: '#3d8fa8' },
]

export const PAPER_COLORS: Swatch[] = [
  { name: 'White', value: '#ffffff' },
  { name: 'Paper', value: '#f7f3e9' },
  { name: 'Fog', value: '#e9edef' },
  { name: 'Chalkboard', value: '#1f2a25' },
]

export const DEFAULT_SETTINGS: BoardSettings = {
  tool: 'pen',
  color: INK_COLORS[0].value,
  background: PAPER_COLORS[0].value,
}

type PersistedBoard = {
  version: 1
  settings: BoardSettings
  strokes: Stroke[]
}

export function loadBoard(): { settings: BoardSettings; strokes: Stroke[] } {
  if (typeof window === 'undefined') {
    return { settings: DEFAULT_SETTINGS, strokes: [] }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { settings: DEFAULT_SETTINGS, strokes: [] }
    }

    const parsed = JSON.parse(raw) as PersistedBoard
    if (parsed?.version !== 1 || !Array.isArray(parsed.strokes)) {
      return { settings: DEFAULT_SETTINGS, strokes: [] }
    }

    return {
      settings: normalizeSettings(parsed.settings),
      strokes: parsed.strokes.filter(isStroke),
    }
  } catch {
    return { settings: DEFAULT_SETTINGS, strokes: [] }
  }
}

export function saveBoard(settings: BoardSettings, strokes: Stroke[]) {
  try {
    const payload: PersistedBoard = { version: 1, settings, strokes }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage can be full or unavailable; drawing should keep working.
  }
}

function normalizeSettings(value: unknown): BoardSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SETTINGS
  }

  const candidate = value as Partial<BoardSettings>
  return {
    tool: candidate.tool === 'eraser' ? 'eraser' : 'pen',
    color: isHex(candidate.color) ? candidate.color : DEFAULT_SETTINGS.color,
    background: isHex(candidate.background)
      ? candidate.background
      : DEFAULT_SETTINGS.background,
  }
}

function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== 'object') {
    return false
  }

  const stroke = value as Partial<Stroke>
  return (
    (stroke.tool === 'pen' || stroke.tool === 'eraser') &&
    typeof stroke.color === 'string' &&
    typeof stroke.width === 'number' &&
    Array.isArray(stroke.points) &&
    stroke.points.every(isPoint)
  )
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object') {
    return false
  }

  const point = value as Partial<Point>
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function isHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

export function isDark(hex: string): boolean {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function configureContext(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.globalCompositeOperation =
    stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.globalAlpha = stroke.tool === 'eraser' ? 1 : 0.94
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function drawDot(ctx: CanvasRenderingContext2D, point: Point, radius: number) {
  ctx.beginPath()
  ctx.arc(point.x, point.y, radius / 2, 0, Math.PI * 2)
  ctx.fill()
}

/** Draws the newest segment of a stroke while the pointer is moving. */
export function drawStrokeTail(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const points = stroke.points
  const count = points.length

  ctx.save()
  configureContext(ctx, stroke)

  if (count === 1) {
    drawDot(ctx, points[0], stroke.width)
    ctx.restore()
    return
  }

  const previous = points[count - 2]
  const current = points[count - 1]
  const before = points[count - 3] ?? previous
  const start = midpoint(before, previous)
  const end = midpoint(previous, current)

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(previous.x, previous.y, end.x, end.y)
  ctx.stroke()
  ctx.restore()
}

/** Replays a finished stroke, used on resize, undo, and reload. */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const points = stroke.points
  const count = points.length

  ctx.save()
  configureContext(ctx, stroke)

  if (count === 1) {
    drawDot(ctx, points[0], stroke.width)
    ctx.restore()
    return
  }

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  if (count === 2) {
    ctx.lineTo(points[1].x, points[1].y)
  } else {
    for (let index = 1; index < count - 1; index += 1) {
      const point = points[index]
      const next = points[index + 1]
      const mid = midpoint(point, next)
      ctx.quadraticCurveTo(point.x, point.y, mid.x, mid.y)
    }

    const last = points[count - 1]
    ctx.lineTo(last.x, last.y)
  }

  ctx.stroke()
  ctx.restore()
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  pixelRatio: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  for (const stroke of strokes) {
    drawStroke(ctx, stroke)
  }
}
