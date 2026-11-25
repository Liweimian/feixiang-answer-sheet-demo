import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { MetisInput, MetisInputNumber, MetisRadio, MetisSelect } from '@yuanfudao/metis-web-component'
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, GripVertical, Image, Italic, LockKeyhole, Omega, Pencil, Plus, Redo2, Scissors, Square, SquareDashed, Sigma, Table2, Trash2, Underline, Undo2 } from 'lucide-react'
import { isQuestionBlockKind, type AnswerBlock, type AnswerBlockKind, type ContentElement, type FillSlotSetting, type FillSlotStyle, type FloatingContentObject, type ObjectiveSortMode, type SubquestionNumberStyle } from '../features/answer-sheet/types'
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
  onSplitMerged?: () => void
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
      {questions.flatMap((no, questionIndex) => {
        const subCount = block.answerSlotCounts?.[questionIndex] ?? 0
        const rows = subCount > 0 ? Array.from({ length: subCount }, (_, index) => `（${index + 1}）`) : ['']
        return rows.map((subLabel, subIndex) => <div key={`${no}-${subIndex}`} className="bubble-row" style={{ gridTemplateColumns: sortMode === 'number-horizontal-option-vertical' ? '24px' : `24px repeat(${options.length}, 18px)` }}>
          <b>{subLabel ? `${no}${subLabel}` : no}</b>
          {options.map((option) => <span key={option}>[{option}]</span>)}
        </div>)
      })}
    </div>
  )
}

function RuledLines({ count, dashed = false, lineHeight }: { count: number; dashed?: boolean; lineHeight?: number }) {
  return (
    <div
      className={`ruled-lines ${dashed ? 'dashed' : ''}`}
      style={lineHeight ? { gridAutoRows: `${lineHeight}px` } : undefined}
    >
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  )
}

const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']
const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const romanNumbers = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix']
const slotKeyboardRows = [
  { label: '数字', values: Array.from({ length: 9 }, (_, index) => String(index + 1)) },
  { label: '括号', values: Array.from({ length: 9 }, (_, index) => `（${index + 1}）`) },
  { label: '圆圈', values: circledNumbers.slice(0, 9) },
  { label: '罗马', values: romanNumbers },
  { label: '字母', values: Array.from({ length: 9 }, (_, index) => String.fromCharCode(97 + index)) },
]

function splitSlotLabels(value: string) {
  return value.split(/[\s,，、]+/).map((item) => item.trim()).filter(Boolean)
}

function slotNumberFromLabel(label: string, fallback: number) {
  const digit = label.match(/\d+/)?.[0]
  if (digit) return Number(digit)
  const circleIndex = circledNumbers.indexOf(label)
  if (circleIndex >= 0) return circleIndex + 1
  const chineseIndex = chineseNumbers.findIndex((value) => label.includes(value))
  if (chineseIndex >= 0) return chineseIndex + 1
  return fallback
}

function formatSubquestionNumber(value: number, style: SubquestionNumberStyle = 'paren') {
  if (style === 'circle') return circledNumbers[value - 1] ?? `㊉${value}`
  if (style === 'plain') return `${value}.`
  if (style === 'chinese') return `${chineseNumbers[value - 1] ?? value}、`
  return `（${value}）`
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

function escapeAnswerText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function defaultBlankAnswerHtml(block: AnswerBlock) {
  return questionNumbers(block.range).flatMap((number, questionIndex) => {
    const subCount = block.answerSlotCounts?.[questionIndex] ?? 0
    const slots = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: subCount }, (_, index) => index + 1)
    if (subCount > 0) {
      const numberStyle = block.answerSlotNumberStyles?.[questionIndex] ?? 'paren'
      const labels = block.answerSlotLabels?.[questionIndex]
      return [
        `<div data-answer-preset="true">${number}.</div>`,
        ...slots.map((slot, slotIndex) => {
          const label = labels?.[slotIndex] ?? formatSubquestionNumber(slot, numberStyle)
          const score = questionScore(block, `${number}.${slot}`)
          return `<div data-answer-preset="true">　${escapeAnswerText(label)}　${score === undefined ? '' : `（${score}分）`}</div>`
        }),
      ]
    }
    const score = questionScore(block, String(number))
    return [`<div data-answer-preset="true">${number}.　${score === undefined ? '' : `（${score}分）`}</div>`]
  }).join('')
}

