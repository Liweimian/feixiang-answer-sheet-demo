import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { MetisInput } from '@yuanfudao/metis-web-component'
import { EyeOff, GripVertical, LockKeyhole, Pencil } from 'lucide-react'
import type { AnswerSheetSettings, ExamPaper, HeaderLayout, HeaderModule } from '../features/answer-sheet/types'
import { clampHeaderModule, headerModulesOverlap, isHeaderModuleVisible, updateHeaderModule } from '../features/answer-sheet/headerGeometry'

interface AnswerSheetHeaderProps {
  header: HeaderLayout
  paper: ExamPaper
  settings: AnswerSheetSettings
  page: number
  pageCount: number
  editable?: boolean
  onChange?: (header: HeaderLayout) => void
  onTitleCommit?: (title: string) => void
}

function HeaderTitle({ paper, editable, onCommit }: { paper: ExamPaper; editable: boolean; onCommit?: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(paper.title)
  const cancelling = useRef(false)

  useEffect(() => {
    if (!editing) setDraft(paper.title)
  }, [editing, paper.title])

  const commit = () => {
    if (!editing) return
    if (cancelling.current) {
      cancelling.current = false
      setDraft(paper.title)
      setEditing(false)
      return
    }
    const value = draft.trim() || paper.title
    setDraft(value)
    setEditing(false)
    if (value !== paper.title) onCommit?.(value)
  }

  if (editing && editable) {
    return (
      <MetisInput
        className="header-title-input"
        autoFocus
        maxLength={36}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            cancelling.current = true
            setDraft(paper.title)
            event.currentTarget.blur()
          }
        }}
        aria-label="编辑答题卡标题"
      />
    )
  }

  return (
    <button
      type="button"
      className="header-title-edit"
      disabled={!editable}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        if (!editable) return
        cancelling.current = false
        setEditing(true)
      }}
    >
      <strong>{paper.title}</strong>
      <span>{paper.subject}答题卡</span>
      {editable && <Pencil size={10} />}
    </button>
  )
}

function HeaderModuleContent({ module, paper, settings, editable, onTitleCommit }: {
  module: HeaderModule
  paper: ExamPaper
  settings: AnswerSheetSettings
  editable: boolean
  onTitleCommit?: (title: string) => void
}) {
  if (module.kind === 'title') return <HeaderTitle paper={paper} editable={editable} onCommit={onTitleCommit} />
  if (module.kind === 'identity') {
    return <div className="header-identity-fields">{(module.fields ?? settings.identityFields).map((field) => <span key={field}><b>{field}</b><i /></span>)}</div>
  }
  if (module.kind === 'candidate-number') {
    const modes = settings.candidateNumberLayouts
      .filter((layout) => layout !== 'barcode')
      .map((layout) => layout === 'fill' ? '填涂' : '手写')
      .join(' + ')
    return <div className="header-number-module"><span className="header-number-label"><b>{module.fields?.[0] ?? '准考证号'}</b><small>{modes}</small></span><span className="header-number-boxes" style={{ gridTemplateColumns: `repeat(${settings.candidateNumberDigits}, minmax(0, 1fr))` }}>{Array.from({ length: settings.candidateNumberDigits }, (_, index) => <i key={index} />)}</span></div>
  }
  if (module.kind === 'barcode') {
    return <div className="header-barcode-module"><span className="header-barcode-lines" /><b>条形码粘贴处</b></div>
  }
  if (module.kind === 'notice') {
    const variant = settings.noticeStyle === 'daily' ? 'compact' : module.variant ?? 'detailed'
    return <div className={`header-notice-module is-${variant}`}><b>{module.label}</b><ol><li>核对姓名和考号，按要求粘贴条形码。</li><li>客观题使用 2B 铅笔规范填涂。</li><li>主观题使用黑色字迹签字笔作答。</li><li>答案须写在对应答题区域内。</li></ol></div>
  }
  if (module.kind === 'fill-sample') {
    return <div className={`header-fill-module is-${module.variant ?? 'detailed'}`}><b>{module.label}</b><span>正确填涂 <i className="fill-correct" /></span>{module.variant !== 'beijing-footer' && <span>错误填涂　●　×　—　✓</span>}</div>
  }
  return <div className={`header-absence-module is-${module.variant ?? 'detailed'}`}><b>{module.label}</b><span>□</span><small>由监考员填涂</small></div>
}

