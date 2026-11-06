import { useEffect, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisInputNumber, MetisSelect, MetisTag } from '@yuanfudao/metis-web-component'
import type { QuestionGroupDraft, QuestionGroupType } from '../features/answer-sheet/types'

interface QuestionGroupDialogProps {
  open: boolean
  suggestedStart: number
  type: QuestionGroupType
  onClose: () => void
  onSubmit: (draft: QuestionGroupDraft) => void
}

const typeLabels: Record<QuestionGroupType, string> = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题', solution: '解答题', comprehensive: '综合题' }
const initialDraft = (startNumber: number, type: QuestionGroupType): QuestionGroupDraft => ({
  title: typeLabels[type], type, startNumber, questionCount: type === 'comprehensive' ? 1 : 10, totalScore: type === 'comprehensive' ? 10 : 20, optionCount: type === 'judge' ? 2 : 4,
})

export function QuestionGroupDialog(props: QuestionGroupDialogProps) {
  const [draft, setDraft] = useState<QuestionGroupDraft>(() => initialDraft(props.suggestedStart, props.type))

  useEffect(() => {
    if (props.open) setDraft(initialDraft(props.suggestedStart, props.type))
  }, [props.open, props.suggestedStart, props.type])

  const valid = draft.title.trim() && draft.startNumber > 0 && draft.questionCount > 0 && draft.totalScore >= 0
  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
    <MetisButton type="primary" disabled={!valid} onClick={() => props.onSubmit({ ...draft, title: draft.title.trim() })}>添加题组</MetisButton>
  </div>

  return <MetisDialog open={props.open} title="添加题组" width={560} footer={footer} onCancel={props.onClose}>
    <div className="question-group-form">
      <label className="question-group-wide"><span>题组名称</span><MetisInput value={draft.title} maxLength={24} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label><span>题型</span><div className="question-group-fixed-type"><MetisTag preset="primary">{typeLabels[draft.type]}</MetisTag><small>已从左侧选择</small></div></label>
      <label><span>起始题号</span><MetisInputNumber value={draft.startNumber} min={1} max={999} precision={0} onChange={(value) => setDraft({ ...draft, startNumber: Number(value ?? 1) })} /></label>
      <label><span>题量</span><MetisInputNumber value={draft.questionCount} min={1} max={100} precision={0} addonAfter="题" onChange={(value) => setDraft({ ...draft, questionCount: Number(value ?? 1) })} /></label>
      <label><span>总分</span><MetisInputNumber value={draft.totalScore} min={0} max={300} addonAfter="分" onChange={(value) => setDraft({ ...draft, totalScore: Number(value ?? 0) })} /></label>
      {(draft.type === 'single' || draft.type === 'multiple') && <label><span>选项数量</span><MetisSelect value={draft.optionCount} options={[{ value: 4, label: 'A–D' }, { value: 5, label: 'A–E' }]} onChange={(value) => setDraft({ ...draft, optionCount: Number(value) as 4 | 5 })} /></label>}
      <div className="question-group-summary">将生成 <strong>{draft.startNumber}–{draft.startNumber + draft.questionCount - 1}</strong> 题，共 <strong>{draft.totalScore} 分</strong>；添加后可在画布中拖动、缩放、合并或分割。</div>
    </div>
  </MetisDialog>
}
