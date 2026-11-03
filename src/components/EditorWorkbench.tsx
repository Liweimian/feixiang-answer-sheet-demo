import { MetisAlert } from '@yuanfudao/metis-web-component'
import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetSettings,
  CardMode,
  RulePack,
} from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { parseQuestionRange } from '../features/answer-sheet/range'
import { AnswerSheetCanvas } from './AnswerSheetCanvas'
import { AnswerSheetConfigPanel } from './AnswerSheetConfigPanel'

interface EditorWorkbenchProps {
  document: AnswerSheetDocument
  rulePacks: RulePack[]
  rulePack: RulePack
  templateName: string
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
  onModeChange: (mode: CardMode) => void
  onRulePackChange: (id: string) => void
  onOpenTemplates: () => void
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onPageCountChange: (count: number) => void
  onRenumber: (start: number) => void
  onSplit: () => void
  onMerge: () => void
  onConsolidate: (kind: 'objective' | 'subjective') => void
}

export function EditorWorkbench(props: EditorWorkbenchProps) {
  const { paper, blocks, mode, pageCount, settings } = props.document
  const mismatch = mode === 'standard' && props.rulePack.id.startsWith('shenzhen') && paper.subject === '英语'
  const isTrueBlank = paper.sections.length === 0
  const hasBlocks = blocks.length > 0
  const blankConfigured = isTrueBlank && paper.score > 0 && blocks.some((block) => (
    isQuestionBlockKind(block.kind) && (block.score ?? 0) > 0 && parseQuestionRange(block.range).valid
  ))
  const printRulePack = props.rulePacks.find((pack) => pack.id === props.printDocument?.rulePackId) ?? props.rulePack

  return (
    <div className="editor-workbench-wrap">
      <MetisAlert
        type={mismatch ? 'warning' : 'success'}
        showIcon
        message={mismatch ? '规则包与当前学科不匹配' : isTrueBlank ? (blankConfigured ? '空白卡题目结构已配置' : '真正空白卡已就绪') : mode === 'standard' ? '大考规范约束已生效' : `已根据${paper.subject}学科自动排版`}
        description={mismatch ? '当前为规则包预览，请在发布前选择与学科匹配的规则包。' : isTrueBlank ? (blankConfigured ? '总分已按题块自动汇总，可继续添加区域或执行印前校验。' : hasBlocks ? '请在左侧补齐每个题块的题号、分值与作答空间。' : '从左侧添加第一个题块；发布前还需补齐题号与总分结构。') : mode === 'standard' ? '身份区、条码区、定位点和禁答安全区已锁定。' : '题块按模板建议结构生成，可继续直接编辑和调整空间。'}
      />
      <div className="editor-workbench">
        <AnswerSheetConfigPanel
          document={props.document}
          rulePacks={props.rulePacks}
          templateName={props.templateName}
          activePage={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onModeChange={props.onModeChange}
          onRulePackChange={props.onRulePackChange}
          onOpenTemplates={props.onOpenTemplates}
          onSettingsChange={props.onSettingsChange}
          onPageCountChange={props.onPageCountChange}
          onPageChange={props.onPageChange}
          onSelect={props.onSelect}
          onUpdateBlock={props.onUpdate}
          onMove={(direction) => props.onMove(props.selectedBlockId, direction)}
          onReorder={props.onReorder}
          onDelete={props.onDelete}
          onAdd={props.onAdd}
          onRenumber={props.onRenumber}
          onSplit={props.onSplit}
          onMerge={props.onMerge}
          onConsolidate={props.onConsolidate}
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
          printDocument={props.printDocument}
          printRulePack={printRulePack}
        />
      </div>
    </div>
  )
}
