import { ChevronDown, ChevronUp, GripVertical, LockKeyhole } from 'lucide-react'
import { blockKindLabels } from '../data/mockPaper'
import type { AnswerBlock, CardMode, ExamPaper } from '../features/answer-sheet/types'

interface QuestionOutlineProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  pageCount: number
  selectedBlockId: string
  activePage: number
  mode: CardMode
  onSelect: (id: string) => void
  onPageChange: (page: number) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function QuestionOutline(props: QuestionOutlineProps) {
  return (
    <aside className="question-outline" data-sec="4">
      <div className="outline-heading">
        <div><strong>题目与区域</strong><span>{props.blocks.length} 个题块</span></div>
        <span>自动排版</span>
      </div>

      {Array.from({ length: props.pageCount }, (_, index) => index + 1).map((page) => {
        const pageBlocks = props.blocks.filter((block) => block.page === page)
        return (
          <section key={page} className="outline-page-group">
            <button type="button" className={props.activePage === page ? 'active' : ''} onClick={() => props.onPageChange(page)}>
              <strong>第 {page} 页</strong>
              <span>{pageBlocks.length} 个区域</span>
            </button>
            <div>
              {pageBlocks.map((block, index) => (
                <div key={block.id} className={`outline-block ${props.selectedBlockId === block.id ? 'selected' : ''}`}>
                  <button type="button" className="outline-block-main" onClick={() => props.onSelect(block.id)}>
                    <GripVertical size={15} />
                    <span><strong>{block.title}</strong><small>{blockKindLabels[block.kind]}{block.range ? ` · ${block.range}` : ''}</small></span>
                    {props.mode === 'standard' && block.locked && <LockKeyhole size={13} />}
                  </button>
                  <span className="outline-order-actions">
                    <button type="button" aria-label="上移" disabled={index === 0} onClick={() => props.onMove(block.id, -1)}><ChevronUp size={13} /></button>
                    <button type="button" aria-label="下移" disabled={index === pageBlocks.length - 1} onClick={() => props.onMove(block.id, 1)}><ChevronDown size={13} /></button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <div className="outline-summary">
        <span>原卷结构</span>
        {props.paper.sections.map((section) => (
          <div key={section.id}><strong>{section.title}</strong><span>{section.range} · {section.score} 分</span></div>
        ))}
      </div>
    </aside>
  )
}
