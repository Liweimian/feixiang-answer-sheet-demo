import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MetisButton, MetisInput } from '@yuanfudao/metis-web-component'
import { Combine, LockKeyhole, Pencil } from 'lucide-react'
import type { AnswerBlock, AnswerSheetDocument, AnswerSheetSettings, CardMode, ContentElement, ExamPaper, RulePack } from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'
import { AnswerBlockView } from './AnswerBlockView'

interface AnswerSheetCanvasProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  settings: AnswerSheetSettings
  pageCount: number
  activePage: number
  selectedBlockId: string
  onPageChange: (page: number) => void
  onSelectBlock: (id: string) => void
  onTitleCommit: (title: string) => void
  onBlockTitleCommit: (id: string, title: string) => void
  onResizeBlock: (id: string, height: number) => void
  onToggleBlockContent: (id: string, element: ContentElement) => void
  onReorderBlock: (dragId: string, targetId: string) => void
  onMergeBlocks: (ids: string[]) => void
  onSplitMerged: (id: string) => void
  printDocument?: AnswerSheetDocument
  printRulePack?: RulePack
}

interface PaperPageProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  settings: AnswerSheetSettings
  page: number
  pageCount: number
  selectedBlockIds?: string[]
  onSelectBlock?: (id: string) => void
  onTitleCommit?: (title: string) => void
  onBlockTitleCommit?: (id: string, title: string) => void
  onResizeBlock?: (id: string, height: number) => void
  onToggleBlockContent?: (id: string, element: ContentElement) => void
  onReorderBlock?: (dragId: string, targetId: string) => void
  onSplitMerged?: (id: string) => void
  draggingId?: string
  onDraggingChange?: (id: string) => void
  onSelectionChange?: (id: string, additive: boolean) => void
}

function CandidateNumberArea({ settings }: { settings: AnswerSheetSettings }) {
  const label = `${settings.candidateNumberType}（${settings.candidateNumberDigits} 位）`
  if (settings.candidateNumberLayout === 'barcode') {
    return <div className="barcode-box"><span>{label}条形码粘贴处</span><div className="barcode-lines" /></div>
  }
  if (settings.candidateNumberLayout === 'handwrite') {
    return <div className="candidate-number-box"><span>{label}手写区</span><div style={{ gridTemplateColumns: `repeat(${settings.candidateNumberDigits}, 1fr)` }}>{Array.from({ length: settings.candidateNumberDigits }, (_, index) => <i key={index} />)}</div></div>
  }
  return <div className="candidate-fill-box"><span>{label}填涂区</span><div style={{ gridTemplateColumns: `repeat(${settings.candidateNumberDigits}, 1fr)` }}>{Array.from({ length: settings.candidateNumberDigits }, (_, index) => <i key={index}>0—9</i>)}</div></div>
}