function ManualScoreRail({ score, allowHalfScore = false, inline = false }: { score: number; allowHalfScore?: boolean; inline?: boolean }) {
  const wholeMax = Math.floor(Math.max(0, score))
  const highScore = wholeMax > 20
  if (highScore) {
    return <div className={`digit-score-rail ${inline ? 'inline-score-rail' : ''}`}><span>十位</span>{Array.from({ length: Math.floor(wholeMax / 10) + 1 }, (_, value) => <i key={`t${value}`}>{value}</i>)}<span>个位</span>{Array.from({ length: 10 }, (_, value) => <i key={`o${value}`}>{value}</i>)}{allowHalfScore && <i className="half-score">0.5</i>}</div>
  }
  return <div className={`slash-score-rail ${inline ? 'inline-score-rail' : ''}`}>{Array.from({ length: wholeMax + 1 }, (_, index) => wholeMax - index).map((value) => <i key={value}>{value}</i>)}{allowHalfScore && <i className="half-score">0.5</i>}</div>
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

const compositionRowHeight = 18
const compositionRowGap = 5

function compositionBlockHeight(rows: number, reservedHeight: number) {
  const safeRows = Math.max(1, Math.min(40, Math.round(rows)))
  return reservedHeight + safeRows * compositionRowHeight + Math.max(0, safeRows - 1) * compositionRowGap
}

function compositionRowsForWords(words: number) {
  return Math.max(1, Math.ceil(Math.max(20, words) / 20))
}

function selectNumber(value: unknown, fallback: number) {
  const raw = typeof value === 'object' && value !== null && 'value' in value
    ? (value as { value?: unknown }).value
    : value
  const next = Number(raw)
  return Number.isFinite(next) ? next : fallback
}

function ShortAnswerContent({
  block,
  fillModule = false,
  lineHeight = 16,
  activeSlotKey,
  onSlotClick,
  onSlotSettingChange,
  showInlineHandwriteScore = false,
  showInlineSlashScore = false,
  allowHalfScore = false,
}: {
  block: AnswerBlock
  fillModule?: boolean
  lineHeight?: number
  activeSlotKey?: string | null
  onSlotClick?: (slotKey: string) => void
  onSlotSettingChange?: (slotKey: string, patch: Partial<FillSlotSetting>) => void
  showInlineHandwriteScore?: boolean
  showInlineSlashScore?: boolean
  allowHalfScore?: boolean
}) {
  const [resizingSlotKey, setResizingSlotKey] = useState<string | null>(null)
  const [slotResizePreview, setSlotResizePreview] = useState<{ slotKey: string; widthPercent: number } | null>(null)
  const count = block.lineCount ?? 4
  const numbers = questionNumbers(block.range)
  const dashed = block.lineStyle === 'dashed'
  const beginSlotResize = (event: React.PointerEvent<HTMLSpanElement>, slotKey: string, initialWidthPercent: number) => {
    if (!onSlotSettingChange) return
    event.preventDefault()
    event.stopPropagation()
    const item = event.currentTarget.closest('.fill-slot-item') as HTMLElement | null
    if (!item) return
    const startX = event.clientX
    const itemWidth = Math.max(1, item.getBoundingClientRect().width)
    const baseUnitWidth = Math.max(1, itemWidth / (Math.min(initialWidthPercent, 300) / 100))
    let nextWidthPercent = initialWidthPercent
    setResizingSlotKey(slotKey)
    setSlotResizePreview({ slotKey, widthPercent: initialWidthPercent })
    const move = (moveEvent: PointerEvent) => {
      nextWidthPercent = Math.max(28, Math.min(900, initialWidthPercent + ((moveEvent.clientX - startX) / baseUnitWidth) * 100))
      setSlotResizePreview({ slotKey, widthPercent: nextWidthPercent })
    }
    const finish = () => {
      setResizingSlotKey(null)
      setSlotResizePreview(null)
      onSlotSettingChange(slotKey, { widthPercent: Number(nextWidthPercent.toFixed(1)) })
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
    window.addEventListener('pointercancel', finish, { once: true })
  }
  if (fillModule && block.answerVariant === 'fill' && !block.answerSlotCounts?.length) {
    const fullLineCount = Math.max(1, Math.round(count))
    return <div className="full-module-answer"><div className="answer-number-strip">{numbers.map((number) => <b key={number}>{number}.<QuestionScore block={block} scoreKey={String(number)} /></b>)}</div><RuledLines count={fullLineCount} dashed={dashed} /></div>
  }
  if (block.responseStyle === 'grid' && numbers.length > 0) {
    const totalRows = compositionRowsForWords(block.wordCount ?? 400)
    const baseRows = Math.floor(totalRows / numbers.length)
    const remainder = totalRows % numbers.length
    return <div className="short-answer-groups composition-answer-groups">{numbers.map((no, index) => {
      const rows = Math.max(1, baseRows + (index < remainder ? 1 : 0))
      return <div key={no}><b>{no}.<QuestionScore block={block} scoreKey={String(no)} /></b><GridPaper rows={rows} cells={rows * 20} /></div>
    })}</div>
  }
  if ((block.answerVariant === 'solution' || block.questionGroupDraft?.type === 'comprehensive') && numbers.length > 0) {
    return <div className="solution-question-groups" style={{ paddingTop: block.responseStyle === 'blank' ? `${(block.leadingBlankLines ?? 0) * lineHeight}px` : undefined }}>{numbers.map((no, questionIndex) => {
      const subCount = block.answerSlotCounts?.[questionIndex] ?? 0
      const totalLines = block.questionLineCounts?.[String(no)] ?? Math.max(2, Math.floor(count / Math.max(1, numbers.length)))
      const slots = subCount > 0 ? (block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: subCount }, (_, index) => index + 1)) : [0]
      const numberStyle = block.answerSlotNumberStyles?.[questionIndex] ?? 'paren'
      const labels = block.answerSlotLabels?.[questionIndex]
      return <section key={no}><b>{no}.</b>{slots.map((slot, slotIndex) => <div key={`${slot}-${slotIndex}`} className="solution-subquestion">{slot > 0
        ? <em>{labels?.[slotIndex] ?? formatSubquestionNumber(slot, numberStyle)}<QuestionScore block={block} scoreKey={`${no}.${slot}`} />{showInlineHandwriteScore && <span className="inline-handwrite-score-box" aria-label={`${no}.${slot}题手写分数框`} />}</em>
        : <span className="solution-score-label"><QuestionScore block={block} scoreKey={String(no)} />{showInlineHandwriteScore && <span className="inline-handwrite-score-box" aria-label={`${no}题手写分数框`} />}</span>}{block.responseStyle === 'blank' ? <div className="blank-response-area" /> : <RuledLines count={Math.max(1, Math.floor(totalLines / slots.length))} dashed={dashed} lineHeight={lineHeight} />}</div>)}</section>
    })}</div>
  }
  if (block.answerSlotCounts?.length && numbers.length > 0) {
    return (
      <div className="short-answer-slots">
        {numbers.map((no, questionIndex) => {
          const slotCount = Math.max(1, block.answerSlotCounts?.[questionIndex] ?? 1)
          const slotNumbers = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: slotCount }, (_, index) => index + 1)
          const slotLabels = block.answerSlotLabels?.[questionIndex]
          const numberStyle = block.answerSlotNumberStyles?.[questionIndex] ?? 'paren'
          return (
            <div key={no} className="short-answer-slot-row">
              <b>{no}.</b>
              {Array.from({ length: slotCount }, (_, slotIndex) => {
                const slotNumber = slotNumbers[slotIndex] ?? slotIndex + 1
                const slotKey = `${no}.${slotNumber}`
                const setting = block.answerSlotSettings?.[slotKey]
                const rawStyle = setting?.style ?? block.responseStyle ?? 'lines'
                const style: FillSlotStyle = ['lines', 'bracket', 'squares', 'composition', 'tian', 'mi', 'four-line'].includes(rawStyle)
                  ? rawStyle as FillSlotStyle
                  : 'lines'
                const cellCount = ['tian', 'mi', 'squares', 'composition'].includes(style)
                  ? Math.max(1, Math.min(style === 'composition' ? 200 : 20, setting?.count ?? (style === 'composition' ? 40 : 4)))
                  : 1
                const widthPercent = slotResizePreview?.slotKey === slotKey ? slotResizePreview.widthPercent : (setting?.widthPercent ?? 100)
                const wrappedLineCount = style === 'lines' ? Math.max(1, Math.ceil(widthPercent / 300)) : 1
                const finalLinePercent = widthPercent > 300 ? ((widthPercent - 1) % 300) + 1 : 300
                const firstLinePercent = wrappedLineCount > 1 ? finalLinePercent : widthPercent
                return <span key={slotIndex} className={`fill-slot-item slot-style-${style} ${wrappedLineCount > 1 ? 'wrapped-slot-item' : ''}`} style={style === 'lines' ? { width: `${Math.min(firstLinePercent, 300) * 0.29}%` } : undefined}>
                  <span
                    className={`${onSlotClick ? 'fill-slot-clickable' : ''} ${activeSlotKey === slotKey ? 'active-slot' : ''} ${wrappedLineCount > 1 ? 'wrapped-slot' : ''}`}
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
                  ><em>{slotCount > 1 ? (slotLabels?.[slotIndex] ?? formatSubquestionNumber(slotNumber, numberStyle)) : ''}<QuestionScore block={block} scoreKey={slotKey} /></em><span className={`slot-response-cells ${wrappedLineCount > 1 ? 'wrapped-lines' : ''}`}>{Array.from({ length: style === 'lines' ? wrappedLineCount : cellCount }, (_, cellIndex) => <i key={cellIndex} />)}</span>{showInlineHandwriteScore && <span className="inline-handwrite-score-box" aria-label={`${slotKey}题手写分数框`} />}{showInlineSlashScore && <ManualScoreRail score={Math.max(0, block.questionScores?.[slotKey] ?? (block.score ?? 0) / Math.max(1, scoreKeys(block).length))} allowHalfScore={allowHalfScore} inline />}{style === 'lines' && onSlotSettingChange ? <span className={`fill-slot-resize-handle ${resizingSlotKey === slotKey ? 'resizing' : ''}`} role="slider" aria-label={`调整第${no}题第${slotNumber}空长度`} aria-valuemin={28} aria-valuemax={900} aria-valuenow={Math.round(setting?.widthPercent ?? 100)} title="左右拖动调整当前空的长度" onPointerDown={(event) => beginSlotResize(event, slotKey, setting?.widthPercent ?? 100)}><i aria-hidden="true">◀▶</i></span> : null}</span>{activeSlotKey === slotKey && onSlotSettingChange ? <span className="inline-slot-editor" role="dialog" aria-label={`第${no}题第${slotNumber}空作答样式`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <MetisSelect
                    size="small"
                    value={style}
                    options={[
                      { value: 'lines', label: '作答线' },
                      { value: 'bracket', label: '括号' },
                      { value: 'squares', label: '方格' },
                      { value: 'composition', label: '作文格' },
                      { value: 'tian', label: '田字格' },
                      { value: 'mi', label: '米字格' },
                      { value: 'four-line', label: '四线三格' },
                    ]}
                    onChange={(value) => {
                      const nextStyle = typeof value === 'string' ? value : String((value as { value?: unknown } | null)?.value ?? '')
                      if (nextStyle) onSlotSettingChange(slotKey, { style: nextStyle as FillSlotStyle })
                    }}
                    aria-label="当前空作答样式"
                  />
                  {(['tian', 'mi', 'squares', 'composition'].includes(style)) ? <MetisInputNumber
                    size="small"
                    min={1}
                    max={style === 'composition' ? 200 : 20}
                    value={setting?.count ?? (style === 'composition' ? 40 : 4)}
                    addonAfter="格"
                    aria-label={`当前空${style === 'tian' ? '田字格' : style === 'mi' ? '米字格' : style === 'composition' ? '作文格' : '方格'}数量`}
                    onChange={(value) => onSlotSettingChange(slotKey, { count: Number(value ?? (style === 'composition' ? 40 : 4)) })}
                  /> : null}
                </span> : null}</span>
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

function FloatingContentObjects({ objects = [], selectedId, locked, onSelect, onChange }: { objects?: FloatingContentObject[]; selectedId: string | null; locked: boolean; onSelect: (id: string) => void; onChange: (objects: FloatingContentObject[]) => void }) {
  const updateObject = (id: string, patch: Partial<FloatingContentObject>) => onChange(objects.map((object) => object.id === id ? { ...object, ...patch } : object))
  const beginObjectDrag = (event: React.PointerEvent<HTMLElement>, object: FloatingContentObject) => {
    if (locked) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(object.id)
    const blockElement = event.currentTarget.closest('.answer-block') as HTMLElement | null
    if (!blockElement) return
    const rect = blockElement.getBoundingClientRect()
    const start = { x: event.clientX, y: event.clientY, objectX: object.x, objectY: object.y }
    const move = (pointerEvent: PointerEvent) => updateObject(object.id, {
      x: Math.max(0, Math.min(100 - object.width, start.objectX + (pointerEvent.clientX - start.x) / rect.width * 100)),
      y: Math.max(24, Math.min(blockElement.offsetHeight - object.height, start.objectY + (pointerEvent.clientY - start.y) / (rect.height / blockElement.offsetHeight))),
    })
    const finish = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }
  const beginObjectResize = (event: React.PointerEvent<HTMLButtonElement>, object: FloatingContentObject) => {
    if (locked) return
    event.preventDefault()
    event.stopPropagation()
    const blockElement = event.currentTarget.closest('.answer-block') as HTMLElement | null
    if (!blockElement) return
    const rect = blockElement.getBoundingClientRect()
    const start = { x: event.clientX, y: event.clientY, width: object.width, height: object.height }
    const move = (pointerEvent: PointerEvent) => updateObject(object.id, {
      width: Math.max(16, Math.min(100 - object.x, start.width + (pointerEvent.clientX - start.x) / rect.width * 100)),
      height: Math.max(44, Math.min(blockElement.offsetHeight - object.y, start.height + (pointerEvent.clientY - start.y) / (rect.height / blockElement.offsetHeight))),
    })
    const finish = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }
  return <div className="floating-content-layer">{objects.map((object) => {
    const selected = object.id === selectedId
    const rows = object.rows ?? 3
    const columns = object.columns ?? 4
    return <div key={object.id} className={`floating-content-object floating-${object.kind} ${selected ? 'selected' : ''}`} style={{ left: `${object.x}%`, top: `${object.y}px`, width: `${object.width}%`, height: `${object.height}px` }} onPointerDown={object.kind === 'image' ? (event) => beginObjectDrag(event, object) : undefined} onClick={(event) => { event.stopPropagation(); onSelect(object.id) }}>
      {object.kind === 'image' ? <div className="floating-image-placeholder"><Image size={18} /><span>图片</span></div> : <div className={`floating-table-grid ${object.squareCells ? 'square-cells' : ''}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: object.squareCells ? `repeat(${rows}, auto)` : `repeat(${rows}, minmax(0, 1fr))` }}>{Array.from({ length: rows * columns }, (_, index) => <span key={index} contentEditable={!locked} suppressContentEditableWarning onPointerDown={(event) => event.stopPropagation()} onBlur={(event) => { const cells = [...(object.cells ?? [])]; cells[index] = event.currentTarget.textContent ?? ''; updateObject(object.id, { cells }) }}>{object.cells?.[index] ?? ''}</span>)}</div>}
      {object.kind === 'table' && !locked && <button type="button" className="floating-object-drag" aria-label="拖动表格" onPointerDown={(event) => beginObjectDrag(event, object)}><GripVertical size={12} /></button>}
      {selected && !locked && <><div className="floating-object-tools" onPointerDown={(event) => event.stopPropagation()}>{object.kind === 'table' && <><button type="button" onClick={() => updateObject(object.id, { rows: Math.min(12, rows + 1) })}>+行</button><button type="button" onClick={() => updateObject(object.id, { rows: Math.max(1, rows - 1) })}>−行</button><button type="button" onClick={() => updateObject(object.id, { columns: Math.min(12, columns + 1) })}>+列</button><button type="button" onClick={() => updateObject(object.id, { columns: Math.max(1, columns - 1) })}>−列</button></>}<button type="button" className="danger" onClick={() => onChange(objects.filter((item) => item.id !== object.id))}><Trash2 size={11} /></button></div><button type="button" className="floating-object-resize" aria-label={`调整${object.kind === 'table' ? '表格' : '图片'}大小`} onPointerDown={(event) => beginObjectResize(event, object)} /></>}
    </div>
  })}</div>
}

function ScoreBox({ block, enabled, style = 'handwrite', allowHalfScore = false }: { block: AnswerBlock; enabled?: boolean; style?: 'handwrite' | 'slash'; allowHalfScore?: boolean }) {
  if (!enabled) return null
  const keys = scoreKeys(block)
  const fallback = (block.score ?? 0) / Math.max(1, keys.length)
  return <div className={`manual-score-list style-${style}`}>{keys.map((key) => {
    const score = Math.max(0, block.questionScores?.[key] ?? fallback)
    if (style === 'handwrite') return <div className="manual-score-item" key={key}><span className="handwrite-score-box" aria-label={`${key}题手写分数框`} /></div>
    return <div className="manual-score-item" key={key}><ManualScoreRail score={score} allowHalfScore={allowHalfScore} /></div>
  })}</div>
}

export function AnswerBlockView({ block, layout, seamlessTop = false, seamlessLeft = false, selected, multiSelected = false, locked = false, onSelect, onTitleCommit, onMoveCommit, onResizeCommit, onToggleContent, onUpdateBlock, onInsertAfter, onSplitMerged, onDeleteBlock, onUndo, onRedo, questionAnswer = false, questionContext, objectiveSortMode = 'number-horizontal-option-horizontal', objectiveMerge = true, subjectiveAnswerStyle = 'lines', subjectiveLineHeight = 16, subjectiveManualGrading = false, manualScoreStyle = 'handwrite', allowHalfScore = false }: AnswerBlockViewProps) {
  const blockRef = useRef<HTMLDivElement | null>(null)
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
  const [selectedFloatingId, setSelectedFloatingId] = useState<string | null>(null)
  const [forbiddenBoxSize, setForbiddenBoxSize] = useState({ width: block.contentBoxWidth ?? 50, height: block.contentBoxHeight ?? 30 })
  const [settingsPanel, setSettingsPanel] = useState<'answer' | 'subquestion' | 'insert' | 'border' | null>(null)
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null)
  const [slotNumberDrafts, setSlotNumberDrafts] = useState<string[]>([])
  const [slotNumberErrors, setSlotNumberErrors] = useState<string[]>([])
  const [activeNumberInput, setActiveNumberInput] = useState<number | null>(null)
  const slotNumberInputs = useRef<Array<HTMLInputElement | null>>([])
  const slotNumberSelections = useRef<Record<number, { start: number; end: number }>>({})
  const answerEditorRef = useRef<HTMLDivElement | null>(null)
  const answerSelectionRef = useRef<Range | null>(null)
  const cancelling = useRef(false)

  useEffect(() => {
    if (!editingTitle) setTitleDraft(block.title)
  }, [block.title, editingTitle])

  useEffect(() => {
    if (!editingForbiddenText) setForbiddenTextDraft(block.contentText || '请勿在此区域作答')
  }, [block.contentText, editingForbiddenText])

  useEffect(() => {
    setForbiddenBoxSize({ width: block.contentBoxWidth ?? 50, height: block.contentBoxHeight ?? 30 })
  }, [block.contentBoxWidth, block.contentBoxHeight, block.id])

  useEffect(() => setResizeHeight(block.height), [block.height])
  useEffect(() => setDraftLayout(layout), [layout.x, layout.y, layout.width])
  useEffect(() => {
    setSettingsPanel(null)
    setActiveSlotKey(null)
    setSelectedFloatingId(null)
  }, [block.id])

  useEffect(() => {
    if (!selectedFloatingId) return
    const clearFloatingSelection = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.floating-content-object, .floating-object-tools, .floating-object-resize, .floating-object-drag')) return
      setSelectedFloatingId(null)
    }
    document.addEventListener('pointerdown', clearFloatingSelection)
    return () => document.removeEventListener('pointerdown', clearFloatingSelection)
  }, [selectedFloatingId])

  useEffect(() => {
    if (activeNumberInput === null) return
    const hideSlotKeyboard = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.slot-number-keyboard')) return
      if (target === slotNumberInputs.current[activeNumberInput]) return
      setActiveNumberInput(null)
    }
    document.addEventListener('pointerdown', hideSlotKeyboard)
    return () => document.removeEventListener('pointerdown', hideSlotKeyboard)
  }, [activeNumberInput])

  const openAnswerSettings = () => {
    const counts = block.answerSlotCounts ?? questionNumbers(block.range).map(() => 1)
    setSlotNumberDrafts(counts.map((count, questionIndex) => (
      block.answerSlotLabels?.[questionIndex] ?? block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: count }, (_, index) => index + 1)
    ).join(',')))
    setSlotNumberErrors(counts.map(() => ''))
    setSettingsPanel('answer')
  }

  const openSlotSettings = (slotKey: string) => {
    setSettingsPanel(null)
    setActiveSlotKey((current) => current === slotKey ? null : slotKey)
  }

  const commitSlotNumbers = () => {
    const fallbackCounts = block.answerSlotCounts ?? questionNumbers(block.range).map(() => 1)
    const numbers = questionNumbers(block.range)
    const nextLabels = fallbackCounts.map((_, questionIndex) => splitSlotLabels(slotNumberDrafts[questionIndex] ?? ''))
    const nextErrors = fallbackCounts.map((count, questionIndex) => nextLabels[questionIndex].length === count ? '' : `${numbers[questionIndex]}题原题只有${count}个空`)
    setSlotNumberErrors(nextErrors)
    const firstError = nextErrors.findIndex(Boolean)
    if (firstError >= 0) {
      setActiveNumberInput(null)
      return
    }
    const nextNumbers = nextLabels.map((labels) => {
      const used = new Set<number>()
      return labels.map((label, index) => {
        let number = slotNumberFromLabel(label, index + 1)
        while (used.has(number) || number < 1 || number > 99) number += 1
        used.add(number)
        return number
      })
    })
    onUpdateBlock?.({ answerSlotNumbers: nextNumbers, answerSlotLabels: nextLabels })
    setActiveNumberInput(null)
    setSettingsPanel(null)
  }

  const rememberSlotSelection = (questionIndex: number, input: HTMLInputElement) => {
    slotNumberInputs.current[questionIndex] = input
    if (input.selectionStart == null || input.selectionEnd == null) return
    slotNumberSelections.current[questionIndex] = { start: input.selectionStart, end: input.selectionEnd }
  }

  const insertSlotLabel = (questionIndex: number, label: string) => {
    let nextCursor = 0
    setSlotNumberDrafts((drafts) => drafts.map((draft, index) => {
      if (index !== questionIndex) return draft
      const input = slotNumberInputs.current[questionIndex]
      const liveSelection = input?.selectionStart != null && input?.selectionEnd != null
        ? { start: input.selectionStart, end: input.selectionEnd }
        : undefined
      const selection = liveSelection ?? slotNumberSelections.current[questionIndex]
      const start = selection ? Math.min(selection.start, draft.length) : draft.length
      const end = selection ? Math.min(selection.end, draft.length) : draft.length
      const before = draft.slice(0, start)
      const after = draft.slice(end)
      const leftSeparator = before && !/[\s,，、]$/.test(before) ? ',' : ''
      const rightSeparator = after && !/^[\s,，、]/.test(after) ? ',' : ''
      nextCursor = before.length + leftSeparator.length + label.length
      return `${before}${leftSeparator}${label}${rightSeparator}${after}`
    }))
    requestAnimationFrame(() => {
      const input = slotNumberInputs.current[questionIndex]
      if (!input) return
      input.focus()
      input.setSelectionRange(nextCursor, nextCursor)
      slotNumberSelections.current[questionIndex] = { start: nextCursor, end: nextCursor }
    })
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

  const beginForbiddenTextResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || !onUpdateBlock) return
    event.preventDefault()
    event.stopPropagation()
    const area = event.currentTarget.closest('.forbidden-area') as HTMLElement | null
    if (!area) return
    const startX = event.clientX
    const startY = event.clientY
    const start = forbiddenBoxSize
    const rect = area.getBoundingClientRect()
    const move = (pointerEvent: PointerEvent) => {
      const width = Math.max(20, Math.min(100, start.width + (pointerEvent.clientX - startX) / rect.width * 100))
      const height = Math.max(24, Math.min(Math.max(24, rect.height - 8), start.height + pointerEvent.clientY - startY))
      setForbiddenBoxSize({ width: Math.round(width), height: Math.round(height) })
    }
    const finish = (pointerEvent: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      const width = Math.round(Math.max(20, Math.min(100, start.width + (pointerEvent.clientX - startX) / rect.width * 100)))
      const height = Math.round(Math.max(24, Math.min(Math.max(24, rect.height - 8), start.height + pointerEvent.clientY - startY)))
      setForbiddenBoxSize({ width, height })
      onUpdateBlock({ contentBoxWidth: width, contentBoxHeight: height })
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

  const rememberAnswerSelection = () => {
    const selection = window.getSelection()
    if (!selection?.rangeCount || !answerEditorRef.current?.contains(selection.anchorNode)) return
    answerSelectionRef.current = selection.getRangeAt(0).cloneRange()
  }

  const restoreAnswerSelection = () => {
    const editor = answerEditorRef.current
    if (!editor) return false
    editor.focus()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    if (answerSelectionRef.current && editor.contains(answerSelectionRef.current.commonAncestorContainer)) selection?.addRange(answerSelectionRef.current)
    return true
  }

  const commitAnswerRichText = () => {
    const editor = answerEditorRef.current
    const html = editor?.innerHTML ?? ''
    const requiredHeight = editor && effectiveSubjectiveStyle === 'blank'
      ? Math.ceil(editor.offsetTop + editor.scrollHeight + 8)
      : block.height
    if (html !== (block.answerRichText ?? '') || requiredHeight > block.height) {
      onUpdateBlock?.({
        answerRichText: html,
        ...(requiredHeight > block.height ? { height: requiredHeight } : {}),
      })
    }
  }

  const placeBlankCaretAtPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (effectiveSubjectiveStyle !== 'blank') return
    const editor = event.currentTarget
    if (editor.querySelector('[data-answer-preset="true"]')) return
    const rect = editor.getBoundingClientRect()
    const lineHeight = Math.max(14, Number.parseFloat(getComputedStyle(editor).lineHeight) || subjectiveLineHeight)
    const targetLine = Math.max(0, Math.floor((event.clientY - rect.top) / lineHeight))
    const targetColumn = Math.max(0, Math.floor((event.clientX - rect.left - 5) / 5.2))
    while (editor.children.length <= targetLine) {
      const line = document.createElement('div')
      line.appendChild(document.createElement('br'))
      editor.appendChild(line)
    }
    const line = editor.children[targetLine] as HTMLElement
    if (!line.textContent && targetColumn > 0) line.textContent = '\u00a0'.repeat(targetColumn)
    const range = document.createRange()
    range.selectNodeContents(line)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    answerSelectionRef.current = range.cloneRange()
  }

  const formatAnswerText = (command: 'bold' | 'italic' | 'underline') => {
    if (!restoreAnswerSelection()) return false
    document.execCommand(command)
    rememberAnswerSelection()
    commitAnswerRichText()
    return true
  }

  const alignAnswerText = (align: 'left' | 'center' | 'right') => {
    if (restoreAnswerSelection()) {
      document.execCommand(align === 'left' ? 'justifyLeft' : align === 'center' ? 'justifyCenter' : 'justifyRight')
      rememberAnswerSelection()
      commitAnswerRichText()
    }
    onUpdateBlock?.({ textAlign: align })
  }

  const insertAnswerText = (text: string) => {
    if (!restoreAnswerSelection()) return false
    document.execCommand('insertText', false, text)
    rememberAnswerSelection()
    commitAnswerRichText()
    return true
  }

  const inheritedSubjectiveStyle = subjectiveAnswerStyle ?? 'lines'
  const isFillAnswerBlock = block.answerVariant === 'fill'
  const effectiveSubjectiveStyle = isFillAnswerBlock
    ? (['lines', 'squares', 'composition', 'tian', 'mi', 'four-line'].includes(block.responseStyle ?? '') ? block.responseStyle! : 'lines')
    : block.answerAreaOverride
      ? (block.responseStyle ?? 'lines')
      : inheritedSubjectiveStyle
  useLayoutEffect(() => {
    const supportsSharedLineHeight = block.answerVariant === 'solution' || block.answerVariant === 'fill'
    if (!supportsSharedLineHeight || effectiveSubjectiveStyle !== 'lines' || !onUpdateBlock) return
    const root = blockRef.current
    const content = root?.querySelector<HTMLElement>(block.answerVariant === 'fill' ? '.short-answer-slots' : '.solution-question-groups')
    if (!root || !content) return
    const requiredHeight = Math.ceil(content.offsetTop + content.scrollHeight + 2)
    if (requiredHeight > block.height + 1) onUpdateBlock({ height: requiredHeight })
  }, [block.answerVariant, block.height, block.lineCount, block.questionLineCounts, block.answerSlotCounts, block.preserveAnswerAreaHeight, effectiveSubjectiveStyle, onUpdateBlock, subjectiveLineHeight])
  const mergedSubjectiveParts = block.mergedParts?.length
    && block.mergedParts.every((part) => isQuestionBlockKind(part.kind) && part.kind !== 'objective')
    ? block.mergedParts
    : undefined
  const isSubjectiveAnswerBlock = block.kind === 'short-answer' || block.kind === 'response-area'
  const hasAnswerSettings = isSubjectiveAnswerBlock || block.kind === 'essay'
  const canEditSlotNumbers = isSubjectiveAnswerBlock && (
    isFillAnswerBlock
    || questionNumbers(block.range).length > 1
    || Boolean(block.answerSlotCounts?.some((count) => count > 1))
  )
  const isPlainBlankRegion = block.kind === 'response-area' && block.responseStyle === 'blank' && block.userInserted
  const borderTopVisible = block.borderStyle === 'borderless' ? false : block.borderTopVisible !== false
  const borderBottomVisible = block.borderStyle === 'borderless' ? false : block.borderBottomVisible !== false
  const headerDividerVisible = block.headerDividerVisible !== false
  const hasEditableBlankStructure = effectiveSubjectiveStyle === 'blank' && !isFillAnswerBlock && isSubjectiveAnswerBlock
  const blankAnswerHtml = hasEditableBlankStructure ? (block.answerRichText ?? defaultBlankAnswerHtml(block)) : (block.answerRichText ?? '')

  return (
    <div
      ref={blockRef}
      className={`answer-block kind-${block.kind} ${isPlainBlankRegion ? 'plain-blank-region' : ''} ${hasEditableBlankStructure ? 'has-editable-blank-structure' : ''} ${seamlessTop ? 'seamless-top' : ''} ${seamlessLeft ? 'seamless-left' : ''} ${block.contentElements?.includes('table') ? 'has-content-table' : ''} ${!borderTopVisible ? 'no-border-top' : ''} ${!borderBottomVisible ? 'no-border-bottom' : ''} ${!headerDividerVisible ? 'no-heading-divider' : ''} ${block.userInserted ? 'user-inserted' : ''} ${selected ? 'selected' : ''} ${multiSelected ? 'multi-selected' : ''}`}
      data-block-id={block.id}
      data-block-kind={block.kind}
      data-block-range={block.range ?? ''}
      data-block-locked={block.locked ? 'true' : 'false'}
      style={style}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('.block-settings-popover, .metis-select-dropdown, [role="listbox"], [role="option"]')) return
        onSelect(event.metaKey || event.ctrlKey || event.shiftKey)
      }}
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
            <button type="button" aria-pressed={block.textBold} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!formatAnswerText('bold')) onUpdateBlock?.({ textBold: !block.textBold }) }} title="粗体"><Bold size={12} /></button>
            <button type="button" aria-pressed={block.textItalic} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!formatAnswerText('italic')) onUpdateBlock?.({ textItalic: !block.textItalic }) }} title="斜体"><Italic size={12} /></button>
            <button type="button" aria-pressed={block.textUnderline} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!formatAnswerText('underline')) onUpdateBlock?.({ textUnderline: !block.textUnderline }) }} title="下划线"><Underline size={12} /></button>
            <button type="button" aria-label="插入图片" onClick={() => onToggleContent('image')} title="图片"><Image size={13} /></button>
            <button type="button" aria-label="插入表格" onClick={() => onToggleContent('table')} title="表格"><Table2 size={13} /></button>
            <button type="button" aria-label="插入公式" aria-pressed={block.contentElements?.includes('formula')} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!insertAnswerText('√（　）')) onToggleContent('formula') }} title="公式"><Sigma size={13} /></button>
            <button type="button" aria-label="插入符号" onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!insertAnswerText('Ω、√、∠')) insertContent('symbol') }} title="符号"><Omega size={13} /></button>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => alignAnswerText('left')} title="左对齐"><AlignLeft size={12} /></button>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => alignAnswerText('center')} title="居中"><AlignCenter size={12} /></button>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => alignAnswerText('right')} title="右对齐"><AlignRight size={12} /></button>
          </>}
        </div>
      )}
      {(onInsertAfter || onUpdateBlock) && (
        <div className="block-module-tools" onClick={(event) => event.stopPropagation()}>
          {block.mergedParts?.length && onSplitMerged ? <button type="button" onClick={(event) => { event.stopPropagation(); onSplitMerged() }}><Scissors size={11} /> 分割</button> : null}
          {hasAnswerSettings && <button type="button" aria-expanded={settingsPanel === 'answer'} onClick={() => { setActiveSlotKey(null); openAnswerSettings() }}>作答设置</button>}
          {canEditSlotNumbers && <button type="button" aria-expanded={settingsPanel === 'subquestion'} onClick={() => { openAnswerSettings(); setSettingsPanel('subquestion') }}>题号设置</button>}
          {onInsertAfter && <button type="button" aria-expanded={settingsPanel === 'insert'} onClick={() => setSettingsPanel('insert')}><Plus size={11} /> 插入 <ChevronDown size={11} /></button>}
          {onUpdateBlock && <>
            <span className="module-tool-divider" />
            <button
              type="button"
              aria-expanded={settingsPanel === 'border'}
              title="设置上下横向边线"
              onClick={() => setSettingsPanel(settingsPanel === 'border' ? null : 'border')}
            >{borderTopVisible && borderBottomVisible ? <Square size={11} /> : <SquareDashed size={11} />} 边框 <ChevronDown size={10} /></button>
            {onDeleteBlock && <button type="button" className="danger" title="删除插入内容（可撤销）" onClick={onDeleteBlock}><Trash2 size={11} /> 删除</button>}
          </>}
        </div>
      )}
      {settingsPanel === 'answer' && hasAnswerSettings ? <div className="block-settings-popover answer-settings-popover" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <div className="block-settings-title"><strong>作答设置</strong><button type="button" onClick={() => setSettingsPanel(null)}>完成</button></div>
        {block.kind === 'essay' ? <>
          <div className="block-settings-row">
            <span>全部空</span>
            <MetisRadio.Group value={block.responseStyle === 'grid' ? 'grid' : 'lines'} options={[{ value: 'grid', label: '作文格' }, { value: 'lines', label: '作答线' }]} onChange={(event) => {
              const responseStyle = event.target.value as AnswerBlock['responseStyle']
              if (responseStyle !== 'grid') {
                onUpdateBlock?.({ responseStyle })
                return
              }
              const wordCount = block.wordCount ?? 600
              onUpdateBlock?.({ responseStyle, wordCount, height: compositionBlockHeight(compositionRowsForWords(wordCount), 72) })
            }} />
          </div>
          <div className="block-settings-row">
            <span>字数</span>
            <select className="word-count-native-select" value={block.wordCount ?? 600} aria-label="作文字数" onChange={(event) => {
              const wordCount = selectNumber(event.target.value, block.wordCount ?? 600)
              onUpdateBlock?.({ wordCount, ...(block.responseStyle === 'grid' ? { height: compositionBlockHeight(compositionRowsForWords(wordCount), 72) } : {}) })
            }}>
              {[200, 400, 600, 800, 1000, 1200].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </> : <>
          <div className="block-settings-row">
            <span>作答样式</span>
            {isFillAnswerBlock ? <MetisSelect
            size="small"
            value={effectiveSubjectiveStyle}
            options={[
              { value: 'lines', label: '作答线' },
              { value: 'bracket', label: '括号' },
              { value: 'squares', label: '方格' },
              { value: 'composition', label: '作文格' },
              { value: 'tian', label: '田字格' },
              { value: 'mi', label: '米字格' },
              { value: 'four-line', label: '四线三格' },
            ]}
            onChange={(value) => onUpdateBlock?.({ answerAreaOverride: true, responseStyle: value as AnswerBlock['responseStyle'] })}
            /> : <MetisRadio.Group
              className="answer-style-radio"
              value={effectiveSubjectiveStyle === 'blank' ? 'blank' : effectiveSubjectiveStyle === 'grid' ? 'grid' : 'lines'}
              options={[{ value: 'blank', label: '空白' }, { value: 'lines', label: '作答线' }, { value: 'grid', label: '作文格' }]}
              onChange={(event) => {
                const responseStyle = event.target.value as AnswerBlock['responseStyle']
                if (responseStyle !== 'grid') {
                  const numbers = questionNumbers(block.range)
                  const linesPerQuestion = Math.max(1, Math.floor((block.height - 30 - Math.max(0, numbers.length - 1) * 6) / Math.max(1, numbers.length) / subjectiveLineHeight))
                  onUpdateBlock?.({
                    answerAreaOverride: true,
                    preserveAnswerAreaHeight: true,
                    responseStyle,
                    ...(responseStyle === 'lines' ? {
                      lineCount: linesPerQuestion,
                      ...(block.answerVariant === 'solution' && numbers.length ? { questionLineCounts: Object.fromEntries(numbers.map((number) => [String(number), linesPerQuestion])) } : {}),
                    } : {}),
                  })
                  return
                }
                const wordCount = block.wordCount ?? 400
                const questionCount = Math.max(1, questionNumbers(block.range).length)
                const reservedHeight = 68 + Math.max(0, questionCount - 1) * 14
                onUpdateBlock?.({ answerAreaOverride: true, responseStyle, wordCount, height: compositionBlockHeight(compositionRowsForWords(wordCount), reservedHeight) })
              }}
            />}
          </div>
          {effectiveSubjectiveStyle === 'lines' && <div className="block-settings-row">
            <span>作答线</span>
            <MetisInputNumber size="small" min={1} max={40} value={block.lineCount ?? 4} addonAfter="行" aria-label="作答线行数" onChange={(value) => {
              const lineCount = Math.max(1, Math.round(selectNumber(value, block.lineCount ?? 4)))
              const numbers = questionNumbers(block.range)
              const requiredHeight = 52 + Math.max(1, numbers.length) * (lineCount * subjectiveLineHeight + 18)
              onUpdateBlock?.({
                answerAreaOverride: true,
                preserveAnswerAreaHeight: false,
                lineCount,
                height: Math.max(block.height, requiredHeight),
                ...(block.answerVariant === 'solution' && numbers.length
                  ? { questionLineCounts: Object.fromEntries(numbers.map((number) => [String(number), lineCount])) }
                  : {}),
              })
            }} />
          </div>}
          {effectiveSubjectiveStyle === 'grid' && <div className="block-settings-row">
            <span>字数</span>
            <select
              className="word-count-native-select"
              value={block.wordCount ?? 400}
              aria-label="作文字数"
              onChange={(event) => {
                const wordCount = selectNumber(event.target.value, block.wordCount ?? 400)
                const questionCount = Math.max(1, questionNumbers(block.range).length)
                const reservedHeight = 68 + Math.max(0, questionCount - 1) * 14
                onUpdateBlock?.({ answerAreaOverride: true, wordCount, height: compositionBlockHeight(compositionRowsForWords(wordCount), reservedHeight) })
              }}
            >
              {[200, 400, 600, 800, 1000, 1200].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>}
          {block.answerAreaOverride && <button type="button" className="follow-card-action" onClick={() => onUpdateBlock?.({ answerAreaOverride: false })}>恢复跟随整卡</button>}
        </>}
      </div> : null}
      {settingsPanel === 'subquestion' && canEditSlotNumbers ? <div className={`block-settings-popover ${activeNumberInput !== null ? 'has-slot-keyboard' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="block-settings-title"><strong>题号设置</strong></div>
        <div className="slot-number-section standalone">
          {questionNumbers(block.range).map((number, questionIndex) => <div className={`slot-number-editor ${slotNumberErrors[questionIndex] ? 'has-error' : ''}`} key={number}>
            <label className="slot-number-config-row">
              <span>{number}题</span>
              <MetisInput size="small" value={slotNumberDrafts[questionIndex] ?? ''} placeholder="如 （1）,（2） 或 自定义" aria-label={`${number}题小题序号`} onFocus={(event) => { setActiveNumberInput(questionIndex); rememberSlotSelection(questionIndex, event.currentTarget) }} onBlur={(event) => rememberSlotSelection(questionIndex, event.currentTarget)} onSelect={(event) => rememberSlotSelection(questionIndex, event.currentTarget)} onPointerUp={(event) => rememberSlotSelection(questionIndex, event.currentTarget)} onClick={(event) => rememberSlotSelection(questionIndex, event.currentTarget)} onKeyUp={(event) => rememberSlotSelection(questionIndex, event.currentTarget)} onChange={(event) => { rememberSlotSelection(questionIndex, event.currentTarget); setSlotNumberErrors((errors) => errors.map((error, index) => index === questionIndex ? '' : error)); setSlotNumberDrafts((drafts) => drafts.map((draft, index) => index === questionIndex ? event.target.value : draft)) }} onKeyDown={(event) => { if (event.key === 'Enter') commitSlotNumbers() }} />
            </label>
            {slotNumberErrors[questionIndex] ? <span className="slot-number-error" role="alert">{slotNumberErrors[questionIndex]}</span> : null}
            {activeNumberInput === questionIndex ? <div className="slot-number-keyboard" role="group" aria-label={`${number}题序号键盘`}>
              {slotKeyboardRows.map((row) => <div className="slot-keyboard-row" key={row.label}>
                <span>{row.label}</span>
                <div>{row.values.map((value) => <button type="button" key={value} onMouseDown={(event) => event.preventDefault()} onClick={() => insertSlotLabel(questionIndex, value)}>{value}</button>)}</div>
              </div>)}
            </div> : null}
          </div>)}
          <button type="button" className="primary" onClick={commitSlotNumbers}>完成</button>
        </div>
      </div> : null}
      {settingsPanel === 'insert' ? <div className="module-insert-menu" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => { onInsertAfter?.('section-title', undefined, 'before'); setSettingsPanel(null) }}>标题</button>
        <button type="button" onClick={() => { onInsertAfter?.('response-area', 'blank', 'after'); setSettingsPanel(null) }}>空白区</button>
        <button type="button" onClick={() => { onInsertAfter?.('forbidden', undefined, 'after'); setSettingsPanel(null) }}>禁答区</button>
      </div> : null}
      {settingsPanel === 'border' ? <div className="block-border-menu" onClick={(event) => event.stopPropagation()}>
        <button type="button" className={`heading-divider-option ${!headerDividerVisible ? 'selected' : ''}`} onClick={() => onUpdateBlock?.({ headerDividerVisible: !headerDividerVisible })}><span className="border-option-icon show-middle-true" /><span>隐藏标题分隔线</span>{!headerDividerVisible ? <b>✓</b> : null}</button>
        {([
          { key: 'all', label: '上下边线', top: true, bottom: true },
          { key: 'top', label: '仅上边线', top: true, bottom: false },
          { key: 'bottom', label: '仅下边线', top: false, bottom: true },
          { key: 'none', label: '无横向边线', top: false, bottom: false },
        ] as const).map((option) => <button type="button" key={option.key} className={borderTopVisible === option.top && borderBottomVisible === option.bottom ? 'selected' : ''} onClick={() => {
          onUpdateBlock?.({ borderStyle: 'bordered', borderTopVisible: option.top, borderBottomVisible: option.bottom })
          setSettingsPanel(null)
        }}><span className={`border-option-icon show-top-${option.top} show-bottom-${option.bottom}`} /><span>{option.label}</span>{borderTopVisible === option.top && borderBottomVisible === option.bottom ? <b>✓</b> : null}</button>)}
        <p>左右竖线为答题区定位边界，始终保留</p>
      </div> : null}
      {block.kind !== 'forbidden' && !isPlainBlankRegion && <span className="answer-block-heading">
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
      <ScoreBox block={block} enabled={subjectiveManualGrading && hasAnswerSettings && !isFillAnswerBlock && (manualScoreStyle !== 'handwrite' || effectiveSubjectiveStyle === 'blank')} style={manualScoreStyle} allowHalfScore={allowHalfScore} />
      {block.kind === 'objective' && <ObjectiveGrid block={block} sortMode={objectiveSortMode} merged={objectiveMerge} />}
      {mergedSubjectiveParts && <div className="merged-subjective-parts">
        {mergedSubjectiveParts.map((part) => {
          const partStyle = part.answerAreaOverride ? (part.responseStyle ?? 'lines') : inheritedSubjectiveStyle
          return <section key={part.id} className="merged-subjective-part" style={{ flexGrow: Math.max(1, part.height) }}>
            {part.kind === 'short-answer' && <ShortAnswerContent block={{ ...part, responseStyle: partStyle }} fillModule={partStyle === 'lines'} lineHeight={subjectiveLineHeight} />}
            {part.kind === 'essay' && (part.responseStyle === 'grid'
              ? <GridPaper rows={compositionRowsForWords(part.wordCount ?? 600)} cells={part.wordCount ?? 600} />
              : <RuledLines dashed={part.lineStyle === 'dashed'} count={part.lineCount ?? 10} />)}
            {part.kind === 'drawing' && <div className="drawing-area">作图区</div>}
            {part.kind === 'table' && <RichElements elements={['table']} />}
          </section>
        })}
      </div>}
      {!mergedSubjectiveParts && block.kind === 'short-answer' && <ShortAnswerContent block={{ ...block, responseStyle: effectiveSubjectiveStyle }} fillModule={effectiveSubjectiveStyle === 'lines'} lineHeight={subjectiveLineHeight} activeSlotKey={activeSlotKey} onSlotClick={isFillAnswerBlock ? openSlotSettings : undefined} onSlotSettingChange={isFillAnswerBlock ? updateSlotSetting : undefined} showInlineHandwriteScore={subjectiveManualGrading && manualScoreStyle === 'handwrite' && (isFillAnswerBlock || effectiveSubjectiveStyle === 'lines')} showInlineSlashScore={isFillAnswerBlock && subjectiveManualGrading && manualScoreStyle === 'slash'} allowHalfScore={allowHalfScore} />}
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
          <p className={`text-${block.fontSize ?? 'medium'} spacing-${block.lineSpacing ?? 'normal'}`} style={{ fontWeight: block.textBold ? 700 : undefined, fontStyle: block.textItalic ? 'italic' : undefined, textDecoration: block.textUnderline ? 'underline' : undefined, textAlign: block.textAlign ?? 'left' }}>{block.hint ?? (block.responseStyle === 'grid' ? `作文格作答区；当前设置 ${block.wordCount ?? 600} 字，可在选中后调整字数` : '请在指定区域内完成作文，超出区域的答案无效。')}</p>
          {!!block.leadingBlankLines && <div className="essay-leading-space" style={{ height: `${block.leadingBlankLines * 14}px` }} aria-label={`作文前空 ${block.leadingBlankLines} 行`} />}
          {block.responseStyle === 'grid' ? <GridPaper rows={compositionRowsForWords(block.wordCount ?? 600)} cells={block.wordCount ?? 600} /> : block.writingLayout === 'separate' ? (
            <div className="essay-choice-areas">
              <section><b>选项 A 作答区</b><RuledLines dashed={block.lineStyle === 'dashed'} count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
              <section><b>选项 B 作答区</b><RuledLines dashed={block.lineStyle === 'dashed'} count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
            </div>
          ) : <RuledLines dashed={block.lineStyle === 'dashed'} count={block.lineCount ?? 10} />}
        </div>
      )}
      {block.kind === 'forbidden' && <div className={`forbidden-area align-${block.textAlign ?? 'center'}`}>
        <div
          className="forbidden-text-box"
          style={{
            width: `${forbiddenBoxSize.width}%`,
            minHeight: `${forbiddenBoxSize.height}px`,
            justifySelf: block.textAlign === 'left' ? 'start' : block.textAlign === 'right' ? 'end' : 'center',
          }}
        >
        {editingForbiddenText ? (
          <MetisInput
            className="forbidden-text-input"
            autoFocus
            maxLength={40}
            value={forbiddenTextDraft}
            aria-label="编辑禁答区文字"
            style={{ textAlign: block.textAlign ?? 'center' }}
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
          {selected && !locked && <button type="button" className="forbidden-text-resize-handle" aria-label="调整禁答区文本框宽度和高度" onPointerDown={beginForbiddenTextResize} onClick={(event) => event.stopPropagation()} />}
        </div>
      </div>}
      {block.kind === 'drawing' && <div className="drawing-area"><span>作图区</span><i /><i /></div>}
      {block.kind === 'table' && (
        <div className="table-area">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
      )}
      {block.kind === 'notice' && <div className="notice-area">{block.contentText || '请在指定区域内作答，超出边框的答案无效。'}</div>}
      {block.kind === 'response-area' && (isPlainBlankRegion
        ? <div className="blank-response-area" aria-label="空白区域" />
        : <ShortAnswerContent block={{ ...block, responseStyle: effectiveSubjectiveStyle }} fillModule={effectiveSubjectiveStyle === 'lines'} lineHeight={subjectiveLineHeight} />)}
      {(selected || block.answerRichText || effectiveSubjectiveStyle === 'blank') && (effectiveSubjectiveStyle === 'lines' || effectiveSubjectiveStyle === 'blank') && !isFillAnswerBlock && (block.kind === 'short-answer' || block.kind === 'response-area') && <div ref={selected || effectiveSubjectiveStyle === 'blank' ? answerEditorRef : undefined} className={`answer-rich-editor style-${effectiveSubjectiveStyle} ${selected || effectiveSubjectiveStyle === 'blank' ? 'is-editing' : 'is-readonly'}`} style={{ textAlign: block.textAlign ?? 'left' }} contentEditable={(selected || effectiveSubjectiveStyle === 'blank') && !locked} suppressContentEditableWarning aria-label={effectiveSubjectiveStyle === 'blank' ? '在空白作答区任意位置输入内容' : '在作答线上输入内容'} onPointerDown={selected || effectiveSubjectiveStyle === 'blank' ? (event) => { event.stopPropagation(); if (!selected) onSelect(false) } : undefined} onClick={selected || effectiveSubjectiveStyle === 'blank' ? placeBlankCaretAtPointer : undefined} onMouseUp={selected || effectiveSubjectiveStyle === 'blank' ? rememberAnswerSelection : undefined} onKeyUp={selected || effectiveSubjectiveStyle === 'blank' ? rememberAnswerSelection : undefined} onInput={selected || effectiveSubjectiveStyle === 'blank' ? (event) => {
        rememberAnswerSelection()
        // Keep the browser-owned DOM and selection untouched while typing.
        // Persisting on every keystroke causes React to replace innerHTML and
        // moves the caret back to the beginning of the answer area.
      } : undefined} onBlur={selected || effectiveSubjectiveStyle === 'blank' ? commitAnswerRichText : undefined} dangerouslySetInnerHTML={{ __html: blankAnswerHtml }} />}
      {!!block.floatingObjects?.length && <FloatingContentObjects objects={block.floatingObjects} selectedId={selectedFloatingId} locked={locked} onSelect={setSelectedFloatingId} onChange={(floatingObjects) => onUpdateBlock?.({ floatingObjects })} />}
      {!locked && onResizeCommit && <button type="button" className="block-resize-handle" aria-label={`调整${block.title}宽度和高度`} onPointerDown={beginResize} onClick={(event) => event.stopPropagation()} />}
    </div>
  )
}
