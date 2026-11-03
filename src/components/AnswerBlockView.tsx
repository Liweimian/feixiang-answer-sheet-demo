import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Image, LockKeyhole, Pencil, Sigma, Table2 } from 'lucide-react'
import { isQuestionBlockKind, type AnswerBlock, type ContentElement } from '../features/answer-sheet/types'
import { formatQuestionRange, questionNumbers } from '../features/answer-sheet/range'

interface AnswerBlockViewProps {
  block: AnswerBlock
  selected: boolean
  locked?: boolean
  onSelect: () => void
  onTitleCommit?: (title: string) => void
  questionAnswer?: boolean
  questionContext?: string
}

function ObjectiveGrid({ block, compact = false }: { block: AnswerBlock; compact?: boolean }) {
  const questions = questionNumbers(block.range)
  if (questions.length === 0) return <div className="unconfigured-block">请在左侧设置题号范围与分值</div>
  const options = ['A', 'B', 'C', 'D', 'E'].slice(0, block.optionCount ?? 4)
  const layout = block.objectiveLayout ?? 'horizontal'
  const itemsPerColumn = Math.max(4, block.itemsPerColumn ?? 11)
  const columnCount = layout === 'vertical'
    ? 1
    : layout === 'merged'
      ? Math.min(4, Math.max(1, Math.ceil(questions.length / Math.max(6, itemsPerColumn))))
      : Math.min(3, Math.max(1, Math.ceil(questions.length / itemsPerColumn)))
  const chunkSize = Math.ceil(questions.length / columnCount)
  const columns = Array.from({ length: columnCount }, (_, index) => questions.slice(index * chunkSize, (index + 1) * chunkSize))
  return (
    <div className={`objective-grid layout-${layout} ${compact ? 'compact' : ''}`} style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="objective-column">
          {column.map((no) => (
            <div key={no} className="bubble-row" style={{ gridTemplateColumns: `24px repeat(${options.length}, 1fr)` }}>
              <b>{no}</b>
              {options.map((option) => <span key={option}>[{option}]</span>)}
            </div>
          ))}
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

function AnswerMarks({ block }: { block: AnswerBlock }) {
  const numbers = questionNumbers(block.range)
  const mark = block.responseStyle === 'square' ? '□' : '（　）'
  return <div className="answer-marks">{numbers.map((number) => <span key={number}><b>{number}.</b>{mark}</span>)}</div>
}

function GridPaper({ rows = 8 }: { rows?: number }) {
  return <div className="writing-grid">{Array.from({ length: Math.max(12, rows * 12) }, (_, index) => <i key={index} />)}</div>
}

function ShortAnswerContent({ block }: { block: AnswerBlock }) {
  if (block.responseStyle === 'bracket' || block.responseStyle === 'square') return <AnswerMarks block={block} />
  if (block.responseStyle === 'grid') return <GridPaper rows={Math.max(4, block.lineCount ?? 4)} />
  if (block.responseStyle === 'blank') return <div className="blank-response-area" />
  const count = block.lineCount ?? 4
  const numbers = questionNumbers(block.range)
  const dashed = block.lineStyle === 'dashed'
  if (numbers.length > 1) {
    const linesPerQuestion = Math.max(2, Math.floor(count / numbers.length))
    return (
      <div className="short-answer-groups">
        {numbers.map((no) => <div key={no}><b>{no}.</b><RuledLines count={linesPerQuestion} dashed={dashed} /></div>)}
      </div>
    )
  }
  return <div className="single-short-answer"><b>{numbers[0] ?? '　'}.</b><RuledLines count={count} dashed={dashed} /></div>
}

function RichElements({ elements = [] }: { elements?: ContentElement[] }) {
  if (!elements.length) return null
  return (
    <div className="rich-elements">
      {elements.includes('table') && <span className="rich-table"><Table2 size={12} />{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span>}
      {elements.includes('formula') && <span className="rich-formula"><Sigma size={12} /> x² + y² = ______</span>}
      {elements.includes('image') && <span className="rich-image"><Image size={12} /> 图片作答素材区</span>}
    </div>
  )
}

function ScoreBox({ block }: { block: AnswerBlock }) {
  if (!block.showScoreBox) return null
  const score = Math.max(1, block.score ?? 1)
  const step = Math.max(0.5, block.scoreStep ?? 1)
  const cells = Math.min(8, Math.max(2, Math.ceil(score / step)))
  return <div className="score-box"><b>评分栏</b>{Array.from({ length: cells }, (_, index) => <span key={index} />)}</div>
}

export function AnswerBlockView({ block, selected, locked = false, onSelect, onTitleCommit, questionAnswer = false, questionContext }: AnswerBlockViewProps) {
  const style = { '--block-height': `${block.height}px` } as CSSProperties
  const normalizedTitle = block.title.replace(/[–—]/g, '-').replace(/\s/g, '')
  const normalizedRange = block.range?.replace(/[–—]/g, '-').replace(/\s/g, '')
  const showRange = Boolean(block.range && normalizedRange && !normalizedTitle.includes(normalizedRange))
  const questionCount = questionNumbers(block.range).length
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(block.title)
  const cancelling = useRef(false)

  useEffect(() => {
    if (!editingTitle) setTitleDraft(block.title)
  }, [block.title, editingTitle])

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

  return (
    <div
      className={`answer-block kind-${block.kind} ${selected ? 'selected' : ''}`}
      style={style}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onSelect()
      }}
      role="button"
      tabIndex={0}
      aria-label={`编辑${block.title}`}
    >
      <span className="answer-block-heading">
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
        {showRange && <small>题号 {block.range}</small>}
        {block.showScore && block.showQuestionCount && questionCount > 0 && <small>共 {questionCount} 题</small>}
        {block.showScore && block.score !== undefined && <small>（{block.score} 分）</small>}
        {locked && <span><LockKeyhole size={11} /> 已锁定</span>}
      </span>

      {block.contentText && !['notice', 'forbidden'].includes(block.kind) && <p className="block-custom-text">{block.contentText}</p>}
      {questionAnswer && isQuestionBlockKind(block.kind) && (
        <div className="question-stem-preview"><b>原卷题目</b><span>{questionContext || block.title}{block.range ? ` · ${block.range}` : ''}</span></div>
      )}
      <RichElements elements={block.contentElements} />
      <ScoreBox block={block} />
      {block.kind === 'objective' && <ObjectiveGrid block={block} />}
      {block.kind === 'short-answer' && <ShortAnswerContent block={block} />}
      {block.kind === 'mixed' && (
        <div className="mixed-area">
          {(() => {
            const numbers = questionNumbers(block.range)
            const splitAt = Math.max(1, Math.ceil(numbers.length / 2))
            const objectiveRange = formatQuestionRange(numbers.slice(0, splitAt))
            const subjectiveRange = formatQuestionRange(numbers.slice(splitAt))
            return (
              <>
                <section><b>客观小题 {objectiveRange}</b><ObjectiveGrid block={{ ...block, range: objectiveRange }} compact /></section>
                <section><b>主观小题 {subjectiveRange || objectiveRange}</b><ShortAnswerContent block={{ ...block, range: subjectiveRange || objectiveRange, responseStyle: block.responseStyle ?? 'lines', lineCount: Math.min(4, block.lineCount ?? 4) }} /></section>
              </>
            )
          })()}
        </div>
      )}
      {block.kind === 'essay' && (
        <div className={`essay-area ${block.writingLayout === 'separate' ? 'essay-separated' : ''}`}>
          <p>{block.hint ?? '请在指定区域内完成作文或综合作答，超出区域的答案无效。'}</p>
          {block.responseStyle === 'grid' ? <GridPaper rows={block.lineCount ?? 10} /> : block.writingLayout === 'separate' ? (
            <div className="essay-choice-areas">
              <section><b>选项 A 作答区</b><RuledLines dashed={block.lineStyle === 'dashed'} count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
              <section><b>选项 B 作答区</b><RuledLines dashed={block.lineStyle === 'dashed'} count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
            </div>
          ) : <RuledLines dashed={block.lineStyle === 'dashed'} count={block.lineCount ?? 10} />}
        </div>
      )}
      {block.kind === 'forbidden' && <div className="forbidden-area">{block.contentText || '禁答区，请勿书写'}</div>}
      {block.kind === 'drawing' && <div className="drawing-area"><span>作图区</span><i /><i /></div>}
      {block.kind === 'table' && (
        <div className="table-area">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
      )}
      {block.kind === 'notice' && <div className="notice-area">{block.contentText || '请在指定区域内作答，超出边框的答案无效。'}</div>}
    </div>
  )
}
