import type { CSSProperties } from 'react'
import { LockKeyhole } from 'lucide-react'
import type { AnswerBlock } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'

interface AnswerBlockViewProps {
  block: AnswerBlock
  selected: boolean
  locked?: boolean
  onSelect: () => void
}

function ObjectiveGrid({ block }: { block: AnswerBlock }) {
  const questions = questionNumbers(block.range)
  if (questions.length === 0) {
    return <div className="unconfigured-block">请在右侧设置题号范围与分值</div>
  }
  const resolvedQuestions = questions
  const itemsPerColumn = Math.max(4, block.itemsPerColumn ?? 11)
  const columnCount = Math.min(3, Math.max(1, Math.ceil(resolvedQuestions.length / itemsPerColumn)))
  const chunkSize = Math.ceil(resolvedQuestions.length / columnCount)
  const columns = Array.from({ length: columnCount }, (_, index) => resolvedQuestions.slice(index * chunkSize, (index + 1) * chunkSize))
  const options = ['A', 'B', 'C', 'D', 'E'].slice(0, block.optionCount ?? 4)
  return (
    <div className="objective-grid" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
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

function RuledLines({ count }: { count: number }) {
  return (
    <div className="ruled-lines">
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  )
}

function ShortAnswerContent({ block }: { block: AnswerBlock }) {
  const count = block.lineCount ?? 4
  const numbers = questionNumbers(block.range)
  if (numbers.length > 1) {
    const linesPerQuestion = Math.max(2, Math.floor(count / numbers.length))
    return (
      <div className="short-answer-groups">
        {numbers.map((no) => <div key={no}><b>{no}.</b><RuledLines count={linesPerQuestion} /></div>)}
      </div>
    )
  }
  return <div className="single-short-answer"><b>{numbers[0] ?? '　'}.</b><RuledLines count={count} /></div>
}

export function AnswerBlockView({ block, selected, locked = false, onSelect }: AnswerBlockViewProps) {
  const style = { '--block-height': `${block.height}px` } as CSSProperties
  const normalizedTitle = block.title.replace(/[–—]/g, '-').replace(/\s/g, '')
  const normalizedRange = block.range?.replace(/[–—]/g, '-').replace(/\s/g, '')
  const showRange = Boolean(block.range && normalizedRange && !normalizedTitle.includes(normalizedRange))
  return (
    <button
      type="button"
      className={`answer-block kind-${block.kind} ${selected ? 'selected' : ''}`}
      style={style}
      onClick={onSelect}
      aria-label={`编辑${block.title}`}
    >
      <span className="answer-block-heading">
        <strong>{block.title}</strong>
        {showRange && <small>题号 {block.range}</small>}
        {block.showScore && block.score !== undefined && <small>（{block.score} 分）</small>}
        {locked && <span><LockKeyhole size={11} /> 已锁定</span>}
      </span>

      {block.kind === 'objective' && <ObjectiveGrid block={block} />}
      {block.kind === 'short-answer' && <ShortAnswerContent block={block} />}
      {block.kind === 'essay' && (
        <div className={`essay-area ${block.writingLayout === 'separate' ? 'essay-separated' : ''}`}>
          <p>{block.hint ?? '请在指定区域内完成作文或综合作答，超出区域的答案无效。'}</p>
          {block.writingLayout === 'separate' ? (
            <div className="essay-choice-areas">
              <section><b>选项 A 作答区</b><RuledLines count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
              <section><b>选项 B 作答区</b><RuledLines count={Math.max(4, Math.floor((block.lineCount ?? 12) / 2))} /></section>
            </div>
          ) : <RuledLines count={block.lineCount ?? 10} />}
        </div>
      )}
      {block.kind === 'forbidden' && <div className="forbidden-area">禁答区，请勿书写</div>}
      {block.kind === 'drawing' && <div className="drawing-area"><span>作图区</span><i /><i /></div>}
      {block.kind === 'table' && (
        <div className="table-area">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
      )}
      {block.kind === 'notice' && <div className="notice-area">请在指定区域内作答，超出边框的答案无效。</div>}
    </button>
  )
}
