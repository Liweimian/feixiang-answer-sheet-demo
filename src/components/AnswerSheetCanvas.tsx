import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { MetisButton, MetisInput } from '@yuanfudao/metis-web-component'
import { Combine, Eye, EyeOff, LockKeyhole, Pencil, QrCode } from 'lucide-react'
import type { AnswerBlock, AnswerBlockKind, AnswerSheetDocument, AnswerSheetSettings, CardMode, ContentElement, ExamPaper, HeaderLayout, RulePack } from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'
import { AnswerBlockView } from './AnswerBlockView'
import { AnswerSheetHeader } from './AnswerSheetHeader'

interface AnswerSheetCanvasProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  settings: AnswerSheetSettings
  header: HeaderLayout
  pageCount: number
  activePage: number
  selectedBlockId: string
  onPageChange: (page: number) => void
  onSelectBlock: (id: string) => void
  onTitleCommit: (title: string) => void
  onBlockTitleCommit: (id: string, title: string) => void
  onMoveBlock: (id: string, x: number, y: number, page: number) => void
  onResizeBlock: (id: string, height: number, width: number) => void
  onToggleBlockContent: (id: string, element: ContentElement) => void
  onQuestionAction?: (id: string, number: number | undefined, action: string, value?: number) => void
  onUpdateBlock: (id: string, patch: Partial<AnswerBlock>) => void
  onInsertAfter: (id: string, kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle'], position?: 'before' | 'after') => void
  onDeleteInsertedBlock: (id: string) => void
  onUndo: () => void
  onRedo: () => void
  onMergeBlocks: (ids: string[], layout?: { x: number; y: number; width: number; height: number }) => void
  onSplitMerged: (id: string) => void
  onHeaderChange: (header: HeaderLayout) => void
  printDocument?: AnswerSheetDocument
  printRulePack?: RulePack
}

interface PaperPageProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  settings: AnswerSheetSettings
  header: HeaderLayout
  page: number
  pageCount: number
  selectedBlockIds?: string[]
  onSelectBlock?: (id: string) => void
  onTitleCommit?: (title: string) => void
  onBlockTitleCommit?: (id: string, title: string) => void
  onMoveBlock?: (id: string, x: number, y: number, page: number) => void
  onResizeBlock?: (id: string, height: number, width: number) => void
  onToggleBlockContent?: (id: string, element: ContentElement) => void
  onQuestionAction?: (id: string, number: number | undefined, action: string, value?: number) => void
  onUpdateBlock?: (id: string, patch: Partial<AnswerBlock>) => void
  onInsertAfter?: (id: string, kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle'], position?: 'before' | 'after') => void
  onDeleteInsertedBlock?: (id: string) => void
  onUndo?: () => void
  onRedo?: () => void
  onMergeBlocks?: (ids: string[], layout?: { x: number; y: number; width: number; height: number }) => void
  onSplitMerged?: (id: string) => void
  onSelectionChange?: (id: string, additive: boolean) => void
  onHeaderChange?: (header: HeaderLayout) => void
  selectionToolbar?: ReactNode
}

function CandidateNumberArea({ settings }: { settings: AnswerSheetSettings }) {
  if (!settings.identityFields.includes('准考证号')) return null
  const label = `${settings.candidateNumberType}（${settings.candidateNumberDigits} 位）`
  return <>{settings.candidateNumberLayouts.map((layout) => {
    if (layout === 'barcode') return <div key={layout} className="barcode-box"><span>{label}条形码粘贴处</span><div className="barcode-lines" /></div>
    if (layout === 'handwrite') return <div key={layout} className="candidate-number-box"><span>{label}手写区</span><div style={{ gridTemplateColumns: `repeat(${settings.candidateNumberDigits}, 1fr)` }}>{Array.from({ length: settings.candidateNumberDigits }, (_, index) => <i key={index} />)}</div></div>
    return <div key={layout} className="candidate-fill-box"><span>{label}填涂区</span><div style={{ gridTemplateColumns: `repeat(${settings.candidateNumberDigits}, 1fr)` }}>{Array.from({ length: settings.candidateNumberDigits }, (_, index) => <i key={index}>0—9</i>)}</div></div>
  })}</>
}

