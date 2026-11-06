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
const createItems = (start: number, count: number, total: number) => Array.from({ length: count }, (_, index) => ({
  number: start + index, score: Number((total / count).toFixed(2)), blankCount: 1,
  fillStyle: 'lines' as const, lineCount: 5, subquestionCount: 0,
  optionCount: 4 as const, answer: '',
}))
const initialDraft = (startNumber: number, type: QuestionGroupType): QuestionGroupDraft => {
  const questionCount = type === 'comprehensive' ? 1 : type === 'fill' || type === 'solution' ? 4 : 10
  const totalScore = type === 'comprehensive' ? 10 : 20
  return { title: typeLabels[type], type, startNumber, questionCount, totalScore, optionCount: type === 'judge' ? 2 : 4, items: createItems(startNumber, questionCount, totalScore) }
}

export function QuestionGroupDialog(props: QuestionGroupDialogProps) {
  const [draft, setDraft] = useState<QuestionGroupDraft>(() => initialDraft(props.suggestedStart, props.type))

  useEffect(() => {
    if (props.open) setDraft(initialDraft(props.suggestedStart, props.type))
  }, [props.open, props.suggestedStart, props.type])

  const updateBatch = (patch: Partial<QuestionGroupDraft>) => {
    const next = { ...draft, ...patch }
    next.items = createItems(next.startNumber, next.questionCount, next.totalScore).map((item, index) => ({ ...item, ...draft.items[index], number: next.startNumber + index, score: patch.totalScore === undefined ? (draft.items[index]?.score ?? item.score) : item.score }))
    setDraft(next)
  }
  const updateItem = (index: number, patch: Partial<QuestionGroupDraft['items'][number]>) => {
    const items = draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    setDraft({ ...draft, items, totalScore: Number(items.reduce((sum, item) => sum + item.score, 0).toFixed(2)) })
  }
  const valid = draft.title.trim() && draft.startNumber > 0 && draft.questionCount > 0 && draft.items.every((item) => item.score >= 0)
  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
    <MetisButton type="primary" disabled={!valid} onClick={() => props.onSubmit({ ...draft, title: draft.title.trim() })}>添加题组</MetisButton>
  </div>

  const objective = draft.type === 'single' || draft.type === 'multiple'
  const specialized = objective || draft.type === 'fill' || draft.type === 'solution'
  return <MetisDialog open={props.open} title={`添加${typeLabels[draft.type]}`} width={specialized ? 920 : 560} footer={footer} onCancel={props.onClose}>
    <div className={`question-group-builder ${specialized ? 'specialized' : ''}`}>
      <aside className="question-group-form">
        <label className="question-group-wide"><span>题组名称</span><MetisInput value={draft.title} maxLength={24} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label><span>题型</span><div className="question-group-fixed-type"><MetisTag preset="primary">{typeLabels[draft.type]}</MetisTag></div></label>
        <label><span>起始题号</span><MetisInputNumber value={draft.startNumber} min={1} max={999} precision={0} onChange={(value) => updateBatch({ startNumber: Number(value ?? 1) })} /></label>
        <label><span>题量</span><MetisInputNumber value={draft.questionCount} min={1} max={100} precision={0} addonAfter="题" onChange={(value) => updateBatch({ questionCount: Number(value ?? 1) })} /></label>
        <label><span>每题分值</span><MetisInputNumber value={draft.questionCount ? draft.totalScore / draft.questionCount : 0} min={0} max={300} addonAfter="分" onChange={(value) => updateBatch({ totalScore: Number(value ?? 0) * draft.questionCount })} /></label>
        {objective && <label><span>选项数量</span><MetisSelect value={draft.optionCount} options={[{ value: 4, label: 'A–D' }, { value: 5, label: 'A–E' }]} onChange={(value) => { const optionCount = Number(value) as 4 | 5; setDraft({ ...draft, optionCount, items: draft.items.map((item) => ({ ...item, optionCount })) }) }} /></label>}
        {draft.type === 'fill' && <><label><span>每题空数</span><MetisInputNumber value={draft.items[0]?.blankCount ?? 1} min={1} max={12} precision={0} addonAfter="空" onChange={(value) => setDraft({ ...draft, items: draft.items.map((item) => ({ ...item, blankCount: Number(value ?? 1) })) })} /></label><label><span>填空样式</span><MetisSelect value={draft.items[0]?.fillStyle} options={[{ value: 'lines', label: '横线' }, { value: 'tian', label: '田字格' }, { value: 'mi', label: '米字格' }, { value: 'four-line', label: '四线三格' }]} onChange={(value) => setDraft({ ...draft, items: draft.items.map((item) => ({ ...item, fillStyle: value as typeof item.fillStyle })) })} /></label></>}
        {draft.type === 'solution' && <label><span>作答行数</span><MetisInputNumber value={draft.items[0]?.lineCount ?? 5} min={1} max={30} precision={0} addonAfter="行" onChange={(value) => setDraft({ ...draft, items: draft.items.map((item) => ({ ...item, lineCount: Number(value ?? 5) })) })} /></label>}
        {!specialized && <div className="question-group-summary">将生成 <strong>{draft.startNumber}–{draft.startNumber + draft.questionCount - 1}</strong> 题，共 <strong>{draft.totalScore} 分</strong>。</div>}
      </aside>
      {specialized && <section className="question-item-editor"><header><strong>{typeLabels[draft.type]}：{draft.questionCount}题，共{draft.totalScore}分</strong><span>可逐题微调</span></header><div className={`question-item-table ${objective ? 'objective-items' : ''}`}><div className="question-item-head"><span>题号</span><span>分值</span><span>{objective ? '选项' : draft.type === 'fill' ? '空数' : '作答行数'}</span><span>{objective ? '正确答案' : draft.type === 'fill' ? '样式' : '小题数'}</span></div>{draft.items.map((item, index) => <div className="question-item-row" key={item.number}><b>{item.number}</b><MetisInputNumber value={item.score} min={0} max={100} addonAfter="分" onChange={(value) => updateItem(index, { score: Number(value ?? 0) })} />{objective ? <><MetisSelect value={item.optionCount} options={[{ value: 4, label: 'A–D' }, { value: 5, label: 'A–E' }]} onChange={(value) => updateItem(index, { optionCount: Number(value) as 4 | 5 })} /><MetisInput value={item.answer} placeholder={draft.type === 'multiple' ? '如 AB' : '如 A'} maxLength={5} onChange={(event) => updateItem(index, { answer: event.target.value.toUpperCase().replace(/[^A-E]/g, '') })} /></> : draft.type === 'fill' ? <><MetisInputNumber value={item.blankCount} min={1} max={12} addonAfter="空" onChange={(value) => updateItem(index, { blankCount: Number(value ?? 1) })} /><MetisSelect value={item.fillStyle} options={[{ value: 'lines', label: '横线' }, { value: 'tian', label: '田字格' }, { value: 'mi', label: '米字格' }, { value: 'four-line', label: '四线三格' }]} onChange={(value) => updateItem(index, { fillStyle: value as typeof item.fillStyle })} /></> : <><MetisInputNumber value={item.lineCount} min={1} max={30} addonAfter="行" onChange={(value) => updateItem(index, { lineCount: Number(value ?? 1) })} /><MetisInputNumber value={item.subquestionCount} min={0} max={12} addonAfter="个" onChange={(value) => updateItem(index, { subquestionCount: Number(value ?? 0) })} /></>}</div>)}</div></section>}
    </div>
  </MetisDialog>
}
