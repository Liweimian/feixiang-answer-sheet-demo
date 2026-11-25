import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, FileText, PanelTop, Settings2 } from 'lucide-react'
import { examHeaderTemplates } from '../data/headerTemplates'
import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetSettings,
  ContentElement,
  HeaderLayout,
  HeaderPreset,
  HeaderTemplateId,
  QuestionGroupType,
  RulePack,
} from '../features/answer-sheet/types'
import { AnswerSheetCanvas } from './AnswerSheetCanvas'
import { AnswerSheetConfigPanel, AnswerSheetMoreSettings } from './AnswerSheetConfigPanel'

interface EditorWorkbenchProps {
  document: AnswerSheetDocument
  rulePacks: RulePack[]
  rulePack: RulePack
  activePage: number
  selectedBlockId: string
  printDocument?: AnswerSheetDocument
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdate: (patch: Partial<AnswerBlock>) => void
  onBlockScoresChange: (id: string, scores: Record<string, number>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onReorder: (dragId: string, targetId: string) => void
  onDelete: () => void
  onAdd: (kind: AnswerBlockKind) => void
  onBatchAddQuestionGroups: () => void
  onAddQuestionGroup: (type: QuestionGroupType) => void
  onEditQuestionGroup: (id: string) => void
  onTitleCommit: (title: string) => void
  onBlockTitleCommit: (id: string, title: string) => void
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onModuleMergeChange: (kind: 'objective' | 'subjective' | 'none', checked: boolean) => void
  onPresetChange: (preset: HeaderPreset) => void
  onHeaderTemplateChange: (templateId: HeaderTemplateId) => void
  onRestoreHeaderTemplate: () => void
  onHeaderChange: (header: HeaderLayout) => void
  onMetaVisibilityChange: (field: 'showQuestionCount' | 'showUnitScore' | 'showScore', visible: boolean) => void
  onRenumber: (start: number) => void
  onSplit: () => void
  onMerge: () => void
  onConsolidate: (kind: 'objective' | 'subjective') => void
  onMergeObjectiveModules: () => void
  onMoveBlock: (id: string, x: number, y: number, page: number) => void
  onResizeBlock: (id: string, height: number, width: number) => void
  onToggleBlockContent: (id: string, element: ContentElement) => void
  onUpdateCanvasBlock: (id: string, patch: Partial<AnswerBlock>) => void
  onInsertAfter: (id: string, kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle'], position?: 'before' | 'after') => void
  onDeleteInsertedBlock: (id: string) => void
  onUndo: () => void
  onRedo: () => void
  onMergeBlocks: (ids: string[], layout?: { x: number; y: number; width: number; height: number }) => void
  onSplitMerged: (id: string) => void
}

export function EditorWorkbench(props: EditorWorkbenchProps) {
  const { paper, blocks, mode, pageCount, settings } = props.document
  const [openMenu, setOpenMenu] = useState<'layout' | 'header' | 'more' | null>(null)
  const [pendingPaperSize, setPendingPaperSize] = useState(settings.paperSize)
  const toolbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node) && !(event.target as Element).closest('[role="listbox"], [role="option"]')) setOpenMenu(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])
  const headerOptions = [{ id: 'daily-quiz', label: '日常测验' }, ...examHeaderTemplates.map((template) => ({ id: template.id, label: template.shortName }))]
  const headerId = props.document.header.preset === 'quiz' ? 'daily-quiz' : props.document.header.templateId
  const printRulePack = props.rulePacks.find((pack) => pack.id === props.printDocument?.rulePackId) ?? props.rulePack

  return (
    <div className="editor-workbench-wrap">
      <div ref={toolbarRef} className="workbench-layout-toolbar" aria-label="整卡版面设置">
        <div className="layout-menu-anchor">
          <button type="button" className="layout-menu-trigger" aria-expanded={openMenu === 'layout'} onClick={() => {
            setPendingPaperSize(settings.paperSize)
            setOpenMenu(openMenu === 'layout' ? null : 'layout')
          }}><FileText size={17} /><span>{settings.paperSize}-{settings.frontColumns === 1 ? '单栏' : settings.frontColumns === 2 ? '双栏' : '三栏'}</span><ChevronDown size={13} /></button>
          {openMenu === 'layout' && <div className="layout-choice-panel" aria-label="纸张与分栏">
            <div className="layout-choice-column"><span>纸张</span>{(['A4', 'A3', '8K', '16K'] as const).map((size) => <button type="button" key={size} className={pendingPaperSize === size ? 'is-active' : ''} onClick={() => setPendingPaperSize(size)}>{size}{pendingPaperSize === size && <Check size={14} />}</button>)}</div>
            <div className="layout-choice-column"><span>分栏</span>{([1, 2, 3] as const).map((columns) => <button type="button" key={columns} className={settings.frontColumns === columns ? 'is-active' : ''} onClick={() => {
              props.onSettingsChange({ paperSize: pendingPaperSize, frontColumns: columns, backColumns: columns })
              setOpenMenu(null)
            }}><span className={`layout-column-preview columns-${columns}`}>{Array.from({ length: columns }, (_, index) => <i key={index} />)}</span>{columns === 1 ? '单栏' : columns === 2 ? '双栏' : '三栏'}{settings.frontColumns === columns && <Check size={14} />}</button>)}</div>
          </div>}
        </div>
        <div className="layout-menu-anchor">
          <button type="button" className="layout-menu-trigger" aria-expanded={openMenu === 'header'} onClick={() => setOpenMenu(openMenu === 'header' ? null : 'header')}><PanelTop size={17} /><span>表头：{headerOptions.find((option) => option.id === headerId)?.label ?? '日常测验'}</span><ChevronDown size={13} /></button>
          {openMenu === 'header' && <div className="header-choice-panel" aria-label="选择表头">{headerOptions.map((option) => <button type="button" key={option.id} className={headerId === option.id ? 'is-active' : ''} onClick={() => {
            if (option.id === 'daily-quiz') props.onPresetChange('quiz')
            else props.onHeaderTemplateChange(option.id as HeaderTemplateId)
            setOpenMenu(null)
          }}>{option.label}{headerId === option.id && <Check size={14} />}</button>)}</div>}
        </div>
        <i className="layout-toolbar-divider" />
        <div className="layout-menu-anchor">
          <button type="button" className="layout-menu-trigger" aria-expanded={openMenu === 'more'} onClick={() => setOpenMenu(openMenu === 'more' ? null : 'more')}><Settings2 size={18} />更多<ChevronDown size={13} /></button>
          {openMenu === 'more' && <div className="more-settings-popover" aria-label="更多卡面设置">
            <AnswerSheetMoreSettings document={props.document} onSettingsChange={props.onSettingsChange} onModuleMergeChange={props.onModuleMergeChange} onMetaVisibilityChange={props.onMetaVisibilityChange} />
          </div>}
        </div>
      </div>
      <div className="editor-workbench">
        <AnswerSheetConfigPanel
          document={props.document}
          activePage={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onSettingsChange={props.onSettingsChange}
          onModuleMergeChange={props.onModuleMergeChange}
          onPresetChange={props.onPresetChange}
          onHeaderTemplateChange={props.onHeaderTemplateChange}
          onRestoreHeaderTemplate={props.onRestoreHeaderTemplate}
          onMetaVisibilityChange={props.onMetaVisibilityChange}
          onPageChange={props.onPageChange}
          onSelect={props.onSelect}
          onUpdateBlock={props.onUpdate}
          onBlockScoresChange={props.onBlockScoresChange}
          onAdd={props.onAdd}
          onBatchAddQuestionGroups={props.onBatchAddQuestionGroups}
          onAddQuestionGroup={props.onAddQuestionGroup}
          onEditQuestionGroup={props.onEditQuestionGroup}
          onDeleteBlock={(id) => {
            props.onSelect(id)
            props.onDeleteInsertedBlock(id)
          }}
        />
        <AnswerSheetCanvas
          paper={paper}
          blocks={blocks}
          mode={mode}
          rulePack={props.rulePack}
          settings={settings}
          header={props.document.header}
          pageCount={pageCount}
          activePage={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onPageChange={props.onPageChange}
          onSelectBlock={props.onSelect}
          onTitleCommit={props.onTitleCommit}
          onBlockTitleCommit={props.onBlockTitleCommit}
          onMoveBlock={props.onMoveBlock}
          onResizeBlock={props.onResizeBlock}
          onToggleBlockContent={props.onToggleBlockContent}
          onUpdateBlock={props.onUpdateCanvasBlock}
          onInsertAfter={props.onInsertAfter}
          onDeleteInsertedBlock={props.onDeleteInsertedBlock}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onMergeBlocks={props.onMergeBlocks}
          onSplitMerged={props.onSplitMerged}
          onHeaderChange={props.onHeaderChange}
          printDocument={props.printDocument}
          printRulePack={printRulePack}
        />
      </div>
    </div>
  )
}
