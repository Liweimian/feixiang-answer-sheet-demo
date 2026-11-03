import { CircleHelp, Cloud, Sparkles } from 'lucide-react'
import type { FlowStage } from '../features/answer-sheet/types'

const stageIndex: Record<FlowStage, number> = { source: 1, parsing: 2, editor: 3 }

export function StudioHeader({ stage }: { stage: FlowStage }) {
  const current = stageIndex[stage]
  return (
    <header className="fx-page-header studio-header">
      <div className="studio-brand">
        <span><Sparkles size={18} /></span>
        <div><strong>答题卡智能制卡</strong><small>从原卷到可印刷版本</small></div>
      </div>
      <div className="studio-steps" aria-label="制卡进度">
        {['选择来源', '解析结构', '编辑与发布'].map((label, index) => (
          <div key={label} className={current === index + 1 ? 'active' : current > index + 1 ? 'done' : ''}>
            <span>{index + 1}</span><strong>{label}</strong>
          </div>
        ))}
      </div>
      <div className="studio-utilities">
        <span><Cloud size={15} /> 云端草稿</span>
        <button type="button"><CircleHelp size={17} /> 帮助</button>
        <div className="teacher-avatar">李</div>
      </div>
    </header>
  )
}
