import { useState, type CSSProperties } from 'react'
import { MetisButton, MetisSelect, MetisTag } from '@yuanfudao/metis-web-component'
import { LockKeyhole, Maximize2, RotateCcw } from 'lucide-react'
import type { AnswerBlock, CardMode, ExamPaper, RulePack } from '../features/answer-sheet/types'
import { AnswerBlockView } from './AnswerBlockView'

interface AnswerSheetCanvasProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  activePage: number
  selectedBlockId: string
  onPageChange: (page: number) => void
  onSelectBlock: (id: string) => void
}

interface PaperPageProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  page: number
  selectedBlockId?: string
  onSelectBlock?: (id: string) => void
}

function PaperPage({ paper, blocks, mode, rulePack, page, selectedBlockId, onSelectBlock }: PaperPageProps) {
  const standard = mode === 'standard'
  const pageBlocks = blocks.filter((block) => block.page === page)

  return (
    <article className={`answer-paper ${standard ? 'standard-paper' : 'smart-paper'}`} data-paper-page={page}>
      {standard && <><i className="corner-mark top-left" /><i className="corner-mark top-right" /><i className="corner-mark bottom-left" /><i className="corner-mark bottom-right" /></>}
      <header className="paper-header">
        <div className="paper-title">
          <h1>{paper.title}</h1>
          <p>{paper.subject}答题卡 · 第 {page} 页 / 共 2 页</p>
        </div>
        <div className="identity-and-code">
          <div className="identity-grid">
            {(standard ? rulePack.identityFields.slice(0, 4) : ['姓名', '班级', '学号']).map((field) => (
              <span key={field}><b>{field}</b><i /></span>
            ))}
          </div>
          <div className="barcode-box"><span>{standard ? '条形码粘贴处' : '答题卡二维码'}</span><div className="barcode-lines" /></div>
        </div>
        {standard && <span className="locked-zone-label"><LockKeyhole size={10} /> 身份与条码区</span>}
      </header>

      {page === 1 && (
        <div className="candidate-notice">
          <strong>考生须知</strong>
          <span>客观题用 2B 铅笔填涂；主观题使用黑色字迹签字笔，在对应题号区域内作答。</span>
          <span className="absence-mark">缺考标记　[　]</span>
        </div>
      )}

      <div className="paper-blocks">
        {pageBlocks.map((block) => (
          <AnswerBlockView
            key={block.id}
            block={block}
            selected={selectedBlockId === block.id}
            locked={standard && Boolean(block.locked)}
            onSelect={() => onSelectBlock?.(block.id)}
          />
        ))}
      </div>
      {standard && <div className="right-warning-strip">请在黑色框内作答，超出区域的答案无效</div>}
      <footer className="paper-footer">请按 100% 原尺寸打印 · 模板版本：{standard ? rulePack.shortName : '飞象智能排版'}</footer>
    </article>
  )
}

export function AnswerSheetCanvas(props: AnswerSheetCanvasProps) {
  const [zoom, setZoom] = useState(85)
  const canvasStyle = { '--canvas-zoom': zoom / 100 } as CSSProperties
  const standard = props.mode === 'standard'

  return (
    <section className="answer-canvas" data-sec="5">
      <header className="canvas-toolbar">
        <div className="page-switcher">
          {[1, 2].map((page) => (
            <MetisButton key={page} type={props.activePage === page ? 'primary' : 'borderless'} size="s" onClick={() => props.onPageChange(page)}>
              第 {page} 页
            </MetisButton>
          ))}
        </div>
        <div className="canvas-view-actions">
          {standard && <MetisTag preset="success"><LockKeyhole size={11} /> 扫描安全区已锁定</MetisTag>}
          <MetisSelect
            className="zoom-select"
            value={zoom}
            options={[70, 85, 100].map((value) => ({ label: `${value}%`, value }))}
            onChange={(value) => setZoom(Number(value))}
          />
          <MetisButton type="borderless" icon={<RotateCcw size={15} />} onClick={() => setZoom(85)}>适应</MetisButton>
          <MetisButton type="borderless" icon={<Maximize2 size={15} />} onClick={() => setZoom(100)} aria-label="原始大小" />
        </div>
      </header>

      <div className="paper-viewport" style={canvasStyle}>
        <PaperPage
          paper={props.paper}
          blocks={props.blocks}
          mode={props.mode}
          rulePack={props.rulePack}
          page={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onSelectBlock={props.onSelectBlock}
        />
      </div>

      <div className="print-pages" aria-hidden="true">
        {[1, 2].map((page) => (
          <PaperPage
            key={page}
            paper={props.paper}
            blocks={props.blocks}
            mode={props.mode}
            rulePack={props.rulePack}
            page={page}
          />
        ))}
      </div>
    </section>
  )
}
