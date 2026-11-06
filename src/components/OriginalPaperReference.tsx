import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { MetisButton, MetisTag } from '@yuanfudao/metis-web-component'
import { Maximize2, Minus, Move, X } from 'lucide-react'
import type { AnswerBlock, ExamPaper, PaperSection } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'

interface OriginalPaperReferenceProps {
  open: boolean
  paper: ExamPaper
  blocks: AnswerBlock[]
  selectedBlockId: string
  onClose: () => void
}

interface FloatingRect {
  x: number
  y: number
  width: number
  height: number
}

const MIN_WIDTH = 360
const MIN_HEIGHT = 320

function initialRect(): FloatingRect {
  const width = Math.min(480, Math.max(MIN_WIDTH, window.innerWidth * 0.34))
  const height = Math.min(620, Math.max(MIN_HEIGHT, window.innerHeight * 0.72))
  return { x: Math.max(24, window.innerWidth - width - 34), y: 104, width, height }
}

function sectionPrompt(section: PaperSection, number: number) {
  if (section.answerKind === 'objective') return `阅读题目材料，选出第 ${number} 题的正确答案。`
  if (section.answerKind === 'essay') return '请根据题目要求和提示信息完成写作任务。'
  if (section.answerKind === 'drawing') return `请在答题卡指定区域完成第 ${number} 题的作图。`
  if (section.answerKind === 'table') return `根据实验数据完成第 ${number} 题的表格与分析。`
  return `阅读材料并完成第 ${number} 题，答案写在答题卡对应位置。`
}

function OriginalQuestion({ section, number, score, selected }: { section: PaperSection; number: number; score?: number; selected: boolean }) {
  return (
    <div className={`original-question ${selected ? 'selected' : ''}`} data-question-number={number}>
      <div className="original-question-title"><b>{number}.</b>{score !== undefined && <span>（{Number(score.toFixed(2))}分）</span>}</div>
      <p>{sectionPrompt(section, number)}</p>
      {section.answerKind === 'objective' ? (
        <div className="original-options"><span>A. 选项内容</span><span>B. 选项内容</span><span>C. 选项内容</span><span>D. 选项内容</span></div>
      ) : section.answerKind === 'essay' ? (
        <div className="original-writing-prompt">【要求】内容完整，表达清楚；请按规定字数作答。</div>
      ) : (
        <div className="original-answer-lines"><i /><i /></div>
      )}
    </div>
  )
}

export function OriginalPaperReference({ open, paper, blocks, selectedBlockId, onClose }: OriginalPaperReferenceProps) {
  const [rect, setRect] = useState<FloatingRect>(initialRect)
  const [minimized, setMinimized] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const interactionRef = useRef<{ kind: 'drag' | 'resize'; startX: number; startY: number; rect: FloatingRect }>()
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId)
  const selectedNumbers = useMemo(() => questionNumbers(selectedBlock?.range), [selectedBlock?.range])
  const selectedSectionId = selectedBlock?.sectionId ?? paper.sections.find((section) => {
    const sectionNumbers = questionNumbers(section.range)
    return selectedNumbers.some((number) => sectionNumbers.includes(number))
  })?.id

  useEffect(() => {
    if (!open || minimized || !selectedSectionId) return
    sectionRefs.current[selectedSectionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [minimized, open, selectedSectionId, selectedBlockId])

  useEffect(() => {
    const keepInViewport = () => setRect((current) => ({
      ...current,
      width: Math.min(current.width, window.innerWidth - 32),
      height: Math.min(current.height, window.innerHeight - 32),
      x: Math.max(16, Math.min(current.x, window.innerWidth - Math.min(current.width, window.innerWidth - 32) - 16)),
      y: Math.max(72, Math.min(current.y, window.innerHeight - 120)),
    }))
    window.addEventListener('resize', keepInViewport)
    return () => window.removeEventListener('resize', keepInViewport)
  }, [])

  if (!open) return null

  const beginInteraction = (kind: 'drag' | 'resize', event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { kind, startX: event.clientX, startY: event.clientY, rect }
  }

  const continueInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current
    if (!interaction) return
    const deltaX = event.clientX - interaction.startX
    const deltaY = event.clientY - interaction.startY
    if (interaction.kind === 'drag') {
      setRect({
        ...interaction.rect,
        x: Math.max(12, Math.min(interaction.rect.x + deltaX, window.innerWidth - interaction.rect.width - 12)),
        y: Math.max(72, Math.min(interaction.rect.y + deltaY, window.innerHeight - 72)),
      })
      return
    }
    setRect({
      ...interaction.rect,
      width: Math.max(MIN_WIDTH, Math.min(interaction.rect.width + deltaX, window.innerWidth - interaction.rect.x - 12)),
      height: Math.max(MIN_HEIGHT, Math.min(interaction.rect.height + deltaY, window.innerHeight - interaction.rect.y - 12)),
    })
  }

  const endInteraction = () => { interactionRef.current = undefined }

  if (minimized) {
    return (
      <button type="button" className="original-paper-minimized print-hidden" onClick={() => setMinimized(false)}>
        <Maximize2 size={15} />
        <span><b>原卷对照</b><small>{selectedBlock?.title ?? '点击展开'}</small></span>
      </button>
    )
  }

  return (
    <aside
      className="original-paper-reference print-hidden"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      aria-label="原卷对照窗口"
    >
      <header
        className="original-paper-reference-header"
        onPointerDown={(event) => beginInteraction('drag', event)}
        onPointerMove={continueInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      >
        <Move size={15} />
        <div><strong>原卷对照</strong><span>只读 · 选中题块自动定位</span></div>
        <MetisTag preset="primary">{paper.subject}</MetisTag>
        <div className="original-paper-window-actions" onPointerDown={(event) => event.stopPropagation()}>
          <MetisButton type="borderless" icon={<Minus size={15} />} aria-label="最小化原卷" onClick={() => setMinimized(true)} />
          <MetisButton type="borderless" icon={<X size={15} />} aria-label="关闭原卷" onClick={onClose} />
        </div>
      </header>

      <div className="original-paper-scroll">
        <article className="original-paper-sheet">
          <div className="original-paper-heading">
            <h2>{paper.title}</h2>
            <p>{paper.grade} · {paper.subject}　考试时间：{paper.durationMinutes} 分钟　满分：{paper.score} 分</p>
          </div>
          <div className="original-student-line"><span>姓名：____________</span><span>班级：________</span><span>学号：____________</span></div>
          {paper.sections.map((section) => {
            const numbers = questionNumbers(section.range)
            const block = blocks.find((item) => item.sectionId === section.id)
            const unitScore = section.questionCount ? section.score / section.questionCount : undefined
            return (
              <section
                key={section.id}
                ref={(node) => { sectionRefs.current[section.id] = node }}
                className={`original-paper-section ${selectedSectionId === section.id ? 'selected' : ''}`}
              >
                <h3>{section.title}<small>（共{section.questionCount}题，共{section.score}分）</small></h3>
                {numbers.map((number) => <OriginalQuestion
                  key={number}
                  section={section}
                  number={number}
                  selected={selectedNumbers.includes(number)}
                  score={block?.questionScores?.[String(number)] ?? unitScore}
                />)}
              </section>
            )
          })}
        </article>
      </div>
      <button
        type="button"
        className="original-paper-resize"
        aria-label="调整原卷窗口大小"
        onPointerDown={(event) => beginInteraction('resize', event)}
        onPointerMove={continueInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      />
    </aside>
  )
}