function PaperPage({ paper, blocks, mode, rulePack, settings, header, page, pageCount, selectedBlockIds = [], onSelectBlock, onTitleCommit, onBlockTitleCommit, onMoveBlock, onResizeBlock, onToggleBlockContent, onQuestionAction, onUpdateBlock, onInsertAfter, onSplitMerged, onDeleteInsertedBlock, onUndo, onRedo, onMergeBlocks, onSelectionChange, onHeaderChange, selectionToolbar }: PaperPageProps) {
  const standard = mode === 'standard'
  const paperSize = settings.paperSize.toLowerCase()
  const pageBlocks = blocks.filter((block) => block.page === page)
  const columns = settings.frontColumns
  const gapPercent = 0
  const defaultWidth = (100 - gapPercent * (columns - 1)) / columns
  const columnBottoms = Array.from({ length: columns }, () => 0)
  const placedLayouts: Array<{ x: number; y: number; width: number; height: number }> = []
  const blockLayouts = new Map<string, { x: number; y: number; width: number }>()
  pageBlocks.forEach((block) => {
    const column = columnBottoms.indexOf(Math.min(...columnBottoms))
    const width = block.canvasWidth ?? defaultWidth
    const x = block.canvasX ?? column * (defaultWidth + gapPercent)
    let y = block.canvasY ?? columnBottoms[column]
    let collision = true
    while (collision) {
      const overlaps = placedLayouts.filter((item) => (
        x < item.x + item.width
        && x + width > item.x
        && y < item.y + item.height
        && y + block.height > item.y
      ))
      collision = overlaps.length > 0
      if (collision) y = Math.max(...overlaps.map((item) => item.y + item.height))
    }
    const layout = { x, y, width }
    blockLayouts.set(block.id, layout)
    placedLayouts.push({ ...layout, height: block.height })
    columnBottoms.forEach((bottom, index) => {
      const columnLeft = index * (defaultWidth + gapPercent)
      const columnRight = columnLeft + defaultWidth
      if (x < columnRight && x + width > columnLeft) columnBottoms[index] = Math.max(bottom, y + block.height)
    })
  })
  const minimumCanvasHeight = paperSize === 'a3' ? 390 : paperSize === '16k' ? 450 : paperSize === '8k' ? 650 : 720
  const contentHeight = Math.max(minimumCanvasHeight, ...pageBlocks.map((block) => {
    const layout = blockLayouts.get(block.id)
    return (layout?.y ?? 0) + block.height
  }))
  const selectedRects = pageBlocks
    .filter((block) => selectedBlockIds.includes(block.id))
    .map((block) => {
      const layout = blockLayouts.get(block.id) ?? { x: 0, y: 0, width: 100 }
      return { left: layout.x, right: layout.x + layout.width, top: layout.y, bottom: layout.y + block.height }
    })
  const selectionToolbarStyle = (() => {
    if (!selectionToolbar || selectedRects.length === 0) return undefined
    const left = Math.min(...selectedRects.map((rect) => rect.left))
    const right = Math.max(...selectedRects.map((rect) => rect.right))
    const top = Math.min(...selectedRects.map((rect) => rect.top))
    if (selectedRects.length === 2) {
      const [upper, lower] = [...selectedRects].sort((a, b) => a.top - b.top)
      const [leftRect, rightRect] = [...selectedRects].sort((a, b) => a.left - b.left)
      const verticallySeparated = upper.bottom <= lower.top
      const horizontallySeparated = leftRect.right <= rightRect.left
      if (horizontallySeparated && !verticallySeparated) {
        return {
          left: `${(leftRect.right + rightRect.left) / 2}%`,
          top: (Math.min(leftRect.top, rightRect.top) + Math.max(leftRect.bottom, rightRect.bottom)) / 2,
          transform: 'translate(-50%, -50%)',
        } as CSSProperties
      }
      return {
        left: `${(left + right) / 2}%`,
        top: (upper.bottom + lower.top) / 2,
        transform: 'translate(-50%, -50%)',
      } as CSSProperties
    }
    return {
      left: `${(left + right) / 2}%`,
      top: top - 7,
      transform: 'translate(-50%, -100%)',
    } as CSSProperties
  })()
  const scanEnabled = settings.reviewMode !== 'manual'
  const dailyQuizIdentity = settings.identityFields.includes('学号') && !settings.identityFields.includes('准考证号')
  const hiddenItemIds = header.hiddenItemIds ?? []
  const isHeaderItemHidden = (id: string) => hiddenItemIds.includes(id)
  const hideHeaderItem = (id: string) => onHeaderChange?.({ ...header, customized: true, hiddenItemIds: [...hiddenItemIds, id] })
  const restoreHeaderItem = (id: string) => onHeaderChange?.({ ...header, customized: true, hiddenItemIds: hiddenItemIds.filter((item) => item !== id) })
  const hiddenHeaderItems = header.preset === 'exam'
    ? header.modules.filter((module) => hiddenItemIds.includes(module.id)).map((module) => ({ id: module.id, label: module.label }))
    : [
        { id: 'daily-student-id', label: '学号' },
        { id: 'daily-notice', label: '注意事项' },
        { id: 'daily-fill-sample', label: '填涂样例' },
      ].filter((item) => hiddenItemIds.includes(item.id))
  const [editingTitle, setEditingTitle] = useState(false)
  const [showHiddenHeaderItems, setShowHiddenHeaderItems] = useState(false)
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
      {page === 1 && onHeaderChange && hiddenHeaderItems.length > 0 && <div className="hidden-header-items-control">
        <button type="button" className="hidden-header-items-trigger" aria-expanded={showHiddenHeaderItems} onClick={(event) => { event.stopPropagation(); setShowHiddenHeaderItems((visible) => !visible) }}><Eye size={11} /> 已隐藏内容 {hiddenHeaderItems.length}</button>
        {showHiddenHeaderItems && <div className="hidden-header-items-popover" role="menu">{hiddenHeaderItems.map((item) => <button type="button" role="menuitem" key={item.id} onClick={(event) => { event.stopPropagation(); restoreHeaderItem(item.id); setShowHiddenHeaderItems(false) }}><Eye size={11} /> 恢复{item.label}</button>)}</div>}
      </div>}
      {header.preset === 'exam' ? (
        <AnswerSheetHeader
          header={header}
          paper={paper}
          settings={settings}
          page={page}
          pageCount={pageCount}
          editable={Boolean(onHeaderChange)}
          onChange={onHeaderChange}
          onTitleCommit={onTitleCommit}
        />
      ) : page > 1 ? null : <header className={`paper-header ${dailyQuizIdentity ? 'daily-quiz-header' : ''}`}>
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
        </div>
        {dailyQuizIdentity && <div className="daily-qr" aria-label="答题卡二维码"><QrCode size={46} strokeWidth={2.4} /></div>}
        <div className="identity-and-code">
          <div className={`identity-grid ${dailyQuizIdentity ? 'daily-identity-grid' : ''}`}>
            {settings.identityFields.filter((field) => field !== '学号' || !isHeaderItemHidden('daily-student-id')).map((field) => (
              field === '班级' && dailyQuizIdentity
                ? <span key={field} className="grade-class-field"><i /><em>年级</em><i /><em>班</em></span>
                : <span key={field} className={field === '学号' ? 'daily-hideable-item' : ''}><b>{field}</b><i />{field === '学号' && onHeaderChange && <button type="button" className="daily-hide-action" aria-label="隐藏学号" onClick={() => hideHeaderItem('daily-student-id')}><EyeOff size={9} />隐藏</button>}</span>
            ))}
          </div>
          <CandidateNumberArea settings={settings} />
        </div>
        {(standard || scanEnabled) && <span className="locked-zone-label"><LockKeyhole size={10} /> {standard ? rulePack.shortName : '网阅定位'} · 身份与考号区</span>}
      </header>}

      {header.preset === 'quiz' && page === 1 && settings.showNotice && (!isHeaderItemHidden('daily-notice') || !isHeaderItemHidden('daily-fill-sample')) && (
        <div className={`candidate-notice notice-style-${settings.noticeStyle} ${!isHeaderItemHidden('daily-notice') && !isHeaderItemHidden('daily-fill-sample') ? 'has-both' : 'has-single'}`}>
          {!isHeaderItemHidden('daily-notice') && <div className="candidate-notice-part daily-hideable-item">
            <strong className="notice-vertical-title">注意事项</strong>
            <ol>
              <li>答题前请将{settings.identityFields.filter((field) => field !== '学号' || !isHeaderItemHidden('daily-student-id')).join('、')}填写清楚。</li>
              <li>客观题答题，必须使用 2B 铅笔填涂，修改时用橡皮擦干净。</li>
              <li>主观题必须使用黑色字迹签字笔书写。</li>
              <li>必须在题号对应的答题区域内作答，超出答题区域书写无效。</li>
              <li>保持答卷清洁完整，请勿折叠或污损答题卡。</li>
            </ol>
            {onHeaderChange && <button type="button" className="daily-hide-action" aria-label="隐藏注意事项" onClick={() => hideHeaderItem('daily-notice')}><EyeOff size={9} />隐藏</button>}
          </div>}
          {!isHeaderItemHidden('daily-fill-sample') && <div className="candidate-notice-part daily-hideable-item">
            <strong className="notice-vertical-title">填涂样例</strong>
            <div className="fill-sample">
              <span>正确填涂： <i className="fill-correct" /></span>
              <span>错误填涂： <i>●</i> <i>×</i> <i>—</i> <i>✓</i></span>
            </div>
            {onHeaderChange && <button type="button" className="daily-hide-action" aria-label="隐藏填涂样例" onClick={() => hideHeaderItem('daily-fill-sample')}><EyeOff size={9} />隐藏</button>}
          </div>}
        </div>
      )}
      <div className={`paper-blocks columns-${columns}`} style={{ height: contentHeight }}>
        {selectionToolbarStyle && <div className="canvas-selection-toolbar" style={selectionToolbarStyle}>{selectionToolbar}</div>}
        {pageBlocks.map((block) => {
          const layout = blockLayouts.get(block.id) ?? { x: 0, y: 0, width: 100 }
          const seamlessTop = pageBlocks.some((other) => {
            if (other.id === block.id) return false
            if (block.kind === 'forbidden' || other.kind === 'forbidden') return false
            const otherLayout = blockLayouts.get(other.id)
            if (!otherLayout || Math.abs(otherLayout.y + other.height - layout.y) > 0.5) return false
            return Math.min(otherLayout.x + otherLayout.width, layout.x + layout.width) - Math.max(otherLayout.x, layout.x) > 0.5
          })
          const seamlessLeft = pageBlocks.some((other) => {
            if (other.id === block.id) return false
            if (block.kind === 'forbidden' || other.kind === 'forbidden') return false
            const otherLayout = blockLayouts.get(other.id)
            if (!otherLayout || Math.abs(otherLayout.x + otherLayout.width - layout.x) > 0.05) return false
            return Math.min(otherLayout.y + other.height, layout.y + block.height) - Math.max(otherLayout.y, layout.y) > 0.5
          })
          return (
          <AnswerBlockView
            key={block.id}
            block={block}
            layout={layout}
            seamlessTop={seamlessTop}
            seamlessLeft={seamlessLeft}
            selected={selectedBlockIds.length === 1 && selectedBlockIds.includes(block.id)}
            multiSelected={selectedBlockIds.length > 1 && selectedBlockIds.includes(block.id)}
            locked={standard && Boolean(block.locked)}
            onSelect={(additive) => { onSelectBlock?.(block.id); onSelectionChange?.(block.id, Boolean(additive)) }}
            onTitleCommit={onBlockTitleCommit ? (title) => onBlockTitleCommit(block.id, title) : undefined}
            onMoveCommit={onMoveBlock ? (x, y, targetPage) => onMoveBlock(block.id, x, y, targetPage) : undefined}
            onResizeCommit={onResizeBlock ? (height, width) => onResizeBlock(block.id, height, width) : undefined}
            onToggleContent={onToggleBlockContent ? (element) => onToggleBlockContent(block.id, element) : undefined}
            onQuestionAction={onQuestionAction ? (number, action, value) => onQuestionAction(block.id, number, action, value) : undefined}
            onUpdateBlock={onUpdateBlock ? (patch) => onUpdateBlock(block.id, patch) : undefined}
            onInsertAfter={onInsertAfter ? (kind, responseStyle, position) => onInsertAfter(block.id, kind, responseStyle, position) : undefined}
            onSplitMerged={block.mergedParts?.length && onSplitMerged ? () => onSplitMerged(block.id) : undefined}
            onDeleteBlock={onDeleteInsertedBlock ? () => onDeleteInsertedBlock(block.id) : undefined}
            onUndo={onUndo}
            onRedo={onRedo}
            questionAnswer={settings.cardStyle === 'question-answer'}
            objectiveSortMode={settings.objectiveSortMode}
            objectiveMerge={settings.objectiveMerge}
            subjectiveAnswerStyle={settings.subjectiveAnswerStyle}
            subjectiveLineHeight={settings.subjectiveLineHeight}
            subjectiveManualGrading={settings.subjectiveManualGrading}
            manualScoreStyle={settings.manualScoreStyle}
            allowHalfScore={settings.allowHalfScore}
            questionContext={paper.sections.filter((section) => {
              const blockNumbers = new Set(questionNumbers(block.range))
              return questionNumbers(section.range).some((number) => blockNumbers.has(number))
            }).map((section) => section.title).join(' / ')}
          />
          )
        })}
      </div>
      {settings.showFooter && (
        <footer className="paper-footer">{settings.footerText} · 第 {page} 面（共 {pageCount} 面）</footer>
      )}
    </article>
  )
}