export function AnswerSheetHeader({ header, paper, settings, page, pageCount, editable = false, onChange, onTitleCommit }: AnswerSheetHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState('')
  const [preview, setPreview] = useState<HeaderModule>()
  const [invalid, setInvalid] = useState(false)
  const hideableKinds = new Set(['candidate-number', 'barcode', 'notice', 'fill-sample', 'absence-mark'])

  useEffect(() => {
    if (selectedId && !header.modules.some((item) => item.id === selectedId)) setSelectedId('')
  }, [header.modules, selectedId])

  if (page > 1) {
    return (
      <header className="exam-continuation-header">
        <strong>{paper.title}</strong>
        <div>{header.continuationFields.map((field) => <span key={field}><b>{field}</b><i /></span>)}</div>
        <em>第 {page} / {pageCount} 面</em>
      </header>
    )
  }

  const beginTransform = (event: ReactPointerEvent, module: HeaderModule, action: 'move' | 'resize') => {
    if (!editable || !onChange || action === 'move' && (event.target as HTMLElement).closest('button,input')) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(module.id)
    const container = containerRef.current
    if (!container) return
    const bounds = container.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const start = { ...module }
    let latest = start

    const move = (pointerEvent: PointerEvent) => {
      const dx = (pointerEvent.clientX - startX) / bounds.width * 100
      const dy = (pointerEvent.clientY - startY) / bounds.height * 100
      latest = clampHeaderModule(action === 'move'
        ? { ...start, x: start.x + dx, y: start.y + dy }
        : { ...start, width: start.width + dx, height: start.height + dy })
      const collision = header.modules.some((item) => item.id !== module.id && isHeaderModuleVisible(item, settings, header.hiddenItemIds) && headerModulesOverlap(latest, item))
      setInvalid(collision)
      setPreview(latest)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      const next = updateHeaderModule(header, module.id, latest, settings)
      setPreview(undefined)
      setInvalid(false)
      if (next !== header) onChange(next)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end, { once: true })
  }

  return (
    <header className="exam-header-shell">
      <div
        ref={containerRef}
        className="header-layout-canvas"
        style={{ height: header.height }}
        onPointerDown={() => setSelectedId('')}
      >
        {header.modules.filter((item) => isHeaderModuleVisible(item, settings, header.hiddenItemIds)).map((item) => {
          const module = preview?.id === item.id ? preview : item
          const selected = editable && selectedId === item.id
          const style = {
            left: `${module.x}%`,
            top: `${module.y}%`,
            width: `${module.width}%`,
            height: `${module.height}%`,
          } as CSSProperties
          return (
            <section
              key={item.id}
              className={`header-module kind-${item.kind} ${selected ? 'selected' : ''} ${preview?.id === item.id && invalid ? 'invalid' : ''}`}
              style={style}
              onPointerDown={(event) => beginTransform(event, item, 'move')}
              onClick={(event) => {
                event.stopPropagation()
                if (editable) setSelectedId(item.id)
              }}
              aria-label={`${item.label}${item.protected ? '，扫描关键区' : ''}`}
            >
              <HeaderModuleContent module={item} paper={paper} settings={settings} editable={editable && selected} onTitleCommit={onTitleCommit} />
              {editable && hideableKinds.has(item.kind) && <button
                type="button"
                className="header-hide-action"
                aria-label={`隐藏${item.label}`}
                title={`隐藏${item.label}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onChange?.({ ...header, customized: true, hiddenItemIds: [...(header.hiddenItemIds ?? []), item.id] })
                  setSelectedId('')
                }}
              ><EyeOff size={10} /> 隐藏</button>}
              {selected && <>
                <span className="header-module-label"><GripVertical size={10} />{item.label}{item.protected && <LockKeyhole size={9} />}</span>
                <button type="button" className="header-resize-handle" aria-label={`调整${item.label}大小`} onPointerDown={(event) => beginTransform(event, item, 'resize')} />
              </>}
            </section>
          )
        })}
      </div>
      {editable && <div className="header-template-badge"><span>{header.templateName}</span><em>{header.customized ? '已自定义' : header.evidenceLabel}</em><small>拖动模块调整位置，拖右下角调整大小</small></div>}
    </header>
  )
}
