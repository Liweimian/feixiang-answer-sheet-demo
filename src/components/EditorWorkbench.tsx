import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetSettings,
  ContentElement,
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
  onTitleCommit: (title: string) => void
  onBlockTitleCommit: (id: string, title: string) => void
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onScoreVisibilityChange: (visible: boolean) => void
  onRenumber: (start: number) => void
  onSplit: () => void
  onMerge: () => void
  onConsolidate: (kind: 'objective' | 'subjective') => void
  onMergeObjectiveModules: () => void
  onMoveBlock: (id: string, x: number, y: number) => void
  onResizeBlock: (id: string, height: number, width: number) => void
  onToggleBlockContent: (id: string, element: ContentElement) => void
  onUpdateCanvasBlock: (id: string, patch: Partial<AnswerBlock>) => void
  onInsertAfter: (id: string, kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle']) => void
  onUndo: () => void
  onRedo: () => void
  onMergeBlocks: (ids: string[]) => void
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
          onScoreVisibilityChange={props.onScoreVisibilityChange}
          onPageChange={props.onPageChange}
          onSelect={props.onSelect}
          onUpdateBlock={props.onUpdate}
          onAdd={props.onAdd}
        />
        <AnswerSheetCanvas
          paper={paper}
          blocks={blocks}
          mode={mode}
          rulePack={props.rulePack}
          settings={settings}
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
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onMergeBlocks={props.onMergeBlocks}
          onSplitMerged={props.onSplitMerged}
          printDocument={props.printDocument}
          printRulePack={printRulePack}
        />
      </div>
    </div>
  )
}
