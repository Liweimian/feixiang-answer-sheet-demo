import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetSettings,
  ContentElement,
  HeaderLayout,
  HeaderPreset,
  HeaderTemplateId,
  RulePack,
} from '../features/answer-sheet/types'
import { AnswerSheetCanvas } from './AnswerSheetCanvas'
import { AnswerSheetConfigPanel } from './AnswerSheetConfigPanel'

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
  onMove: (id: string, direction: -1 | 1) => void
  onReorder: (dragId: string, targetId: string) => void
  onDelete: () => void
  onAdd: (kind: AnswerBlockKind) => void
  onAddQuestionGroup: () => void
  onTitleCommit: (title: string) => void
  onBlockTitleCommit: (id: string, title: string) => void
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
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
  const printRulePack = props.rulePacks.find((pack) => pack.id === props.printDocument?.rulePackId) ?? props.rulePack

  return (
    <div className="editor-workbench-wrap">
      <div className="editor-workbench">
        <AnswerSheetConfigPanel
          document={props.document}
          activePage={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onSettingsChange={props.onSettingsChange}
          onPresetChange={props.onPresetChange}
          onHeaderTemplateChange={props.onHeaderTemplateChange}
          onRestoreHeaderTemplate={props.onRestoreHeaderTemplate}
          onMetaVisibilityChange={props.onMetaVisibilityChange}
          onPageChange={props.onPageChange}
          onSelect={props.onSelect}
          onUpdateBlock={props.onUpdate}
          onAdd={props.onAdd}
          onAddQuestionGroup={props.onAddQuestionGroup}
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
