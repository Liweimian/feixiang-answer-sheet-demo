import type { CSSProperties } from 'react'
import { LockKeyhole } from 'lucide-react'
import type { AnswerBlock } from '../features/answer-sheet/types'

interface AnswerBlockViewProps {
  block: AnswerBlock
  selected: boolean
  locked?: boolean
  onSelect: () => void
}

function ObjectiveGrid() {
  const questions = Array.from({ length: 33 }, (_, index) => index + 11)
  return (
    <div className="objective-grid">
      {[questions.slice(0, 11), questions.slice(11, 22), questions.slice(22)].map((column, columnIndex) => (
        <div key={columnIndex} className="objective-column">
          {column.map((no) => (
            <div key={no} className={`bubble-row ${no === 23 || no === 31 ? 'section-start' : ''}`}>
              <b>{no}</b>
              {['A', 'B', 'C', 'D'].map((option) => <span key={option}>[{option}]</span>)}
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
  if (block.id === 'short-44-46') {
    return (
      <div className="short-answer-groups">
        {[44, 45, 46].map((no) => <div key={no}><b>{no}.</b><RuledLines count={2} /></div>)}
      </div>
    )
  }
  return <div className="single-short-answer"><b>47.</b><RuledLines count={count} /></div>
}

export function AnswerBlockView({ block, selected, locked = false, onSelect }: AnswerBlockViewProps) {
  const style = { '--block-height': `${block.height}px` } as CSSProperties
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
        {block.showScore && block.score !== undefined && <small>（{block.score} 分）</small>}
        {locked && <span><LockKeyhole size={11} /> 已锁定</span>}
      </span>

      {block.kind === 'objective' && <ObjectiveGrid />}
      {block.kind === 'short-answer' && <ShortAnswerContent block={block} />}
      {block.kind === 'essay' && (
        <div className="essay-area">
          <p>请从两个写作提示中任选一个，根据中文和英文提示完成文段表达。不少于 50 词。</p>
          <RuledLines count={block.lineCount ?? 10} />
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
