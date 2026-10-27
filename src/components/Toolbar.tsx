import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  INK_COLORS,
  PAPER_COLORS,
  type Swatch,
  type Tool,
} from '../lib/board'

type ToolbarProps = {
  tool: Tool
  color: string
  background: string
  canUndo: boolean
  hasContent: boolean
  onToolChange: (tool: Tool) => void
  onColorChange: (color: string) => void
  onBackgroundChange: (color: string) => void
  onUndo: () => void
  onDownload: () => void
  onClear: () => void
}

type Panel = 'ink' | 'paper' | null

function sameColor(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase()
}

function colorName(swatches: Swatch[], value: string, fallback: string) {
  return swatches.find((swatch) => sameColor(swatch.value, value))?.name ?? fallback
}

export function Toolbar({
  tool,
  color,
  background,
  canUndo,
  hasContent,
  onToolChange,
  onColorChange,
  onBackgroundChange,
  onUndo,
  onDownload,
  onClear,
}: ToolbarProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!panel) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPanel(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanel(null)
        lastTriggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [panel])

  const togglePanel = (next: Exclude<Panel, null>, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger
    setPanel((current) => (current === next ? null : next))
  }

  return (
    <div className="toolbar-shell" ref={rootRef}>
      {panel ? (
        <div
          id="toolbar-palette"
          className="palette"
          role="group"
          aria-label={panel === 'ink' ? 'Ink colors' : 'Paper colors'}
        >
          <Palette
            label={panel === 'ink' ? 'Ink' : 'Paper'}
            swatches={panel === 'ink' ? INK_COLORS : PAPER_COLORS}
            value={panel === 'ink' ? color : background}
            shape={panel === 'ink' ? 'round' : 'square'}
            onSelect={(next) => {
              if (panel === 'ink') {
                onColorChange(next)
              } else {
                onBackgroundChange(next)
              }
              setPanel(null)
              lastTriggerRef.current?.focus()
            }}
            onCustomChange={panel === 'ink' ? onColorChange : onBackgroundChange}
          />
        </div>
      ) : null}

      <div className="toolbar" role="toolbar" aria-label="Whiteboard tools">
        <div className="tool-group">
          <ToolButton
            label="Pen"
            shortcut="B"
            active={tool === 'pen'}
            onClick={() => onToolChange('pen')}
          >
            <PenIcon />
          </ToolButton>
          <ToolButton
            label="Eraser"
            shortcut="E"
            active={tool === 'eraser'}
            onClick={() => onToolChange('eraser')}
          >
            <EraserIcon />
          </ToolButton>
        </div>

        <span className="toolbar-divider" aria-hidden="true" />

        <div className="tool-group">
          <button
            type="button"
            className="tool-button color-button"
            data-open={panel === 'ink'}
            aria-label={`Ink color (${colorName(INK_COLORS, color, 'Custom')})`}
            aria-expanded={panel === 'ink'}
            aria-controls="toolbar-palette"
            title="Ink color"
            onClick={(event) => togglePanel('ink', event.currentTarget)}
          >
            <span className="ink-dot" style={{ backgroundColor: color }} />
          </button>

          <button
            type="button"
            className="tool-button color-button"
            data-open={panel === 'paper'}
            aria-label={`Paper color (${colorName(PAPER_COLORS, background, 'Custom')})`}
            aria-expanded={panel === 'paper'}
            aria-controls="toolbar-palette"
            title="Paper color"
            onClick={(event) => togglePanel('paper', event.currentTarget)}
          >
            <span className="paper-chip" style={{ backgroundColor: background }} />
          </button>
        </div>

        <span className="toolbar-divider" aria-hidden="true" />

        <div className="tool-group">
          <button
            type="button"
            className="tool-button"
            aria-label="Undo"
            aria-keyshortcuts="Meta+Z Control+Z"
            title="Undo (Cmd/Ctrl+Z)"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className="tool-button"
            aria-label="Download board as PNG"
            title="Download image (PNG)"
            disabled={!hasContent}
            onClick={onDownload}
          >
            <DownloadIcon />
          </button>
          <button
            type="button"
            className="tool-button"
            aria-label="Clear board"
            title="Clear board"
            disabled={!hasContent}
            onClick={onClear}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

type ToolButtonProps = {
  label: string
  shortcut?: string
  active: boolean
  onClick: () => void
  children: ReactNode
}

function ToolButton({ label, shortcut, active, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

type PaletteProps = {
  label: string
  swatches: Swatch[]
  value: string
  shape: 'round' | 'square'
  onSelect: (value: string) => void
  onCustomChange: (value: string) => void
}

function Palette({
  label,
  swatches,
  value,
  shape,
  onSelect,
  onCustomChange,
}: PaletteProps) {
  const isCustom = !swatches.some((swatch) => sameColor(swatch.value, value))

  return (
    <>
      <p className="palette-label">{label}</p>
      <div className="palette-swatches">
        {swatches.map((swatch) => {
          const active = sameColor(swatch.value, value)
          return (
            <button
              key={swatch.value}
              type="button"
              className="swatch"
              data-shape={shape}
              data-active={active}
              style={{ '--swatch': swatch.value } as CSSProperties}
              aria-label={swatch.name}
              aria-pressed={active}
              title={swatch.name}
              onClick={() => onSelect(swatch.value)}
            />
          )
        })}
      </div>

      <label className="custom-color" data-active={isCustom}>
        <span className="custom-color-chip" aria-hidden="true" />
        <span>Custom</span>
        <input
          type="color"
          value={value}
          aria-label={`Custom ${label.toLowerCase()} color`}
          onChange={(event) => onCustomChange(event.target.value)}
        />
      </label>
    </>
  )
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l1.3-4.3L16.4 4.6a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.3 18.7 4 20Z" />
      <path d="m14.6 6.4 3 3" />
    </svg>
  )
}

function EraserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 21-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
}