export function AnswerSheetCanvas(props: AnswerSheetCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [fitZoom, setFitZoom] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>(props.selectedBlockId ? [props.selectedBlockId] : [])
  const [marquee, setMarquee] = useState<{ page: number; startX: number; startY: number; currentX: number; currentY: number } | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const paper = viewport?.querySelector<HTMLElement>('.answer-paper')
    if (!viewport || !paper) return
    const fitPaper = () => {
      const availableWidth = viewport.clientWidth - 24
      if (availableWidth > 0 && paper.offsetWidth > 0) {
        setFitZoom(Math.min(1.05, availableWidth / paper.offsetWidth))
      }
    }
    const observer = new ResizeObserver(fitPaper)
    observer.observe(viewport)
    observer.observe(paper)
    fitPaper()
    return () => observer.disconnect()
  }, [props.settings.paperSize])

  useEffect(() => {
    if (!props.selectedBlockId) {
      setSelectedIds([])
      return
    }
    setSelectedIds((current) => current.includes(props.selectedBlockId) ? current : [props.selectedBlockId])
  }, [props.selectedBlockId])

  useEffect(() => {
    const page = document.querySelector(`.paper-stack [data-paper-page="${props.activePage}"]`)
    page?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [props.activePage])

  useEffect(() => {
    const clearWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, [contenteditable="true"]')) return
      setSelectedIds([])
      props.onSelectBlock('')
      setMarquee(null)
    }
    window.addEventListener('keydown', clearWithEscape)
    return () => window.removeEventListener('keydown', clearWithEscape)
  }, [props.onSelectBlock])

  const selectBlock = (id: string, additive: boolean) => {
    setSelectedIds((current) => additive
      ? current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      : [id])
  }

  const beginMarquee = (page: number, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('.answer-block, .answer-sheet-header, .candidate-notice, button, input, textarea, select, [contenteditable="true"]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setMarquee({ page, startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY })
  }

  const moveMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    setMarquee((current) => current ? { ...current, currentX: event.clientX, currentY: event.clientY } : current)
  }

  const finishMarquee = (page: number, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!marquee || marquee.page !== page) return
    const left = Math.min(marquee.startX, event.clientX)
    const right = Math.max(marquee.startX, event.clientX)
    const top = Math.min(marquee.startY, event.clientY)
    const bottom = Math.max(marquee.startY, event.clientY)
    const isClick = right - left < 5 && bottom - top < 5
    if (isClick) {
      setSelectedIds([])
      props.onSelectBlock('')
      setMarquee(null)
      return
    }
    const frame = event.currentTarget
    const ids = Array.from(frame.querySelectorAll<HTMLElement>('.answer-block[data-block-id]'))
      .filter((block) => {
        const rect = block.getBoundingClientRect()
        return rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top
      })
      .map((block) => block.dataset.blockId)
      .filter((id): id is string => Boolean(id))
    setSelectedIds(ids)
    props.onSelectBlock(ids[0] ?? '')
    setMarquee(null)
  }

  const selectedBlocks = props.blocks.filter((block) => selectedIds.includes(block.id))
  const selectedCategory = selectedBlocks[0]?.kind === 'objective' ? 'objective' : 'subjective'
  const canMerge = selectedBlocks.length > 1
    && selectedBlocks.every((block) => block.page === selectedBlocks[0].page && isQuestionBlockKind(block.kind) && !block.locked)
    && selectedBlocks.every((block) => (block.kind === 'objective' ? 'objective' : 'subjective') === selectedCategory)
  const toolbarPage = selectedBlocks.length > 0 && selectedBlocks.every((block) => block.page === selectedBlocks[0].page)
    ? selectedBlocks[0].page
    : undefined

  const mergeSelection = () => {
    const mergedBlockId = props.blocks.find((block) => selectedIds.includes(block.id))?.id
    const firstSelected = document.querySelector(`.paper-stack [data-block-id="${CSS.escape(selectedIds[0] ?? '')}"]`) as HTMLElement | null
    const paperBlocks = firstSelected?.closest('.paper-blocks') as HTMLElement | null
    if (!paperBlocks) {
      props.onMergeBlocks([...selectedIds])
      return
    }
    const rects = selectedIds.map((id) => {
      const element = paperBlocks.querySelector(`[data-block-id="${CSS.escape(id)}"]`) as HTMLElement | null
      if (!element) return undefined
      return {
        left: element.offsetLeft,
        top: element.offsetTop,
        right: element.offsetLeft + element.offsetWidth,
        bottom: element.offsetTop + element.offsetHeight,
      }
    }).filter((rect): rect is NonNullable<typeof rect> => Boolean(rect))
    if (rects.length !== selectedIds.length) {
      props.onMergeBlocks([...selectedIds])
      return
    }
    const left = Math.min(...rects.map((rect) => rect.left))
    const top = Math.min(...rects.map((rect) => rect.top))
    const right = Math.max(...rects.map((rect) => rect.right))
    const bottom = Math.max(...rects.map((rect) => rect.bottom))
    props.onMergeBlocks([...selectedIds], {
      x: left / paperBlocks.offsetWidth * 100,
      y: top,
      width: (right - left) / paperBlocks.offsetWidth * 100,
      height: bottom - top,
    })
    if (mergedBlockId) setSelectedIds([mergedBlockId])
  }

  const selectionToolbar = selectedIds.length > 1 ? <>
    <span>{`已选 ${selectedIds.length} 个`}</span>
      <MetisButton
        type="primary"
        size="s"
        icon={<Combine size={13} />}
        disabled={!canMerge}
        onClick={mergeSelection}
      >
        合并
      </MetisButton>
  </> : undefined

  return (
    <section className="answer-canvas" data-sec="5">
      <div className="paper-viewport" ref={viewportRef} onPointerDown={(event) => {
        const target = event.target as HTMLElement
        if (event.button === 0 && (target === event.currentTarget || target.classList.contains('paper-stack'))) {
          setSelectedIds([])
          props.onSelectBlock('')
        }
      }}>
        <div className="paper-stack" style={{ '--canvas-zoom': fitZoom } as CSSProperties}>
          {Array.from({ length: props.pageCount }, (_, index) => index + 1).map((page) => (
            <div
              className={`paper-frame ${marquee?.page === page ? 'is-marquee-selecting' : ''}`}
              key={page}
              onPointerDown={(event) => beginMarquee(page, event)}
              onPointerMove={moveMarquee}
              onPointerUp={(event) => finishMarquee(page, event)}
              onPointerCancel={() => setMarquee(null)}
            >
              <PaperPage
                paper={props.paper}
                blocks={props.blocks}
                mode={props.mode}
                rulePack={props.rulePack}
                settings={props.settings}
                header={props.header}
                page={page}
                pageCount={props.pageCount}
                selectedBlockIds={selectedIds}
                onSelectBlock={props.onSelectBlock}
                onSelectionChange={selectBlock}
                onTitleCommit={props.onTitleCommit}
                onBlockTitleCommit={props.onBlockTitleCommit}
                onMoveBlock={props.onMoveBlock}
                onResizeBlock={props.onResizeBlock}
                onToggleBlockContent={props.onToggleBlockContent}
                onQuestionAction={props.onQuestionAction}
                onUpdateBlock={props.onUpdateBlock}
                onInsertAfter={props.onInsertAfter}
                onSplitMerged={props.onSplitMerged}
                onDeleteInsertedBlock={props.onDeleteInsertedBlock}
                onUndo={props.onUndo}
                onRedo={props.onRedo}
                onMergeBlocks={props.onMergeBlocks}
                onHeaderChange={props.onHeaderChange}
                selectionToolbar={page === toolbarPage ? selectionToolbar : undefined}
              />
              <button type="button" className={`paper-page-badge ${page === props.activePage ? 'active' : ''}`} onClick={() => props.onPageChange(page)} aria-label={`定位第 ${page} 面`}>{page}/{props.pageCount}</button>
            </div>
          ))}
          {marquee && <div
            className="canvas-marquee-selection"
            style={{
              left: Math.min(marquee.startX, marquee.currentX),
              top: Math.min(marquee.startY, marquee.currentY),
              width: Math.abs(marquee.currentX - marquee.startX),
              height: Math.abs(marquee.currentY - marquee.startY),
            }}
          />}
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
            header={props.printDocument?.header ?? props.header}
            page={page}
            pageCount={props.printDocument?.pageCount ?? props.pageCount}
          />
        ))}
      </div>
    </section>
  )
}
