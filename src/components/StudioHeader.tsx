import { ChevronRight, CircleHelp, Cloud, FileText, Sparkles } from 'lucide-react'

export function StudioHeader({ paperTitle }: { paperTitle: string }) {
  return (
    <header className="fx-page-header studio-header">
      <div className="studio-brand">
        <span><Sparkles size={18} /></span>
        <div><strong>答题卡智能制卡</strong><small>当前试卷已自动生成答题卡</small></div>
      </div>
      <div className="studio-context" aria-label="当前位置">
        <span><FileText size={14} /> 组卷</span><ChevronRight size={13} /><strong>答题卡编辑</strong><small>{paperTitle}</small>
      </div>
      <div className="studio-utilities">
        <span><Cloud size={15} /> 云端草稿</span>
        <button type="button"><CircleHelp size={17} /> 帮助</button>
        <div className="teacher-avatar">李</div>
      </div>
    </header>
  )
}
