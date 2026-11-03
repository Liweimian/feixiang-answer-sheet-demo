import { MetisAlert } from '@yuanfudao/metis-web-component'
import type {
  AnswerBlock,
  AnswerBlockKind,
  CardMode,
  ExamPaper,
  RulePack,
} from '../features/answer-sheet/types'
import { AnswerSheetCanvas } from './AnswerSheetCanvas'
import { InspectorPanel } from './InspectorPanel'
import { QuestionOutline } from './QuestionOutline'

interface EditorWorkbenchProps {
  paper: ExamPaper
  blocks: AnswerBlock[]
  mode: CardMode
  rulePack: RulePack
  activePage: number
  selectedBlockId: string
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdate: (patch: Partial<AnswerBlock>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onDelete: () => void
  onAdd: (kind: AnswerBlockKind) => void
}

export function EditorWorkbench(props: EditorWorkbenchProps) {
  const selectedBlock = props.blocks.find((block) => block.id === props.selectedBlockId)
  const mismatch = props.mode === 'standard' && props.rulePack.id.startsWith('shenzhen') && props.paper.subject === '英语'

  return (
    <div className="editor-workbench-wrap">
      <MetisAlert
        type={mismatch ? 'warning' : 'success'}
        showIcon
        message={mismatch ? '规则包与当前学科不匹配' : props.mode === 'standard' ? '大考规范约束已生效' : '已根据英语学科自动排版'}
        description={mismatch ? '当前为规则包预览，发布前请切回北京英语兼容版。' : props.mode === 'standard' ? '身份区、条码区、定位点和禁答安全区已锁定。' : '客观题已合并为连续填涂区，短答与作文区按建议空间生成。'}
      />
      <div className="editor-workbench">
        <QuestionOutline
          paper={props.paper}
          blocks={props.blocks}
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
          activePage={props.activePage}
          selectedBlockId={props.selectedBlockId}
          onPageChange={props.onPageChange}
          onSelectBlock={props.onSelect}
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