function PaperPage({ paper, blocks, mode, rulePack, settings, page, pageCount, selectedBlockIds = [], onSelectBlock, onTitleCommit, onBlockTitleCommit, onResizeBlock, onToggleBlockContent, onReorderBlock, onSplitMerged, draggingId, onDraggingChange, onSelectionChange }: PaperPageProps) {
  const standard = mode === 'standard'
  const paperSize = settings.paperSize.toLowerCase()
  const pageBlocks = blocks.filter((block) => block.page === page)
  const columns = settings.frontColumns
  const reviewModeLabel = settings.reviewMode === 'online' ? '网阅' : settings.reviewMode === 'manual' ? '手批' : '混合阅卷'
  const scanEnabled = settings.reviewMode !== 'manual'
  const manualScoreEnabled = settings.reviewMode !== 'online'
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(paper.title)
  const cancellingTitle = useRef(false)

  useEffect(() => {
    if (!editingTitle) setTitleDraft(paper.title)
  }, [editingTitle, paper.title])

  const commitTitle = () => {
    if (!editingTitle) return
    if (cancellingTitle.current) {
      cancellingTitle.current = false
      setTitleDraft(paper.title)
      setEditingTitle(false)
      return
    }
    const nextTitle = titleDraft.trim() || paper.title
    setTitleDraft(nextTitle)
    setEditingTitle(false)
    if (nextTitle !== paper.title) onTitleCommit?.(nextTitle)
  }

  return (
    <article className={`answer-paper paper-size-${paperSize} ${standard ? 'standard-paper' : 'smart-paper'} review-${settings.reviewMode}`} data-paper-page={page}>
      {scanEnabled && <><i className="corner-mark top-left" /><i className="corner-mark top-right" /><i className="corner-mark bottom-left" /><i className="corner-mark bottom-right" /></>}
      <header className="paper-header">
        <div className="paper-title">
          {editingTitle && onTitleCommit ? (
            <MetisInput
              className="paper-title-input"
              autoFocus
              maxLength={36}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancellingTitle.current = true
                  setTitleDraft(paper.title)
                  event.currentTarget.blur()
                }
              }}
              aria-label="编辑答题卡标题"
            />
          ) : onTitleCommit ? (
            <button
              type="button"
              className="paper-title-edit"
              onClick={() => {
                cancellingTitle.current = false
                setEditingTitle(true)
              }}
              aria-label="编辑答题卡标题"
            >
              <h1>{paper.title}</h1><span><Pencil size={11} /> 点击编辑</span>
            </button>
          ) : <h1>{paper.title}</h1>}
          <p>{paper.subject}答题卡 · {reviewModeLabel} · 第 {page} 页 / 共 {pageCount} 页</p>
        </div>
        <div className="identity-and-code">
          <div className="identity-grid">
            {settings.identityFields.map((field) => (
              <span key={field}><b>{field}</b><i /></span>
            ))}
          </div>
          <CandidateNumberArea settings={settings} />
          {settings.showBarcode && settings.candidateNumberLayout !== 'barcode' && (
            <div className="barcode-box barcode-secondary"><span>条形码粘贴处</span><div className="barcode-lines" /></div>
          )}
        </div>
        {(standard || scanEnabled) && <span className="locked-zone-label"><LockKeyhole size={10} /> {standard ? rulePack.shortName : '网阅定位'} · 身份与考号区</span>}
      </header>

      {page === 1 && settings.showNotice && (
        <div className="candidate-notice">
          <strong className="notice-vertical-title">注意事项</strong>
          <ol>
            <li>答题前请将学号、姓名、班级填写清楚。</li>
            <li>客观题答题，必须使用 2B 铅笔填涂，修改时用橡皮擦干净。</li>
            <li>主观题必须使用黑色字迹签字笔书写。</li>
            <li>必须在题号对应的答题区域内作答，超出答题区域书写无效。</li>
            <li>保持答卷清洁完整，请勿折叠或污损答题卡。</li>
          </ol>
          <strong className="notice-vertical-title">填涂样例</strong>
          <div className="fill-sample">
            <span>正确填涂： <i className="fill-correct" /></span>
            <span>错误填涂： <i>●</i> <i>×</i> <i>—</i> <i>✓</i></span>
          </div>
        </div>
      )}
      {manualScoreEnabled && <div className="manual-score-strip"><b>手批评分栏</b><span>得分：________</span><span>阅卷人：________</span></div>}

      <div className={`paper-blocks columns-${columns}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {pageBlocks.map((block) => (
          <AnswerBlockView
            key={block.id}
            block={block}
            selected={selectedBlockIds.includes(block.id)}
            multiSelected={selectedBlockIds.includes(block.id)}
            locked={standard && Boolean(block.locked)}
            onSelect={(additive) => { onSelectBlock?.(block.id); onSelectionChange?.(block.id, Boolean(additive)) }}
            onTitleCommit={onBlockTitleCommit ? (title) => onBlockTitleCommit(block.id, title) : undefined}
            onResizeCommit={onResizeBlock ? (height) => onResizeBlock(block.id, height) : undefined}
            onToggleContent={onToggleBlockContent ? (element) => onToggleBlockContent(block.id, element) : undefined}
            onSplitMerged={onSplitMerged ? () => onSplitMerged(block.id) : undefined}
            onDragStart={() => onDraggingChange?.(block.id)}
            onDragEnd={() => onDraggingChange?.('')}
            onDrop={() => { if (draggingId && draggingId !== block.id) onReorderBlock?.(draggingId, block.id); onDraggingChange?.('') }}
            questionAnswer={settings.cardStyle === 'question-answer'}
            questionContext={paper.sections.filter((section) => {
              const blockNumbers = new Set(questionNumbers(block.range))
              return questionNumbers(section.range).some((number) => blockNumbers.has(number))
            }).map((section) => section.title).join(' / ')}
          />
        ))}
      </div>
      {standard && <div className="right-warning-strip">请在黑色框内作答，超出区域的答案无效</div>}
      {settings.showFooter && (
        <footer className="paper-footer">{settings.footerText} · 第 {page} 面（共 {pageCount} 面）</footer>
      )}
    </article>
  )
}

export function AnswerSheetCanvas(props: AnswerSheetCanvasProps) {
  const canvasStyle = { '--canvas-zoom': .85 } as CSSProperties
  const [selectedIds, setSelectedIds] = useState<string[]>(props.selectedBlockId ? [props.selectedBlockId] : [])
  const [draggingId, setDraggingId] = useState('')

  useEffect(() => {
    if (props.selectedBlockId && !selectedIds.includes(props.selectedBlockId)) setSelectedIds([props.selectedBlockId])
  }, [props.selectedBlockId])

  const selectBlock = (id: string, additive: boolean) => {
    setSelectedIds((current) => additive
      ? current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      : [id])
  }

  const selectedBlocks = props.blocks.filter((block) => selectedIds.includes(block.id))
  const canMerge = selectedBlocks.length > 1
    && selectedBlocks.every((block) => block.page === selectedBlocks[0].page && isQuestionBlockKind(block.kind) && !block.locked)

  return (
    <section className="answer-canvas" data-sec="5">
      <div className="paper-viewport" style={canvasStyle}>
        <div className="paper-frame">
          {selectedIds.length > 1 && (
            <div className="canvas-selection-toolbar">
              <span>已选 {selectedIds.length} 个题块</span>
              <MetisButton
                type="primary"
                size="s"
                icon={<Combine size={13} />}
                disabled={!canMerge}
                onClick={() => props.onMergeBlocks([...selectedIds])}
              >
                合并
              </MetisButton>
            </div>
          )}
          <PaperPage
            paper={props.paper}
            blocks={props.blocks}
            mode={props.mode}
            rulePack={props.rulePack}
            settings={props.settings}
            page={props.activePage}
            pageCount={props.pageCount}
            selectedBlockIds={selectedIds}
            onSelectBlock={props.onSelectBlock}
            onSelectionChange={selectBlock}
            onTitleCommit={props.onTitleCommit}
            onBlockTitleCommit={props.onBlockTitleCommit}
            onResizeBlock={props.onResizeBlock}
            onToggleBlockContent={props.onToggleBlockContent}
            onReorderBlock={props.onReorderBlock}
            onSplitMerged={props.onSplitMerged}
            draggingId={draggingId}
            onDraggingChange={setDraggingId}
          />
          <button type="button" className="paper-page-badge" onClick={() => props.onPageChange(props.activePage >= props.pageCount ? 1 : props.activePage + 1)} aria-label="切换下一页">{props.activePage}/{props.pageCount}</button>
        </div>
      </div>

      <div className="print-pages" aria-hidden="true">
        {Array.from({ length: props.printDocument?.pageCount ?? props.pageCount }, (_, index) => index + 1).map((page) => (
          <PaperPage
            key={page}
            paper={props.printDocument?.paper ?? props.paper}
            blocks={props.printDocument?.blocks ?? props.blocks}
            mode={props.printDocument?.mode ?? props.mode}
            rulePack={props.printRulePack ?? props.rulePack}
            settings={props.printDocument?.settings ?? props.settings}
            page={page}
            pageCount={props.printDocument?.pageCount ?? props.pageCount}
          />
        ))}
      </div>
    </section>
  )
}
