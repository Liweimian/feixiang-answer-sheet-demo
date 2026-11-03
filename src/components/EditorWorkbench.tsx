import { MetisAlert } from '@yuanfudao/metis-web-component'
import type {
  AnswerBlock,
  AnswerBlockKind,
  CardMode,
  ExamPaper,
  RulePack,
} from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { parseQuestionRange } from '../features/answer-sheet/range'
import { AnswerSheetCanvas } from './AnswerSheetCanvas'
import { InspectorPanel } from './InspectorPanel'
import { QuestionOutline } from './QuestionOutline'

interface EditorWorkbenchProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  pageCount: number
  activePage: number
  selectedBlockId: string
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdate: (patch: Partial<AnswerBlock>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onDelete: () => void
  onAdd: (kind: AnswerBlockKind) => void
  onTitleCommit: (title: string) => void
}

export function EditorWorkbench(props: EditorWorkbenchProps) {
  const selectedBlock = props.blocks.find((block) => block.id === props.selectedBlockId)
  const mismatch = props.mode === 'standard' && props.rulePack.id.startsWith('shenzhen') && props.paper.subject === '英语'
  const isTrueBlank = props.paper.sections.length === 0
  const hasBlocks = props.blocks.length > 0
  const blankConfigured = isTrueBlank && props.paper.score > 0 && props.blocks.some((block) => (
    isQuestionBlockKind(block.kind) && (block.score ?? 0) > 0 && parseQuestionRange(block.range).valid
  ))

  return (
    <div className="editor-workbench-wrap">
      <MetisAlert
        type={mismatch ? 'warning' : 'success'}
        showIcon
        message={mismatch ? '规则包与当前学科不匹配' : isTrueBlank ? (blankConfigured ? '空白卡题目结构已配置' : '真正空白卡已就绪') : props.mode === 'standard' ? '大考规范约束已生效' : `已根据${props.paper.subject}学科自动排版`}
        description={mismatch ? '当前为规则包预览，请在发布前选择与学科匹配的规则包。' : isTrueBlank ? (blankConfigured ? '总分已按题块自动汇总，可继续添加区域或执行印前校验。' : hasBlocks ? '请在右侧补齐每个题块的题号、分值与作答空间。' : '从右侧添加第一个题块；发布前还需补齐题号与总分结构。') : props.mode === 'standard' ? '身份区、条码区、定位点和禁答安全区已锁定。' : '题块按模板建议结构生成，可继续直接编辑和调整空间。'}
      />
      <div className="editor-workbench">
        <QuestionOutline
          paper={props.paper}
          blocks={props.blocks}
          pageCount={props.pageCount}
          selectedBlockId={props.selectedBlockId}
          activePage={props.activePage}
          mode={props.mode}
          onSelect={props.onSelect}
          onPageChange={props.onPageChange}
          onMove={props.onMove}
        />
        <AnswerSheetCanvas
          paper={props.paper}
          blocks={props.blocks}
          mode={props.mode}
          rulePack={props.rulePack}
          pageCount={props.pageCount}
          activePage={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onPageChange={props.onPageChange}
          onSelectBlock={props.onSelect}
          onTitleCommit={props.onTitleCommit}
        />
        <InspectorPanel
          block={selectedBlock}
          mode={props.mode}
          rulePack={props.rulePack}
          onUpdate={props.onUpdate}
          onMove={(direction) => props.onMove(props.selectedBlockId, direction)}
          onDelete={props.onDelete}
          onAdd={props.onAdd}
        />
      </div>
    </div>
  )
}
