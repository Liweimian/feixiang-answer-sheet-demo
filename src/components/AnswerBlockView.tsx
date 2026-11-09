import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MetisInput, MetisInputNumber, MetisRadio, MetisSelect } from '@yuanfudao/metis-web-component'
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, GripVertical, Image, Italic, LockKeyhole, Omega, Pencil, Plus, Redo2, Square, SquareDashed, Sigma, Table2, Trash2, Underline, Undo2 } from 'lucide-react'
import { isQuestionBlockKind, type AnswerBlock, type AnswerBlockKind, type ContentElement, type FillSlotSetting, type FillSlotStyle, type ObjectiveSortMode } from '../features/answer-sheet/types'
import { formatQuestionRange, questionNumbers } from '../features/answer-sheet/range'

interface AnswerBlockViewProps {
  block: AnswerBlock
  layout: { x: number; y: number; width: number }
  seamlessTop?: boolean
  seamlessLeft?: boolean
  selected: boolean
  multiSelected?: boolean
  locked?: boolean
  onSelect: (additive?: boolean) => void
  onTitleCommit?: (title: string) => void
  onMoveCommit?: (x: number, y: number, page: number) => void
  onResizeCommit?: (height: number, width: number) => void
  onToggleContent?: (element: ContentElement) => void
  onUpdateBlock?: (patch: Partial<AnswerBlock>) => void
  onInsertAfter?: (kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle'], position?: 'before' | 'after') => void
  onDeleteBlock?: () => void
  onUndo?: () => void
  onRedo?: () => void
  questionAnswer?: boolean
  questionContext?: string
  objectiveSortMode?: ObjectiveSortMode
  objectiveMerge?: boolean
  subjectiveAnswerStyle?: 'blank' | 'lines'
  subjectiveLineHeight?: number
  subjectiveManualGrading?: boolean
  manualScoreStyle?: 'handwrite' | 'slash'
  allowHalfScore?: boolean
}

function ObjectiveGrid({ block, compact = false, sortMode = 'number-horizontal-option-horizontal', merged = true }: { block: AnswerBlock; compact?: boolean; sortMode?: ObjectiveSortMode; merged?: boolean }) {
  const questions = questionNumbers(block.range)
  if (questions.length === 0) return <div className="unconfigured-block">请在左侧设置题号范围与分值</div>
  const options = block.objectiveMode === 'judge' ? ['T', 'F'] : ['A', 'B', 'C', 'D', 'E'].slice(0, block.optionCount ?? 4)
  return (
    <div
      className={`objective-grid adaptive sort-${sortMode} ${merged ? 'layout-merged' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--objective-rows': Math.max(1, block.itemsPerColumn ?? 10) } as CSSProperties}
    >
      {questions.map((no) => (
        <div key={no} className="bubble-row" style={{ gridTemplateColumns: sortMode === 'number-horizontal-option-vertical' ? '24px' : `24px repeat(${options.length}, 18px)` }}>
          <b>{no}</b>
          {options.map((option) => <span key={option}>[{option}]</span>)}
        </div>
      ))}
    </div>
  )
}

function RuledLines({ count, dashed = false }: { count: number; dashed?: boolean }) {
  return (
    <div className={`ruled-lines ${dashed ? 'dashed' : ''}`}>
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  )
}

function scoreKeys(block: AnswerBlock) {
  return questionNumbers(block.range).flatMap((number, questionIndex) => {
    const count = block.answerSlotCounts?.[questionIndex] ?? 0
    const slots = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: count }, (_, index) => index + 1)
    return count > 0 ? slots.map((slot) => `${number}.${slot}`) : [String(number)]
  })
}

function questionScore(block: AnswerBlock, key: string) {
  if (!block.showUnitScore) return undefined
  if (block.questionScores?.[key] !== undefined) return block.questionScores[key]
  const keys = scoreKeys(block)
  if (!keys.length || block.score === undefined) return undefined
  return Number((block.score / keys.length).toFixed(2))
}

function QuestionScore({ block, scoreKey }: { block: AnswerBlock; scoreKey: string }) {
  const score = questionScore(block, scoreKey)
  return score === undefined ? null : <small className="question-unit-score">（{score}分）</small>
}

function AnswerMarks({ block }: { block: AnswerBlock }) {
  const numbers = questionNumbers(block.range)
  const mark = block.responseStyle === 'square' ? '□' : '（　）'
  return <div className="answer-marks">{numbers.map((number) => <span key={number}><b>{number}.</b><QuestionScore block={block} scoreKey={String(number)} />{mark}</span>)}</div>
}

function GridPaper({ rows = 8, cells, variant = 'grid' }: { rows?: number; cells?: number; variant?: 'grid' | 'tian' | 'mi' }) {
  const count = Math.max(12, Math.min(2000, cells ?? rows * 12))
  const countMarkers = cells ? Array.from({ length: Math.floor(count / 200) }, (_, index) => (index + 1) * 200) : []
  return (
    <div className={`writing-grid writing-grid-${variant} ${cells ? 'writing-grid-composition' : ''}`}>
      {Array.from({ length: count }, (_, index) => <i key={index} />)}
      {countMarkers.map((marker) => (
        <span
          key={marker}
          className="writing-count-marker"
          style={{ top: `${marker / count * 100}%` }}
          aria-label={`已到 ${marker} 字`}
        >▲ {marker}字</span>
      ))}
    </div>
  )
}

function ShortAnswerContent({
  block,
  fillModule = false,
  lineHeight = 16,
  activeSlotKey,
  onSlotClick,
}: {
  block: AnswerBlock
  fillModule?: boolean
  lineHeight?: number
  activeSlotKey?: string | null
  onSlotClick?: (slotKey: string) => void
}) {
  const count = block.lineCount ?? 4
  const numbers = questionNumbers(block.range)
  const dashed = block.lineStyle === 'dashed'
  if (fillModule && !block.answerSlotCounts?.length) {
    const fullLineCount = Math.max(2, Math.floor((block.height - 48) / Math.max(12, lineHeight)))
    return <div className="full-module-answer"><div className="answer-number-strip">{numbers.map((number) => <b key={number}>{number}.<QuestionScore block={block} scoreKey={String(number)} /></b>)}</div><RuledLines count={fullLineCount} dashed={dashed} /></div>
  }
  if (block.answerVariant === 'solution' && numbers.length > 0) {
    return <div className="solution-question-groups">{numbers.map((no, questionIndex) => {
      const subCount = block.answerSlotCounts?.[questionIndex] ?? 0
      const totalLines = block.questionLineCounts?.[String(no)] ?? Math.max(2, Math.floor(count / Math.max(1, numbers.length)))
      const slots = subCount > 0 ? Array.from({ length: subCount }, (_, index) => index + 1) : [0]
      return <section key={no}><b>{no}.</b>{slots.map((slot) => <div key={slot} className="solution-subquestion">{slot > 0 && <em>（{slot}）<QuestionScore block={block} scoreKey={`${no}.${slot}`} /></em>}{slot === 0 && <QuestionScore block={block} scoreKey={String(no)} />}<RuledLines count={Math.max(1, Math.floor(totalLines / slots.length))} dashed={dashed} /></div>)}</section>
    })}</div>
  }
  if (block.answerSlotCounts?.length && numbers.length > 0) {
    return (
      <div className="short-answer-slots">
        {numbers.map((no, questionIndex) => {
          const slotCount = Math.max(1, block.answerSlotCounts?.[questionIndex] ?? 1)
          const slotNumbers = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: slotCount }, (_, index) => index + 1)
          return (
            <div key={no} className="short-answer-slot-row">
              <b>{no}.</b>
              {Array.from({ length: slotCount }, (_, slotIndex) => {
                const slotNumber = slotNumbers[slotIndex] ?? slotIndex + 1
                const slotKey = `${no}.${slotNumber}`
                const setting = block.answerSlotSettings?.[slotKey]
                const style = setting?.style ?? block.responseStyle ?? 'lines'
                const cellCount = style === 'tian' ? Math.max(1, Math.min(20, setting?.count ?? 4)) : 1
                return <span
                  key={slotIndex}
                  className={`slot-style-${style} ${onSlotClick ? 'fill-slot-clickable' : ''} ${activeSlotKey === slotKey ? 'active-slot' : ''}`}
                  role={onSlotClick ? 'button' : undefined}
                  tabIndex={onSlotClick ? 0 : undefined}
                  aria-label={onSlotClick ? `设置第${no}题第${slotNumber}空` : undefined}
                  onClick={onSlotClick ? (event) => { event.stopPropagation(); onSlotClick(slotKey) } : undefined}
                  onKeyDown={onSlotClick ? (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    event.stopPropagation()
                    onSlotClick(slotKey)
                  } : undefined}
                ><em>{slotCount > 1 ? `(${slotNumber})` : ''}<QuestionScore block={block} scoreKey={slotKey} /></em><span className="slot-response-cells">{Array.from({ length: cellCount }, (_, cellIndex) => <i key={cellIndex} />)}</span></span>
              })}
            </div>
          )
        })}
      </div>
    )
  }
  if (block.responseStyle === 'bracket' || block.responseStyle === 'square') return <AnswerMarks block={block} />
  if (block.responseStyle === 'grid' || block.responseStyle === 'tian' || block.responseStyle === 'mi') return <GridPaper rows={Math.max(4, block.lineCount ?? 4)} cells={block.responseStyle === 'grid' ? block.wordCount : undefined} variant={block.responseStyle === 'grid' ? 'grid' : block.responseStyle} />
  if (block.responseStyle === 'four-line') return <div className="four-line-grid">{Array.from({ length: Math.max(2, block.lineCount ?? 4) }, (_, index) => <span key={index}>{Array.from({ length: 4 }, (_, line) => <i key={line} />)}</span>)}</div>
  if (block.responseStyle === 'blank') return <div className="blank-response-area" />
  if (numbers.length > 1) {
    const linesPerQuestion = Math.max(2, Math.floor(count / numbers.length))
    return (
      <div className="short-answer-groups">
        {numbers.map((no) => <div key={no}><b>{no}.<QuestionScore block={block} scoreKey={String(no)} /></b><RuledLines count={linesPerQuestion} dashed={dashed} /></div>)}
      </div>
    )
  }
  return <div className="single-short-answer"><b>{numbers[0] ?? '　'}.<QuestionScore block={block} scoreKey={String(numbers[0] ?? '')} /></b><RuledLines count={count} dashed={dashed} /></div>
}

function RichElements({ elements = [] }: { elements?: ContentElement[] }) {
  if (!elements.length) return null
  return (
    <div className={`rich-elements ${elements.includes('table') ? 'has-table' : ''}`}>
      {elements.includes('table') && <span className="rich-table"><Table2 size={12} />{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</span>}
      {elements.includes('formula') && <span className="rich-formula"><Sigma size={12} /> x² + y² = ______</span>}
      {elements.includes('image') && <span className="rich-image"><Image size={12} /> 图片作答素材区</span>}
    </div>
  )
}

function ScoreBox({ block, enabled, style = 'handwrite', allowHalfScore = false }: { block: AnswerBlock; enabled?: boolean; style?: 'handwrite' | 'slash'; allowHalfScore?: boolean }) {
  if (!enabled) return null
  const keys = scoreKeys(block)
  const fallback = (block.score ?? 0) / Math.max(1, keys.length)
  return <div className={`manual-score-list style-${style}`}>{keys.map((key) => {
    const score = Math.max(0, block.questionScores?.[key] ?? fallback)
    if (style === 'handwrite') return <div className="manual-score-item" key={key}><b>{key}</b><span className="handwrite-score-box" aria-label={`${key}题手写分数框`} /></div>
    const wholeMax = Math.floor(score)
    const highScore = wholeMax > 20
    return <div className="manual-score-item" key={key}><b>{key}</b>{highScore ? <div className="digit-score-rail"><span>十位</span>{Array.from({ length: Math.floor(wholeMax / 10) + 1 }, (_, value) => <i key={`t${value}`}>{value}</i>)}<span>个位</span>{Array.from({ length: 10 }, (_, value) => <i key={`o${value}`}>{value}</i>)}{allowHalfScore && <i className="half-score">0.5</i>}</div> : <div className="slash-score-rail">{Array.from({ length: wholeMax + 1 }, (_, index) => wholeMax - index).map((value) => <i key={value}>{value}</i>)}{allowHalfScore && <i className="half-score">0.5</i>}</div>}</div>
  })}</div>
}

export function AnswerBlockView({ block, layout, seamlessTop = false, seamlessLeft = false, selected, multiSelected = false, locked = false, onSelect, onTitleCommit, onMoveCommit, onResizeCommit, onToggleContent, onUpdateBlock, onInsertAfter, onDeleteBlock, onUndo, onRedo, questionAnswer = false, questionContext, objectiveSortMode = 'number-horizontal-option-horizontal', objectiveMerge = true, subjectiveAnswerStyle = 'lines', subjectiveLineHeight = 16, subjectiveManualGrading = false, manualScoreStyle = 'handwrite', allowHalfScore = false }: AnswerBlockViewProps) {
  const [resizeHeight, setResizeHeight] = useState(block.height)
  const [draftLayout, setDraftLayout] = useState(layout)
  const style = {
    '--block-height': `${resizeHeight}px`,
    '--answer-line-height': `${subjectiveLineHeight}px`,
    left: `${draftLayout.x}%`,
    top: `${draftLayout.y}px`,
    width: `${draftLayout.width}%`,
  } as CSSProperties
  const questionCount = questionNumbers(block.range).length
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(block.title)
  const [editingForbiddenText, setEditingForbiddenText] = useState(false)
  const [forbiddenTextDraft, setForbiddenTextDraft] = useState(block.contentText || '请勿在此区域作答')
  const [settingsPanel, setSettingsPanel] = useState<'answer' | 'subquestion' | 'insert' | null>(null)
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null)
  const [slotNumberDrafts, setSlotNumberDrafts] = useState<string[]>([])
  const cancelling = useRef(false)

  useEffect(() => {
    if (!editingTitle) setTitleDraft(block.title)
  }, [block.title, editingTitle])

  useEffect(() => {
    if (!editingForbiddenText) setForbiddenTextDraft(block.contentText || '请勿在此区域作答')
  }, [block.contentText, editingForbiddenText])

  useEffect(() => setResizeHeight(block.height), [block.height])
  useEffect(() => setDraftLayout(layout), [layout.x, layout.y, layout.width])
  useEffect(() => {
    setSettingsPanel(null)
    setActiveSlotKey(null)
  }, [block.id])

  const openAnswerSettings = () => {
    const counts = block.answerSlotCounts ?? questionNumbers(block.range).map(() => 1)
    setSlotNumberDrafts(counts.map((count, questionIndex) => (
      block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: count }, (_, index) => index + 1)
    ).join(',')))
    setSettingsPanel('answer')
  }

  const openSlotSettings = (slotKey: string) => {
    setActiveSlotKey(slotKey)
    openAnswerSettings()
  }

  const commitSlotNumbers = () => {
    const fallbackCounts = block.answerSlotCounts ?? questionNumbers(block.range).map(() => 1)
    const nextNumbers = fallbackCounts.map((count, questionIndex) => {
      const parsed = (slotNumberDrafts[questionIndex] ?? '')
        .split(/[\s,，、]+/)
        .map((value) => Number(value))
        .filter((value, index, values) => Number.isInteger(value) && value > 0 && value <= 99 && values.indexOf(value) === index)
      return parsed.length ? parsed : Array.from({ length: count }, (_, index) => index + 1)
    })
    onUpdateBlock?.({ answerSlotNumbers: nextNumbers, answerSlotCounts: nextNumbers.map((numbers) => numbers.length) })
    setSettingsPanel(null)
  }

  const updateSlotSetting = (slotKey: string, patch: Partial<FillSlotSetting>) => {
    const current = block.answerSlotSettings?.[slotKey] ?? { style: (block.responseStyle === 'tian' || block.responseStyle === 'mi' || block.responseStyle === 'four-line' ? block.responseStyle : 'lines') as FillSlotStyle }
    onUpdateBlock?.({
      answerSlotSettings: {
        ...block.answerSlotSettings,
        [slotKey]: { ...current, ...patch },
      },
    })
  }

  const beginMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (locked || !onMoveCommit) return
    event.preventDefault()
    event.stopPropagation()
    const container = event.currentTarget.closest('.paper-blocks') as HTMLElement | null
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const scale = containerRect.width / container.offsetWidth || 1
    const viewport = container.closest('.paper-viewport') as HTMLElement | null
    const blockElement = event.currentTarget.closest('.answer-block') as HTMLElement | null
    if (!blockElement) return
    const blockRect = blockElement.getBoundingClientRect()
    const pointerOffsetX = (event.clientX - blockRect.left) / scale
    const pointerOffsetY = (event.clientY - blockRect.top) / scale
    const startX = event.clientX
    const startY = event.clientY
    const start = draftLayout
    let highlightedTarget: HTMLElement | null = null
    const targetAt = (clientX: number, clientY: number) => document.elementsFromPoint(clientX, clientY)
      .map((element) => element.classList.contains('paper-blocks') ? element : element.closest('.paper-blocks'))
      .find((element): element is HTMLElement => element instanceof HTMLElement) ?? null
    const clearTarget = () => {
      highlightedTarget?.classList.remove('drop-target')
      highlightedTarget = null
    }
    const resolveFreePosition = (target: HTMLElement, clientX: number, clientY: number) => {
      const targetRect = target.getBoundingClientRect()
      const targetScale = targetRect.width / target.offsetWidth || 1
      const width = target.offsetWidth * start.width / 100
      const height = block.height
      const desiredX = Math.max(0, Math.min(target.offsetWidth - width, (clientX - targetRect.left) / targetScale - pointerOffsetX))
      const desiredY = Math.max(0, Math.min(target.offsetHeight - height, (clientY - targetRect.top) / targetScale - pointerOffsetY))
      const gap = 0
      const occupied = [...target.querySelectorAll<HTMLElement>('.answer-block')]
        .filter((element) => element.dataset.blockId !== block.id)
        .map((element) => ({ left: element.offsetLeft, top: element.offsetTop, right: element.offsetLeft + element.offsetWidth, bottom: element.offsetTop + element.offsetHeight }))
      const xCandidates = [desiredX, 0, ...occupied.flatMap((rect) => [rect.right + gap, rect.left - width - gap])]
      const yCandidates = [desiredY, 0, ...occupied.flatMap((rect) => [rect.bottom + gap, rect.top - height - gap])]
      const candidates = xCandidates.flatMap((x) => yCandidates.map((y) => ({
        x: Math.max(0, Math.min(target.offsetWidth - width, x)),
        y: Math.max(0, Math.min(target.offsetHeight - height, y)),
      })))
      const available = candidates.filter((candidate) => occupied.every((rect) => (
        candidate.x + width + gap <= rect.left
        || candidate.x >= rect.right + gap
        || candidate.y + height + gap <= rect.top
        || candidate.y >= rect.bottom + gap
      )))
      available.sort((a, b) => Math.hypot(a.x - desiredX, a.y - desiredY) - Math.hypot(b.x - desiredX, b.y - desiredY))
      return available[0] ? { x: available[0].x / target.offsetWidth * 100, y: available[0].y } : undefined
    }
    const move = (pointerEvent: PointerEvent) => {
      const deltaX = (pointerEvent.clientX - startX) / scale / container.offsetWidth * 100
      const deltaY = (pointerEvent.clientY - startY) / scale
      const x = Math.max(0, Math.min(100 - start.width, start.x + deltaX))
      const y = Math.max(0, Math.min(container.offsetHeight - block.height, start.y + deltaY))
      setDraftLayout({ ...start, x, y })
      if (viewport) {
        const viewportRect = viewport.getBoundingClientRect()
        if (pointerEvent.clientY > viewportRect.bottom - 48) viewport.scrollBy({ top: 24 })
        if (pointerEvent.clientY < viewportRect.top + 48) viewport.scrollBy({ top: -24 })
      }
      const target = targetAt(pointerEvent.clientX, pointerEvent.clientY)
      if (target !== highlightedTarget) {
        clearTarget()
        highlightedTarget = target
        highlightedTarget?.classList.add('drop-target')
      }
    }
    const finish = (pointerEvent: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      const target = targetAt(pointerEvent.clientX, pointerEvent.clientY) ?? container
      const position = resolveFreePosition(target, pointerEvent.clientX, pointerEvent.clientY)
      clearTarget()
      if (!position) {
        setDraftLayout(start)
        return
      }
      const targetPage = Number(target.closest('[data-paper-page]')?.getAttribute('data-paper-page') ?? block.page)
      setDraftLayout({ ...start, ...position })
      onMoveCommit(position.x, position.y, targetPage)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }

  const beginResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || !onResizeCommit) return
    event.preventDefault()
    event.stopPropagation()
    const startY = event.clientY
    const startX = event.clientX
    const startHeight = resizeHeight
    const container = event.currentTarget.closest('.paper-blocks') as HTMLElement | null
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const scale = containerRect.width / container.offsetWidth || 1
    const move = (pointerEvent: PointerEvent) => {
      const height = Math.max(48, Math.min(620, Math.round(startHeight + (pointerEvent.clientY - startY) / scale)))
      const widthDelta = (pointerEvent.clientX - startX) / scale / container.offsetWidth * 100
      setResizeHeight(height)
      setDraftLayout((current) => ({ ...current, width: Math.max(18, Math.min(100 - current.x, layout.width + widthDelta)) }))
    }
    const finish = (pointerEvent: PointerEvent) => {
      const nextHeight = Math.max(48, Math.min(620, Math.round(startHeight + (pointerEvent.clientY - startY) / scale)))
      const widthDelta = (pointerEvent.clientX - startX) / scale / container.offsetWidth * 100
      const nextWidth = Math.max(18, Math.min(100 - draftLayout.x, layout.width + widthDelta))
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      const proposedWidth = container.offsetWidth * nextWidth / 100
      const proposedLeft = container.offsetWidth * draftLayout.x / 100
      const overlaps = [...container.querySelectorAll<HTMLElement>('.answer-block')]
        .filter((element) => element.dataset.blockId !== block.id)
        .some((element) => !(
          proposedLeft + proposedWidth <= element.offsetLeft
          || proposedLeft >= element.offsetLeft + element.offsetWidth
          || draftLayout.y + nextHeight <= element.offsetTop
          || draftLayout.y >= element.offsetTop + element.offsetHeight
        ))
      if (overlaps) {
        setResizeHeight(block.height)
        setDraftLayout(layout)
        return
      }
      setResizeHeight(nextHeight)
      setDraftLayout((current) => ({ ...current, width: nextWidth }))
      if (nextHeight !== block.height || nextWidth !== layout.width) onResizeCommit(nextHeight, nextWidth)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }

  const commitTitle = () => {
    if (!editingTitle) return
    if (cancelling.current) {
      cancelling.current = false
      setTitleDraft(block.title)
      setEditingTitle(false)
      return
    }
    const nextTitle = titleDraft.trim() || block.title
    setEditingTitle(false)
    setTitleDraft(nextTitle)
    if (nextTitle !== block.title) onTitleCommit?.(nextTitle)
  }

  const commitForbiddenText = () => {
    if (!editingForbiddenText) return
    if (cancelling.current) {
      cancelling.current = false
      setForbiddenTextDraft(block.contentText || '请勿在此区域作答')
      setEditingForbiddenText(false)
      return
    }
    const nextText = forbiddenTextDraft.trim() || '请勿在此区域作答'
    setEditingForbiddenText(false)
    setForbiddenTextDraft(nextText)
    if (nextText !== block.contentText) onUpdateBlock?.({ contentText: nextText })
  }

  const insertContent = (key: string) => {
    if (key === 'table' || key === 'formula' || key === 'image') {
      onToggleContent?.(key)
      return
    }
    if (key === 'symbol') {
      onUpdateBlock?.({ contentText: `${block.contentText ?? ''}Ω、√、∠`.trim() })
      return
    }
    onUpdateBlock?.({ responseStyle: key as AnswerBlock['responseStyle'] })
  }

  const inheritedSubjectiveStyle = subjectiveAnswerStyle ?? 'lines'
  const effectiveSubjectiveStyle = block.answerAreaOverride
    ? (block.responseStyle ?? 'lines')
    : inheritedSubjectiveStyle
  const mergedSubjectiveParts = block.mergedParts?.length
    && block.mergedParts.every((part) => isQuestionBlockKind(part.kind) && part.kind !== 'objective')
    ? block.mergedParts
    : undefined
  const isSubjectiveAnswerBlock = block.kind === 'short-answer' || block.kind === 'response-area'
  const hasAnswerSettings = isSubjectiveAnswerBlock || block.kind === 'essay'
  const canEditSlotNumbers = isSubjectiveAnswerBlock && questionNumbers(block.range).length > 0
  const isFillAnswerBlock = block.answerVariant === 'fill'

  return (
    <div
      className={`answer-block kind-${block.kind} ${seamlessTop ? 'seamless-top' : ''} ${seamlessLeft ? 'seamless-left' : ''} ${block.contentElements?.includes('table') ? 'has-content-table' : ''} ${block.borderStyle === 'borderless' ? 'borderless' : ''} ${block.userInserted ? 'user-inserted' : ''} ${selected ? 'selected' : ''} ${multiSelected ? 'multi-selected' : ''}`}
      data-block-id={block.id}
      data-block-kind={block.kind}
      data-block-range={block.range ?? ''}
      data-block-locked={block.locked ? 'true' : 'false'}
      style={style}
      onClick={(event) => onSelect(event.metaKey || event.ctrlKey || event.shiftKey)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onSelect(false)
      }}
      role="button"
      tabIndex={0}
      aria-label={`编辑${block.title}`}
    >
      <span className="block-drag-handle" aria-label={`自由拖动${block.title}`} role="button" tabIndex={0} onPointerDown={beginMove}><GripVertical size={13} /></span>
      <button type="button" className="block-select-toggle" title="选择模块，可与其他模块合并" aria-label={`${multiSelected ? '取消选择' : '选择'}${block.title}`} aria-pressed={multiSelected} onClick={(event) => { event.stopPropagation(); onSelect(true) }}>{multiSelected ? '✓' : ''}</button>
      {selected && (block.kind !== 'objective' || block.mergedParts?.length) && (
        <div className="block-floating-tools" onClick={(event) => event.stopPropagation()}>
          {block.kind !== 'objective' && onToggleContent && <>
            <button type="button" onClick={onUndo} title="撤销"><Undo2 size={12} /></button>
            <button type="button" onClick={onRedo} title="重做"><Redo2 size={12} /></button>
            <button type="button" onClick={() => onUpdateBlock?.({ fontSize: block.fontSize === 'small' ? 'medium' : block.fontSize === 'medium' ? 'large' : 'small' })}>字号：{block.fontSize === 'large' ? '大' : block.fontSize === 'small' ? '小' : '中'}</button>
            <button type="button" onClick={() => onUpdateBlock?.({ lineSpacing: block.lineSpacing === 'compact' ? 'normal' : block.lineSpacing === 'normal' ? 'loose' : 'compact' })}>行距：{block.lineSpacing === 'loose' ? '宽' : block.lineSpacing === 'compact' ? '窄' : '标准'}</button>
            <button type="button" aria-pressed={block.textBold} onClick={() => onUpdateBlock?.({ textBold: !block.textBold })} title="粗体"><Bold size={12} /></button>
            <button type="button" aria-pressed={block.textItalic} onClick={() => onUpdateBlock?.({ textItalic: !block.textItalic })} title="斜体"><Italic size={12} /></button>
            <button type="button" aria-pressed={block.textUnderline} onClick={() => onUpdateBlock?.({ textUnderline: !block.textUnderline })} title="下划线"><Underline size={12} /></button>
            <button type="button" aria-label="插入图片" aria-pressed={block.contentElements?.includes('image')} onClick={() => onToggleContent('image')} title="图片"><Image size={13} /></button>
            <button type="button" aria-label="插入表格" aria-pressed={block.contentElements?.includes('table')} onClick={() => onToggleContent('table')} title="表格"><Table2 size={13} /></button>
            <button type="button" aria-label="插入公式" aria-pressed={block.contentElements?.includes('formula')} onClick={() => onToggleContent('formula')} title="公式"><Sigma size={13} /></button>
            <button type="button" aria-label="插入符号" onClick={() => insertContent('symbol')} title="符号"><Omega size={13} /></button>
            <button type="button" onClick={() => onUpdateBlock?.({ textAlign: 'left' })} title="左对齐"><AlignLeft size={12} /></button>
            <button type="button" onClick={() => onUpdateBlock?.({ textAlign: 'center' })} title="居中"><AlignCenter size={12} /></button>
            <button type="button" onClick={() => onUpdateBlock?.({ textAlign: 'right' })} title="右对齐"><AlignRight size={12} /></button>
          </>}
        </div>
      )}
      {onInsertAfter && (
        <div className="block-module-tools" onClick={(event) => event.stopPropagation()}>
          {hasAnswerSettings && <button type="button" aria-expanded={settingsPanel === 'answer'} onClick={() => { setActiveSlotKey(null); openAnswerSettings() }}>作答设置</button>}
          {canEditSlotNumbers && <button type="button" aria-expanded={settingsPanel === 'subquestion'} onClick={() => { openAnswerSettings(); setSettingsPanel('subquestion') }}>小题设置</button>}
          <button type="button" aria-expanded={settingsPanel === 'insert'} onClick={() => setSettingsPanel('insert')}><Plus size={11} /> 插入 <ChevronDown size={11} /></button>
          {block.userInserted && <>
            <span className="module-tool-divider" />
            <button
              type="button"
              aria-pressed={block.borderStyle !== 'borderless'}
              title={block.borderStyle === 'borderless' ? '显示边框' : '隐藏边框'}
              onClick={() => onUpdateBlock?.({ borderStyle: block.borderStyle === 'borderless' ? 'bordered' : 'borderless' })}
            >{block.borderStyle === 'borderless' ? <SquareDashed size={11} /> : <Square size={11} />} 边框</button>
            <button type="button" className="danger" title="删除插入内容（可撤销）" onClick={onDeleteBlock}><Trash2 size={11} /> 删除</button>
          </>}
        </div>
      )}
      {settingsPanel === 'answer' && hasAnswerSettings ? <div className="block-settings-popover" onClick={(event) => event.stopPropagation()}>
        <div className="block-settings-title"><strong>作答设置</strong><button type="button" onClick={() => setSettingsPanel(null)}>完成</button></div>
        {block.kind === 'essay' ? <>
          <div className="block-settings-row">
            <span>全部空</span>
            <MetisRadio.Group value={block.responseStyle === 'grid' ? 'grid' : 'lines'} options={[{ value: 'grid', label: '格子' }, { value: 'lines', label: '横线' }]} onChange={(event) => onUpdateBlock?.({ responseStyle: event.target.value as AnswerBlock['responseStyle'] })} />
          </div>
          <div className="block-settings-row">
            <span>字数</span>
            <MetisSelect size="small" value={block.wordCount ?? 600} options={[400, 600, 800, 1000, 1200].map((value) => ({ value, label: String(value) }))} onChange={(value) => onUpdateBlock?.({ wordCount: Number(value) })} aria-label="作文字数" />
          </div>
        </> : <>
          <div className="block-settings-row">
            <span>作答样式</span>
            {isFillAnswerBlock ? <MetisSelect
            size="small"
            value={effectiveSubjectiveStyle}
            options={[
              { value: 'lines', label: '横线' },
              { value: 'tian', label: '田字格' },
              { value: 'mi', label: '米字格' },
              { value: 'four-line', label: '四线三格' },
            ]}
            onChange={(value) => onUpdateBlock?.({ answerAreaOverride: true, responseStyle: value as AnswerBlock['responseStyle'] })}
            /> : <MetisRadio.Group value={effectiveSubjectiveStyle === 'blank' ? 'blank' : 'lines'} options={[{ value: 'blank', label: '空白' }, { value: 'lines', label: '作答线' }]} onChange={(event) => onUpdateBlock?.({ answerAreaOverride: true, responseStyle: event.target.value as AnswerBlock['responseStyle'] })} />}
          </div>
          {isFillAnswerBlock && block.answerSlotCounts?.some((count) => count > 0) && <div className="fill-slot-settings">
            <div className="fill-slot-settings-title">逐空设置</div>
            {questionNumbers(block.range).flatMap((number, questionIndex) => {
              const count = block.answerSlotCounts?.[questionIndex] ?? 0
              const slots = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: count }, (_, index) => index + 1)
              return slots.map((slotNumber) => {
                const slotKey = `${number}.${slotNumber}`
                const setting = block.answerSlotSettings?.[slotKey]
                const style = setting?.style ?? (effectiveSubjectiveStyle === 'tian' || effectiveSubjectiveStyle === 'mi' || effectiveSubjectiveStyle === 'four-line' ? effectiveSubjectiveStyle : 'lines')
                return <div className={`fill-slot-setting-row ${activeSlotKey === slotKey ? 'active' : ''}`} key={slotKey}>
                  <b>{number}({slotNumber})</b>
                  <MetisSelect
                    size="small"
                    value={style}
                    options={[
                      { value: 'lines', label: '横线' },
                      { value: 'tian', label: '田字格' },
                      { value: 'mi', label: '米字格' },
                      { value: 'four-line', label: '四线三格' },
                    ]}
                    onChange={(value) => updateSlotSetting(slotKey, { style: value as FillSlotStyle })}
                    aria-label={`${number}题第${slotNumber}空作答样式`}
                  />
                  {style === 'tian' ? <MetisInputNumber
                    size="small"
                    min={1}
                    max={20}
                    value={setting?.count ?? 4}
                    addonAfter="格"
                    aria-label={`${number}题第${slotNumber}空田字格数量`}
                    onChange={(value) => updateSlotSetting(slotKey, { count: Number(value ?? 4) })}
                  /> : <span />}
                </div>
              })
            })}
          </div>}
          {effectiveSubjectiveStyle === 'lines' && <div className="block-settings-row">
            <span>作答线</span>
            <MetisInputNumber size="small" min={1} max={40} value={block.lineCount ?? 4} addonAfter="行" aria-label="作答线行数" onChange={(value) => onUpdateBlock?.({ answerAreaOverride: true, lineCount: Number(value ?? 4) })} />
          </div>}
          {block.answerAreaOverride && <button type="button" className="follow-card-action" onClick={() => onUpdateBlock?.({ answerAreaOverride: false })}>恢复跟随整卡</button>}
        </>}
      </div> : null}
      {settingsPanel === 'subquestion' && canEditSlotNumbers ? <div className="block-settings-popover" onClick={(event) => event.stopPropagation()}>
        <div className="block-settings-title"><strong>小题设置</strong><button type="button" onClick={() => setSettingsPanel(null)}>完成</button></div>
        <div className="slot-number-section standalone">
          <div className="slot-number-section-title"><span>支持连续序号或跳号，如 1,2,3 / 3,5</span></div>
          {questionNumbers(block.range).map((number, questionIndex) => <label key={number}>
            <span>{number}题</span>
            <MetisInput size="small" value={slotNumberDrafts[questionIndex] ?? ''} placeholder="如 1,2,3" aria-label={`${number}题小题序号`} onChange={(event) => setSlotNumberDrafts((drafts) => drafts.map((draft, index) => index === questionIndex ? event.target.value : draft))} onKeyDown={(event) => { if (event.key === 'Enter') commitSlotNumbers() }} />
          </label>)}
          <button type="button" className="primary" onClick={commitSlotNumbers}>应用序号</button>
        </div>
      </div> : null}
      {settingsPanel === 'insert' ? <div className="module-insert-menu" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => { onInsertAfter?.('section-title', undefined, 'before'); setSettingsPanel(null) }}>标题</button>
        <button type="button" onClick={() => { onInsertAfter?.('response-area', 'blank', 'after'); setSettingsPanel(null) }}>空白区</button>
        <button type="button" onClick={() => { onInsertAfter?.('forbidden', undefined, 'after'); setSettingsPanel(null) }}>禁答区</button>
      </div> : null}
      {block.kind !== 'forbidden' && <span className="answer-block-heading">
        {editingTitle && onTitleCommit ? (
          <input
            className="block-title-input"
            autoFocus
            maxLength={32}
            value={titleDraft}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                cancelling.current = true
                setTitleDraft(block.title)
                event.currentTarget.blur()
              }
            }}
            aria-label="编辑模块标题"
          />
        ) : onTitleCommit && !locked ? (
          <button
            type="button"
            className="block-title-edit"
            onClick={(event) => {
              event.stopPropagation()
              cancelling.current = false
              setEditingTitle(true)
            }}
          >
            <strong>{block.title}</strong><Pencil size={10} />
          </button>
        ) : <strong>{block.title}</strong>}
        {block.showQuestionCount && questionCount > 0 && <small>共 {questionCount} 题</small>}
        {block.showScore && block.score !== undefined && <small>共 {block.score} 分</small>}
        {locked && <span><LockKeyhole size={11} /> 已锁定</span>}
      </span>}

      {block.contentText && !['notice', 'forbidden'].includes(block.kind) && <p className={`block-custom-text text-${block.fontSize ?? 'medium'} spacing-${block.lineSpacing ?? 'normal'}`} style={{ fontWeight: block.textBold ? 700 : undefined, fontStyle: block.textItalic ? 'italic' : undefined, textDecoration: block.textUnderline ? 'underline' : undefined, textAlign: block.textAlign ?? 'left' }}>{block.textScript === 'sub' ? <sub>{block.contentText}</sub> : block.textScript === 'super' ? <sup>{block.contentText}</sup> : block.contentText}</p>}
      {questionAnswer && isQuestionBlockKind(block.kind) && (
        <div className="question-stem-preview"><b>原卷题目</b><span>{questionContext || block.title}{block.range ? ` · ${block.range}` : ''}</span></div>
      )}
      <RichElements elements={block.contentElements} />
      <ScoreBox block={block} enabled={subjectiveManualGrading && hasAnswerSettings} style={manualScoreStyle} allowHalfScore={allowHalfScore} />
      {block.kind === 'objective' && <ObjectiveGrid block={block} sortMode={objectiveSortMode} merged={objectiveMerge} />}
      {mergedSubjectiveParts && <div className="merged-subjective-parts">
        {mergedSubjectiveParts.map((part) => {
          const partStyle = part.answerAreaOverride ? (part.responseStyle ?? 'lines') : inheritedSubjectiveStyle
          return <section key={part.id} className="merged-subjective-part" style={{ flexGrow: Math.max(1, part.height) }}>
            {part.kind === 'short-answer' && <ShortAnswerContent block={{ ...part, responseStyle: partStyle }} fillModule={partStyle === 'lines'} lineHeight={subjectiveLineHeight} />}
            {part.kind === 'essay' && (part.responseStyle === 'grid'
              ? <GridPaper rows={part.lineCount ?? 10} cells={part.wordCount} />
              : <RuledLines dashed={part.lineStyle === 'dashed'} count={part.lineCount ?? 10} />)}
            {part.kind === 'drawing' && <div className="drawing-area">作图区</div>}
            {part.kind === 'table' && <RichElements elements={['table']} />}
          </section>
        })}
      </div>}
      {!mergedSubjectiveParts && block.kind === 'short-answer' && <ShortAnswerContent block={{ ...block, responseStyle: effectiveSubjectiveStyle }} fillModule={effectiveSubjectiveStyle === 'lines'} lineHeight={subjectiveLineHeight} activeSlotKey={activeSlotKey} onSlotClick={isFillAnswerBlock ? openSlotSettings : undefined} />}
      {!mergedSubjectiveParts && block.kind === 'mixed' && (
        <div className="mixed-area">
          {(() => {
            const numbers = questionNumbers(block.range)
            const splitAt = Math.max(1, Math.ceil(numbers.length / 2))
            const objectiveRange = formatQuestionRange(numbers.slice(0, splitAt))
            const subjectiveRange = formatQuestionRange(numbers.slice(splitAt))
            return (
              <>
                <section><b>客观小题 {objectiveRange}</b><ObjectiveGrid block={{ ...block, range: objectiveRange }} compact sortMode={objectiveSortMode} merged={objectiveMerge} /></section>
                <section><b>主观小题 {subjectiveRange || objectiveRange}</b><ShortAnswerContent block={{ ...block, range: subjectiveRange || objectiveRange, responseStyle: subjectiveAnswerStyle, lineCount: Math.min(4, block.lineCount ?? 4) }} fillModule={subjectiveAnswerStyle === 'lines'} lineHeight={subjectiveLineHeight} /></section>
              </>
            )
          })()}
        </div>
      )}
      {!mergedSubjectiveParts && block.kind === 'essay' && (
        <div className={`essay-area ${block.writingLayout === 'separate' ? 'essay-separated' : ''}`}>
          {questionNumbers(block.range).map((number) => <div key={number} className="subjective-question-label"><b>{number}.</b><QuestionScore block={block} scoreKey={String(number)} /></div>)}
          <p>{block.hint ?? (block.responseStyle === 'grid' ? `作文格作答区；当前设置 ${block.wordCount ?? 600} 字，可在选中后调整字数` : '请在指定区域内完成作文，超出区域的答案无效。')}</p>
          {!!block.leadingBlankLines && <div className="essay-leading-space" style={{ height: `${block.leadingBlankLines * 14}px` }} aria-label={`作文前空 ${block.leadingBlankLines} 行`} />}
          {block.responseStyle === 'grid' ? <GridPaper rows={block.lineCount ?? 10} cells={block.wordCount} /> : block.writingLayout === 'separate' ? (
            <div className="essay-choice-areas">
              <section><b>选项 A 作答区</b><RuledLines dashed={block.lineStyle === 'dashed'} count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
              <section><b>选项 B 作答区</b><RuledLines dashed={block.lineStyle === 'dashed'} count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
            </div>
          ) : <RuledLines dashed={block.lineStyle === 'dashed'} count={block.lineCount ?? 10} />}
        </div>
      )}
      {block.kind === 'forbidden' && <div className="forbidden-area">
        {editingForbiddenText ? (
          <MetisInput
            className="forbidden-text-input"
            autoFocus
            maxLength={40}
            value={forbiddenTextDraft}
            aria-label="编辑禁答区文字"
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setForbiddenTextDraft(event.target.value)}
            onBlur={commitForbiddenText}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                cancelling.current = true
                setForbiddenTextDraft(block.contentText || '请勿在此区域作答')
                event.currentTarget.blur()
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={`forbidden-text-edit text-${block.fontSize ?? 'medium'} spacing-${block.lineSpacing ?? 'normal'}`}
            style={{
              fontWeight: block.textBold ? 700 : undefined,
              fontStyle: block.textItalic ? 'italic' : undefined,
              textDecoration: block.textUnderline ? 'underline' : undefined,
              textAlign: block.textAlign ?? 'center',
            }}
            aria-label="修改禁答区文字"
            onClick={(event) => {
              event.stopPropagation()
              cancelling.current = false
              setEditingForbiddenText(true)
            }}
          >
            <span>{block.contentText || '请勿在此区域作答'}</span>
            {selected && !locked && <Pencil size={10} />}
          </button>
        )}
      </div>}
      {block.kind === 'drawing' && <div className="drawing-area"><span>作图区</span><i /><i /></div>}
      {block.kind === 'table' && (
        <div className="table-area">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
      )}
      {block.kind === 'notice' && <div className="notice-area">{block.contentText || '请在指定区域内作答，超出边框的答案无效。'}</div>}
      {block.kind === 'response-area' && <ShortAnswerContent block={{ ...block, responseStyle: effectiveSubjectiveStyle }} fillModule={effectiveSubjectiveStyle === 'lines'} lineHeight={subjectiveLineHeight} />}
      {!locked && onResizeCommit && <button type="button" className="block-resize-handle" aria-label={`调整${block.title}宽度和高度`} onPointerDown={beginResize} onClick={(event) => event.stopPropagation()} />}
    </div>
  )
}
