import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ERASER_WIDTH,
  INK_COLORS,
  PEN_WIDTH,
  drawBoard,
  drawStrokeTail,
  isDark,
  loadBoard,
  saveBoard,
  type Point,
  type Stroke,
  type Tool,
} from '../lib/board'
import { Toolbar } from './Toolbar'

export function Whiteboard() {
  const [initial] = useState(loadBoard)
  const [tool, setTool] = useState<Tool>(initial.settings.tool)
  const [color, setColor] = useState(initial.settings.color)
  const [background, setBackground] = useState(initial.settings.background)
  const [hasContent, setHasContent] = useState(initial.strokes.length > 0)
  const [canUndo, setCanUndo] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const eraserCursorRef = useRef<HTMLDivElement>(null)
  const strokesRef = useRef<Stroke[]>(initial.strokes)
  const undoStackRef = useRef<Stroke[][]>([])
  const activeStrokeRef = useRef<Stroke | null>(null)
  const activePointerRef = useRef<number | null>(null)
  const pixelRatioRef = useRef(1)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    drawBoard(context, strokesRef.current, pixelRatioRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2.5)
      const width = Math.max(1, Math.round(bounds.width * ratio))
      const height = Math.max(1, Math.round(bounds.height * ratio))

      pixelRatioRef.current = ratio
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      drawBoard(context, strokesRef.current, ratio)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    saveBoard({ tool, color, background }, strokesRef.current)
  }, [tool, color, background])

  const updateEraserCursor = useCallback((x: number, y: number, visible: boolean) => {
    const cursor = eraserCursorRef.current
    if (!cursor) {
      return
    }

    cursor.style.transform = `translate3d(${x - ERASER_WIDTH / 2}px, ${y - ERASER_WIDTH / 2}px, 0)`
    cursor.style.opacity = visible ? '1' : '0'
  }, [])

  useEffect(() => {
    if (tool !== 'eraser') {
      updateEraserCursor(0, 0, false)
    }
  }, [tool, updateEraserCursor])

  const pointFromEvent = (event: { clientX: number; clientY: number }, bounds: DOMRect): Point => ({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (activePointerRef.current !== null) {
      return
    }

    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    canvas.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId

    const bounds = canvas.getBoundingClientRect()
    const stroke: Stroke = {
      tool,
      color,
      width: tool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH,
      points: [pointFromEvent(event, bounds)],
    }

    strokesRef.current.push(stroke)
    activeStrokeRef.current = stroke
    setHasContent(true)
    drawStrokeTail(context, stroke)

    if (tool === 'eraser') {
      updateEraserCursor(event.clientX, event.clientY, true)
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser') {
      updateEraserCursor(event.clientX, event.clientY, true)
    }

    if (event.pointerId !== activePointerRef.current) {
      return
    }

    const stroke = activeStrokeRef.current
    const context = event.currentTarget.getContext('2d')
    if (!stroke || !context) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const nativeEvent = event.nativeEvent
    const coalesced = nativeEvent.getCoalescedEvents?.() ?? []
    const samples = coalesced.length > 0 ? coalesced : [nativeEvent]

    for (const sample of samples) {
      const point = pointFromEvent(sample, bounds)
      const last = stroke.points[stroke.points.length - 1]
      if (Math.hypot(point.x - last.x, point.y - last.y) < 1.1) {
        continue
      }

      stroke.points.push(point)
      drawStrokeTail(context, stroke)
    }
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== activePointerRef.current) {
      return
    }

    const canvas = event.currentTarget
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    if (activeStrokeRef.current) {
      undoStackRef.current.push(strokesRef.current.slice(0, -1))
      setCanUndo(true)
    }

    activeStrokeRef.current = null
    activePointerRef.current = null
    updateEraserCursor(event.clientX, event.clientY, false)
    redraw()
    saveBoard({ tool, color, background }, strokesRef.current)
  }

  const handlePointerLeave = () => {
    if (tool === 'eraser') {
      updateEraserCursor(0, 0, false)
    }
  }

  const handleToolChange = useCallback((next: Tool) => {
    setTool(next)
  }, [])

  const handleColorChange = useCallback((next: string) => {
    setColor(next)
    setTool('pen')
  }, [])

  const handleBackgroundChange = useCallback((next: string) => {
    setBackground(next)
    setColor((current) => {
      const isNeutral = INK_COLORS.slice(0, 2).some(
        (swatch) => swatch.value.toLowerCase() === current.toLowerCase(),
      )
      if (!isNeutral) {
        return current
      }

      return isDark(next) ? INK_COLORS[1].value : INK_COLORS[0].value
    })
  }, [])

  const undo = useCallback(() => {
    if (activePointerRef.current !== null) {
      return
    }

    const snapshot = undoStackRef.current.pop()
    if (!snapshot) {
      return
    }

    strokesRef.current = snapshot
    setCanUndo(undoStackRef.current.length > 0)
    setHasContent(snapshot.length > 0)
    redraw()
    saveBoard({ tool, color, background }, snapshot)
  }, [background, color, redraw, tool])

  const clear = useCallback(() => {
    if (activePointerRef.current !== null || strokesRef.current.length === 0) {
      return
    }

    undoStackRef.current.push(strokesRef.current.slice())
    strokesRef.current = []
    setCanUndo(true)
    setHasContent(false)
    redraw()
    saveBoard({ tool, color, background }, [])
  }, [background, color, redraw, tool])

  const download = useCallback(() => {
    const source = canvasRef.current
    if (!source || strokesRef.current.length === 0) {
      return
    }

    const output = document.createElement('canvas')
    output.width = source.width
    output.height = source.height

    const context = output.getContext('2d')
    if (!context) {
      return
    }

    context.fillStyle = background
    context.fillRect(0, 0, output.width, output.height)
    context.drawImage(source, 0, 0)

    output.toBlob((blob) => {
      if (!blob) {
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportFileName(new Date())
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }, [background])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return
      }

      const withModifier = event.metaKey || event.ctrlKey
      if (withModifier && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }

      if (withModifier || event.altKey) {
        return
      }

      if (event.key === 'b' || event.key === 'p') {
        setTool('pen')
      } else if (event.key === 'e') {
        setTool('eraser')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])

  const boardStyle = {
    backgroundColor: background,
    '--board-ink': isDark(background) ? '#f7f4ec' : '#23211e',
  } as CSSProperties

  return (
    <main className="board" style={boardStyle}>
      <canvas
        ref={canvasRef}
        className="board-canvas"
        data-tool={tool}
        aria-label="Drawing area"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={handlePointerLeave}
      />

      <div
        className={`board-empty${hasContent ? ' is-hidden' : ''}`}
        aria-hidden="true"
      >
        <p className="board-empty-title">Start with a line.</p>
        <p className="board-empty-hint">
          <kbd>B</kbd> pen <span aria-hidden="true">·</span> <kbd>E</kbd> eraser
        </p>
      </div>

      <div
        ref={eraserCursorRef}
        className="eraser-cursor"
        style={{ width: ERASER_WIDTH, height: ERASER_WIDTH }}
        aria-hidden="true"
      />

      <Toolbar
        tool={tool}
        color={color}
        background={background}
        canUndo={canUndo}
        hasContent={hasContent}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onBackgroundChange={handleBackgroundChange}
        onUndo={undo}
        onDownload={download}
        onClear={clear}
      />
    </main>
  )
}

function exportFileName(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `whiteboard-${day}-${time}.png`
}
