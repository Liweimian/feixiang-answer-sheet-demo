import { useEffect, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisInputNumber, MetisRadio, MetisSelect } from '@yuanfudao/metis-web-component'
import { Plus, Trash2 } from 'lucide-react'
import type { QuestionGroupDraft, QuestionGroupType } from '../features/answer-sheet/types'

interface QuestionGroupDialogProps {
  open: boolean
  suggestedStart: number
  type: QuestionGroupType
  subject: string
  initialValue?: QuestionGroupDraft
  onClose: () => void
  onSubmit: (draft: QuestionGroupDraft) => void
}

const typeLabels: Record<QuestionGroupType, string> = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题', solution: '解答题', essay: '作文题', comprehensive: '综合题' }
const createItems = (start: number, count: number, total: number) => Array.from({ length: count }, (_, index) => ({
  number: start + index, score: Number((total / count).toFixed(2)), blankCount: 1,
  fillStyle: 'lines' as const, lineCount: 1, subquestionCount: 0,
  optionCount: 4 as const, answer: '',
}))
const initialDraft = (startNumber: number, type: QuestionGroupType): QuestionGroupDraft => {
  const questionCount = type === 'comprehensive' ? 5 : type === 'essay' ? 2 : type === 'fill' || type === 'solution' ? 4 : 10
  const totalScore = type === 'comprehensive' ? 10 : type === 'essay' ? 6 : 20
  return { title: typeLabels[type], type, groupType: 'normal', startNumber, questionCount, totalScore, optionCount: type === 'judge' ? 2 : 4, items: createItems(startNumber, questionCount, totalScore).map((item) => type === 'comprehensive' ? { ...item, subquestionCount: 2, subquestionScores: [Number((item.score / 2).toFixed(2)), Number((item.score / 2).toFixed(2))] } : { ...item, partialScore: type === 'multiple' ? 1 : undefined }) }
}

export function QuestionGroupDialog(props: QuestionGroupDialogProps) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)
  const [draft, setDraft] = useState<QuestionGroupDraft>(() => initialDraft(props.suggestedStart, props.type))

  useEffect(() => {
    if (props.open) {
      setSelectedItemIndex(0)
      setDraft(props.initialValue ? structuredClone(props.initialValue) : initialDraft(props.suggestedStart, props.type))
    }
  }, [props.initialValue, props.open, props.suggestedStart, props.type])

  const updateBatch = (patch: Partial<QuestionGroupDraft>) => {
    const next = { ...draft, ...patch }
    next.items = createItems(next.startNumber, next.questionCount, next.totalScore).map((item, index) => {
      const current = draft.items[index]
      const merged = { ...item, ...current, number: next.startNumber + index, score: patch.totalScore === undefined ? (current?.score ?? item.score) : item.score }
      if (draft.type !== 'comprehensive' || merged.subquestionCount >= 2) return merged
      const unitScore = Number((merged.score / 2).toFixed(2))
      return { ...merged, subquestionCount: 2, subquestionScores: [unitScore, unitScore] }
    })
    if (patch.totalScore === undefined) next.totalScore = Number(next.items.reduce((sum, item) => sum + item.score, 0).toFixed(2))
    setDraft(next)
  }
  const updateItem = (index: number, patch: Partial<QuestionGroupDraft['items'][number]>) => {
    const items = draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    setDraft({ ...draft, items, totalScore: Number(items.reduce((sum, item) => sum + item.score, 0).toFixed(2)) })
  }
  const addSubquestion = (index: number) => {
    const item = draft.items[index]
    const count = item.subquestionCount + 1
    if (draft.type === 'solution' || draft.type === 'essay') {
      const defaultScore = item.subquestionDefaultScore ?? item.score
      const existingScores = item.subquestionScores ?? []
      const subquestionScores = [...existingScores, defaultScore]
      updateItem(index, { subquestionCount: count, subquestionDefaultScore: defaultScore, subquestionScores, score: Number(subquestionScores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
      return
    }
    const score = Number((item.score / count).toFixed(2))
    updateItem(index, { subquestionCount: count, subquestionScores: Array.from({ length: count }, () => score), subquestionOptionCounts: Array.from({ length: count }, (_, subIndex) => item.subquestionOptionCounts?.[subIndex] ?? item.optionCount), subquestionPartialScores: draft.type === 'multiple' ? Array.from({ length: count }, (_, subIndex) => item.subquestionPartialScores?.[subIndex] ?? item.partialScore ?? 1) : undefined })
  }
  const updateSubquestion = (index: number, subIndex: number, patch: { score?: number; optionCount?: 4 | 5; partialScore?: number }) => {
    const item = draft.items[index]
    const scores = item.subquestionScores ?? Array.from({ length: item.subquestionCount }, () => Number((item.score / item.subquestionCount).toFixed(2)))
    const optionCounts = item.subquestionOptionCounts ?? Array.from({ length: item.subquestionCount }, () => item.optionCount)
    const partialScores = item.subquestionPartialScores ?? Array.from({ length: item.subquestionCount }, () => item.partialScore ?? 1)
    if (patch.score !== undefined) scores[subIndex] = patch.score
    if (patch.optionCount !== undefined) optionCounts[subIndex] = patch.optionCount
    if (patch.partialScore !== undefined) partialScores[subIndex] = patch.partialScore
    updateItem(index, { subquestionScores: scores, subquestionOptionCounts: optionCounts, subquestionPartialScores: partialScores, score: Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const removeSubquestion = (index: number, subIndex: number) => {
    const item = draft.items[index]
    const scores = (item.subquestionScores ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    const optionCounts = (item.subquestionOptionCounts ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    const partialScores = (item.subquestionPartialScores ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    updateItem(index, { subquestionCount: item.subquestionCount - 1, subquestionScores: scores, subquestionOptionCounts: optionCounts, subquestionPartialScores: partialScores, score: scores.length ? Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)) : item.score })
  }
  const addBlank = (index: number) => {
    const item = draft.items[index]
    const count = item.blankCount + 1
    const score = Number((item.score / count).toFixed(2))
    updateItem(index, { blankCount: count, blankScores: Array.from({ length: count }, (_, blankIndex) => item.blankScores?.[blankIndex] ?? score), blankStyles: Array.from({ length: count }, (_, blankIndex) => item.blankStyles?.[blankIndex] ?? item.fillStyle) })
  }
  const updateBlankCount = (index: number, rawCount: string) => {
    const item = draft.items[index]
    const count = Math.min(12, Math.max(1, Math.floor(Number(rawCount) || 1)))
    const currentScores = item.blankScores ?? Array.from({ length: item.blankCount }, () => Number((item.score / Math.max(1, item.blankCount)).toFixed(2)))
    const fallbackScore = currentScores[0] ?? Number((item.score / Math.max(1, item.blankCount)).toFixed(2))
    const blankScores = Array.from({ length: count }, (_, blankIndex) => currentScores[blankIndex] ?? fallbackScore)
    const blankStyles = Array.from({ length: count }, (_, blankIndex) => item.blankStyles?.[blankIndex] ?? item.fillStyle)
    updateItem(index, { blankCount: count, blankScores, blankStyles, score: Number(blankScores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const updateBlank = (index: number, blankIndex: number, patch: { score?: number; style?: QuestionGroupDraft['items'][number]['fillStyle'] }) => {
    const item = draft.items[index]
    const scores = item.blankScores ?? Array.from({ length: item.blankCount }, () => Number((item.score / item.blankCount).toFixed(2)))
    const styles = item.blankStyles ?? Array.from({ length: item.blankCount }, () => item.fillStyle)
    if (patch.score !== undefined) scores[blankIndex] = patch.score
    if (patch.style !== undefined) styles[blankIndex] = patch.style
    updateItem(index, { blankScores: scores, blankStyles: styles, score: Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const removeBlank = (index: number, blankIndex: number) => {
    const item = draft.items[index]
    if (item.blankCount <= 1) return
    const scores = (item.blankScores ?? Array.from({ length: item.blankCount }, () => Number((item.score / item.blankCount).toFixed(2)))).filter((_, valueIndex) => valueIndex !== blankIndex)
    const styles = (item.blankStyles ?? Array.from({ length: item.blankCount }, () => item.fillStyle)).filter((_, valueIndex) => valueIndex !== blankIndex)
    updateItem(index, { blankCount: item.blankCount - 1, blankScores: scores, blankStyles: styles, score: Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const addFillSubquestion = (index: number) => {
    const item = draft.items[index]
    const existingCount = item.subquestionCount
    const fallbackScore = item.blankScores?.[0] ?? Number((item.score / Math.max(1, item.blankCount)).toFixed(2))
    const counts = existingCount
      ? [...(item.subquestionBlankCounts ?? Array.from({ length: existingCount }, () => 1)), 1]
      : [item.blankCount]
    const scores = existingCount
      ? [...(item.subquestionBlankScores ?? Array.from({ length: existingCount }, () => [fallbackScore])), [fallbackScore]]
      : [[...(item.blankScores ?? Array.from({ length: item.blankCount }, () => fallbackScore))]]
    const styles = existingCount
      ? [...(item.subquestionFillStyles ?? Array.from({ length: existingCount }, () => item.fillStyle)), item.fillStyle]
      : [item.fillStyle]
    const totals = scores.map((blankScores) => Number(blankScores.reduce((sum, value) => sum + value, 0).toFixed(2)))
    updateItem(index, { subquestionCount: existingCount + 1, subquestionBlankCounts: counts, subquestionBlankScores: scores, subquestionFillStyles: styles, subquestionScores: totals, score: Number(totals.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const updateFillSubquestionBlankCount = (index: number, subIndex: number, rawCount: string) => {
    const item = draft.items[index]
    const count = Math.min(12, Math.max(1, Math.floor(Number(rawCount) || 1)))
    const counts = [...(item.subquestionBlankCounts ?? Array.from({ length: item.subquestionCount }, () => 1))]
    const allScores = (item.subquestionBlankScores ?? Array.from({ length: item.subquestionCount }, () => [0])).map((scores) => [...scores])
    const currentScores = allScores[subIndex] ?? [0]
    const fallbackScore = currentScores[0] ?? 0
    counts[subIndex] = count
    allScores[subIndex] = Array.from({ length: count }, (_, blankIndex) => currentScores[blankIndex] ?? fallbackScore)
    const totals = allScores.map((scores) => Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)))
    updateItem(index, { subquestionBlankCounts: counts, subquestionBlankScores: allScores, subquestionScores: totals, score: Number(totals.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const updateFillSubquestionScore = (index: number, subIndex: number, blankIndex: number, rawScore: string) => {
    const item = draft.items[index]
    const allScores = (item.subquestionBlankScores ?? Array.from({ length: item.subquestionCount }, () => [0])).map((scores) => [...scores])
    allScores[subIndex][blankIndex] = Math.max(0, Number(rawScore) || 0)
    const totals = allScores.map((scores) => Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)))
    updateItem(index, { subquestionBlankScores: allScores, subquestionScores: totals, score: Number(totals.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const removeFillSubquestionBlank = (index: number, subIndex: number, blankIndex: number) => {
    const item = draft.items[index]
    const counts = [...(item.subquestionBlankCounts ?? Array.from({ length: item.subquestionCount }, () => 1))]
    const allScores = (item.subquestionBlankScores ?? Array.from({ length: item.subquestionCount }, () => [0])).map((scores) => [...scores])
    if ((allScores[subIndex]?.length ?? 0) <= 1) return
    allScores[subIndex] = allScores[subIndex].filter((_, valueIndex) => valueIndex !== blankIndex)
    counts[subIndex] = allScores[subIndex].length
    const totals = allScores.map((scores) => Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)))
    updateItem(index, { subquestionBlankCounts: counts, subquestionBlankScores: allScores, subquestionScores: totals, score: Number(totals.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const removeFillSubquestion = (index: number, subIndex: number) => {
    const item = draft.items[index]
    const counts = (item.subquestionBlankCounts ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    const scores = (item.subquestionBlankScores ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    const styles = (item.subquestionFillStyles ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    if (!counts.length) {
      const fallbackScores = item.subquestionBlankScores?.[subIndex] ?? item.blankScores ?? [item.score]
      updateItem(index, { subquestionCount: 0, subquestionBlankCounts: [], subquestionBlankScores: [], subquestionFillStyles: [], subquestionScores: [], blankCount: fallbackScores.length, blankScores: fallbackScores, fillStyle: item.subquestionFillStyles?.[subIndex] ?? item.fillStyle, score: Number(fallbackScores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
      return
    }
    const totals = scores.map((blankScores) => Number(blankScores.reduce((sum, value) => sum + value, 0).toFixed(2)))
    updateItem(index, { subquestionCount: counts.length, subquestionBlankCounts: counts, subquestionBlankScores: scores, subquestionFillStyles: styles, subquestionScores: totals, score: Number(totals.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const updateComprehensiveSubquestionCount = (index: number, rawCount: string) => {
    const item = draft.items[index]
    const count = Math.min(20, Math.max(2, Math.floor(Number(rawCount) || 2)))
    const currentScores = item.subquestionScores ?? []
    const fallbackScore = currentScores[0] ?? Number((item.score / Math.max(2, item.subquestionCount)).toFixed(2))
    const scores = Array.from({ length: count }, (_, subIndex) => currentScores[subIndex] ?? fallbackScore)
    const types = Array.from({ length: count }, (_, subIndex) => item.subquestionTypes?.[subIndex])
    updateItem(index, { subquestionCount: count, subquestionScores: scores, subquestionTypes: types, score: Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const updateComprehensiveSubquestionType = (index: number, subIndex: number, type: Exclude<QuestionGroupType, 'comprehensive'>) => {
    const item = draft.items[index]
    const types = [...(item.subquestionTypes ?? Array.from({ length: item.subquestionCount }, () => undefined))]
    types[subIndex] = type
    updateItem(index, { subquestionTypes: types })
  }
  const removeComprehensiveSubquestion = (index: number, subIndex: number) => {
    const item = draft.items[index]
    if (item.subquestionCount <= 2) return
    const scores = (item.subquestionScores ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    const types = (item.subquestionTypes ?? []).filter((_, valueIndex) => valueIndex !== subIndex)
    updateItem(index, { subquestionCount: item.subquestionCount - 1, subquestionScores: scores, subquestionTypes: types, score: Number(scores.reduce((sum, value) => sum + value, 0).toFixed(2)) })
  }
  const removeItem = (index: number) => {
    if (draft.items.length <= 1) return
    const items = draft.items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, number: draft.startNumber + itemIndex }))
    setDraft({ ...draft, items, questionCount: items.length, totalScore: Number(items.reduce((sum, item) => sum + item.score, 0).toFixed(2)) })
  }
  const valid = draft.title.trim() && draft.startNumber > 0 && draft.questionCount > 0 && new Set(draft.items.map((item) => item.number)).size === draft.items.length && draft.items.every((item) => item.score >= 0) && (draft.type !== 'comprehensive' || draft.items.every((item) => item.subquestionTypes?.length === item.subquestionCount && item.subquestionTypes.every(Boolean)))
  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
    <MetisButton type="primary" disabled={!valid} onClick={() => props.onSubmit({ ...draft, title: draft.title.trim() })}>{props.initialValue ? '保存修改' : '添加题组'}</MetisButton>
  </div>

  const objective = draft.type === 'single' || draft.type === 'multiple' || draft.type === 'judge'
  const specialized = objective || draft.type === 'fill' || draft.type === 'solution' || draft.type === 'essay' || draft.type === 'comprehensive'
  return <MetisDialog open={props.open} title={`${props.initialValue ? '编辑' : '添加'}${typeLabels[draft.type]}`} width={specialized ? 920 : 560} footer={footer} onCancel={props.onClose}>
    <div className={`question-group-builder question-group-preview-builder question-group-focus-builder ${specialized ? 'specialized' : ''}`}>
      <nav className="question-focus-directory" aria-label="题目目录">
        <header><strong>题目目录</strong><span>{draft.questionCount} 道 · {draft.totalScore} 分</span></header>
        {draft.items.map((item, index) => <button type="button" key={item.number} className={index === Math.min(selectedItemIndex, draft.items.length - 1) ? 'selected' : ''} aria-current={index === Math.min(selectedItemIndex, draft.items.length - 1) ? 'true' : undefined} onClick={() => setSelectedItemIndex(index)}><b>第 {item.number} 题</b><span>{item.score} 分</span>{item.subquestionCount > 0 && <small>{item.subquestionCount} 小题</small>}</button>)}
      </nav>
      <div className="question-focus-main">
      <details className="question-focus-settings"><summary>题组设置<span>{draft.title} · 共 {draft.questionCount} 道题，共 {draft.totalScore} 分</span></summary>
      <aside className="question-group-form">
        <label className="question-group-wide question-group-type-field"><span><i>*</i>题组类型</span><MetisRadio.Group value={draft.groupType} options={[{ value: 'normal', label: '普通题' }, { value: 'bonus', label: '附加题' }]} onChange={(event) => setDraft({ ...draft, groupType: event.target.value as 'normal' | 'bonus' })} /></label>
        <label className="question-group-wide"><span>题组名称</span><MetisInput value={draft.title} maxLength={24} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        {objective ? <div className={`objective-batch-fields ${draft.type === 'multiple' ? 'is-multiple' : ''}`}>
          <label><span>起始题号</span><MetisInput key={`start-${draft.startNumber}`} defaultValue={String(draft.startNumber)} inputMode="numeric" onBlur={(event) => updateBatch({ startNumber: Math.min(999, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>题量</span><MetisInput key={`count-${draft.questionCount}`} defaultValue={String(draft.questionCount)} inputMode="numeric" onBlur={(event) => updateBatch({ questionCount: Math.min(100, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          {draft.type !== 'judge' && <label><span>选项数</span><MetisInput key={`batch-option-${draft.optionCount}`} defaultValue={String(draft.optionCount)} inputMode="numeric" onBlur={(event) => { const optionCount = Math.min(5, Math.max(4, Number(event.target.value) || 4)) as 4 | 5; setDraft({ ...draft, optionCount, items: draft.items.map((item) => ({ ...item, optionCount })) }) }} /></label>}
          <label><span>单题分值</span><MetisInput key={`batch-score-${draft.totalScore}`} defaultValue={String(draft.questionCount ? draft.totalScore / draft.questionCount : 0)} inputMode="decimal" onBlur={(event) => updateBatch({ totalScore: Math.max(0, Number(event.target.value) || 0) * draft.questionCount })} /></label>
          {draft.type === 'multiple' && <label><span>少选得分</span><MetisInput key={`batch-partial-${draft.items[0]?.partialScore ?? 0}`} defaultValue={String(draft.items[0]?.partialScore ?? 0)} inputMode="decimal" onBlur={(event) => { const value = Math.max(0, Number(event.target.value) || 0); setDraft({ ...draft, items: draft.items.map((item) => ({ ...item, partialScore: value, subquestionPartialScores: item.subquestionCount ? Array.from({ length: item.subquestionCount }, () => value) : item.subquestionPartialScores })) }) }} /></label>}
        </div> : draft.type === 'fill' ? <div className="fill-batch-fields">
          <label><span>起始题号</span><MetisInput key={`fill-start-${draft.startNumber}`} defaultValue={String(draft.startNumber)} inputMode="numeric" onBlur={(event) => updateBatch({ startNumber: Math.min(999, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>题量</span><MetisInput key={`fill-count-total-${draft.questionCount}`} defaultValue={String(draft.questionCount)} inputMode="numeric" onBlur={(event) => updateBatch({ questionCount: Math.min(100, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>每题空数</span><MetisInput key={`fill-count-${draft.items[0]?.blankCount ?? 1}`} defaultValue={String(draft.items[0]?.blankCount ?? 1)} inputMode="numeric" onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={(event) => { const count = Math.min(12, Math.max(1, Math.floor(Number(event.target.value) || 1))); setDraft({ ...draft, items: draft.items.map((item) => ({ ...item, blankCount: count, blankScores: Array.from({ length: count }, (_, index) => item.blankScores?.[index] ?? Number((item.score / count).toFixed(2))), blankStyles: Array.from({ length: count }, (_, index) => item.blankStyles?.[index] ?? item.fillStyle) })) }) }} /></label>
          <label><span>每空分值</span><MetisInput key={`fill-unit-score-${draft.items[0]?.blankScores?.[0] ?? 0}`} defaultValue={String(draft.items[0]?.blankScores?.[0] ?? Number(((draft.items[0]?.score ?? 0) / Math.max(1, draft.items[0]?.blankCount ?? 1)).toFixed(2)))} inputMode="decimal" onBlur={(event) => { const score = Math.max(0, Number(event.target.value) || 0); const items = draft.items.map((item) => ({ ...item, score: Number((score * item.blankCount).toFixed(2)), blankScores: Array.from({ length: item.blankCount }, () => score) })); setDraft({ ...draft, items, totalScore: Number(items.reduce((sum, item) => sum + item.score, 0).toFixed(2)) }) }} /></label>
        </div> : draft.type === 'solution' || draft.type === 'essay' ? <div className="solution-batch-fields">
          <label><span>起始题号</span><MetisInput key={`solution-start-${draft.startNumber}`} defaultValue={String(draft.startNumber)} inputMode="numeric" onBlur={(event) => updateBatch({ startNumber: Math.min(999, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>题量</span><MetisInput key={`solution-count-${draft.questionCount}`} defaultValue={String(draft.questionCount)} inputMode="numeric" onBlur={(event) => updateBatch({ questionCount: Math.min(100, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>分值</span><MetisInput key={`solution-score-${draft.totalScore}`} defaultValue={String(draft.questionCount ? Number((draft.totalScore / draft.questionCount).toFixed(2)) : 0)} inputMode="decimal" onBlur={(event) => updateBatch({ totalScore: Math.max(0, Number(event.target.value) || 0) * draft.questionCount })} /></label>
        </div> : draft.type === 'comprehensive' ? <div className="comprehensive-batch-fields">
          <label><span>起始题号</span><MetisInput key={`comprehensive-start-${draft.startNumber}`} defaultValue={String(draft.startNumber)} inputMode="numeric" onBlur={(event) => updateBatch({ startNumber: Math.min(999, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>题量</span><MetisInput key={`comprehensive-count-total-${draft.questionCount}`} defaultValue={String(draft.questionCount)} inputMode="numeric" onBlur={(event) => updateBatch({ questionCount: Math.min(100, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
          <label><span>分值</span><MetisInput key={`comprehensive-score-${draft.items[0]?.subquestionScores?.[0] ?? 0}`} defaultValue={String(draft.items[0]?.subquestionScores?.[0] ?? 0)} inputMode="decimal" onBlur={(event) => { const score = Math.max(0, Number(event.target.value) || 0); const items = draft.items.map((item) => ({ ...item, subquestionScores: Array.from({ length: item.subquestionCount }, () => score), score: Number((score * item.subquestionCount).toFixed(2)) })); setDraft({ ...draft, items, totalScore: Number(items.reduce((sum, item) => sum + item.score, 0).toFixed(2)) }); }} /></label>
        </div> : <>
          <label><span>起始题号</span><MetisInputNumber value={draft.startNumber} min={1} max={999} precision={0} onChange={(value) => updateBatch({ startNumber: Number(value ?? 1) })} /></label>
          <label><span>题量</span><MetisInputNumber value={draft.questionCount} min={1} max={100} precision={0} addonAfter="题" onChange={(value) => updateBatch({ questionCount: Number(value ?? 1) })} /></label>
          <label><span>每题分值</span><MetisInputNumber value={draft.questionCount ? draft.totalScore / draft.questionCount : 0} min={0} max={300} addonAfter="分" onChange={(value) => updateBatch({ totalScore: Number(value ?? 0) * draft.questionCount })} /></label>
        </>}
        {!specialized && <div className="question-group-summary">将生成 <strong>{draft.startNumber}–{draft.startNumber + draft.questionCount - 1}</strong> 题，共 <strong>{draft.totalScore} 分</strong>。</div>}
      </aside></details>
      <div className="question-group-item-navigation"><strong>第 {draft.items[Math.min(selectedItemIndex, draft.items.length - 1)]?.number} 题设置</strong></div>
      {objective && <section className="question-item-editor">
        <header><strong>{typeLabels[draft.type]}：{draft.questionCount}题，共{draft.totalScore}分</strong><span>可逐题增删</span></header>
        <div className={`question-item-table objective-items editable-rows ${draft.type === 'multiple' ? 'is-multiple' : ''} ${draft.type === 'judge' ? 'is-judge' : ''}`}>
          <div className="question-item-head"><span>题号</span>{draft.type !== 'judge' && <span>选项数</span>}<span>分值</span>{draft.type === 'multiple' && <span>少选得分</span>}<span>操作</span></div>
          {draft.items.map((item, index) => index === Math.min(selectedItemIndex, draft.items.length - 1) && <div className={`objective-question-group ${item.subquestionCount ? 'has-subquestions' : ''}`} key={`${item.number}-${index}`}>
            <div className="question-item-row">
              <b>{item.number}</b>
              {item.subquestionCount
                ? <span className="objective-total-score">{item.score}分</span>
                : <>{draft.type !== 'judge' && <MetisInput key={`option-${item.number}-${item.optionCount}`} defaultValue={String(item.optionCount)} inputMode="numeric" onBlur={(event) => updateItem(index, { optionCount: Math.min(5, Math.max(4, Number(event.target.value) || 4)) as 4 | 5 })} />}<MetisInput key={`score-${item.number}-${item.score}`} defaultValue={String(item.score)} inputMode="decimal" onBlur={(event) => updateItem(index, { score: Math.max(0, Number(event.target.value) || 0) })} />{draft.type === 'multiple' && <MetisInput key={`partial-${item.number}-${item.partialScore ?? 0}`} defaultValue={String(item.partialScore ?? 0)} inputMode="decimal" onBlur={(event) => updateItem(index, { partialScore: Math.max(0, Number(event.target.value) || 0) })} />}</>}
              <div className="question-item-actions"><MetisButton type="borderless" icon={<Plus size={13} />} onClick={() => addSubquestion(index)}>添加小题</MetisButton><MetisButton type="borderless" icon={<Trash2 size={13} />} disabled={draft.items.length <= 1} onClick={() => removeItem(index)}>删除</MetisButton></div>
            </div>
            {item.subquestionCount > 0 && <div className="objective-subquestion-list">{Array.from({ length: item.subquestionCount }, (_, subIndex) => <div className="objective-subquestion-row" key={subIndex}>
              <b>（{subIndex + 1}）</b>
              {draft.type !== 'judge' && <MetisInput key={`sub-option-${item.number}-${subIndex}-${item.subquestionOptionCounts?.[subIndex] ?? item.optionCount}`} defaultValue={String(item.subquestionOptionCounts?.[subIndex] ?? item.optionCount)} inputMode="numeric" onBlur={(event) => updateSubquestion(index, subIndex, { optionCount: Math.min(5, Math.max(4, Number(event.target.value) || 4)) as 4 | 5 })} />}
              <MetisInput key={`sub-score-${item.number}-${subIndex}-${item.subquestionScores?.[subIndex] ?? item.score}`} defaultValue={String(item.subquestionScores?.[subIndex] ?? Number((item.score / item.subquestionCount).toFixed(2)))} inputMode="decimal" onBlur={(event) => updateSubquestion(index, subIndex, { score: Math.max(0, Number(event.target.value) || 0) })} />
              {draft.type === 'multiple' && <MetisInput key={`sub-partial-${item.number}-${subIndex}-${item.subquestionPartialScores?.[subIndex] ?? item.partialScore ?? 0}`} defaultValue={String(item.subquestionPartialScores?.[subIndex] ?? item.partialScore ?? 0)} inputMode="decimal" onBlur={(event) => updateSubquestion(index, subIndex, { partialScore: Math.max(0, Number(event.target.value) || 0) })} />}
              <MetisButton type="borderless" icon={<Trash2 size={13} />} onClick={() => removeSubquestion(index, subIndex)}>删除</MetisButton>
            </div>)}</div>}
          </div>)}
        </div>
      </section>}
      {draft.type === 'fill' && <section className="question-item-editor">
        <header><strong>填空题：{draft.questionCount}题，共{draft.totalScore}分</strong><span>可逐空设置</span></header>
        <div className="question-item-table fill-items editable-rows">
          <div className="question-item-head"><span>题号</span><span>空数</span><span>分值</span><span>操作</span></div>
          {draft.items.map((item, index) => index === Math.min(selectedItemIndex, draft.items.length - 1) && <div className={`fill-question-group ${item.subquestionCount ? 'has-subquestions' : item.blankCount > 1 ? 'has-blanks' : ''}`} key={item.number}>
            <div className="question-item-row">
              <b>{item.number}</b>
              {item.subquestionCount > 0
                ? <><span /><span className="fill-total-score">{item.score > 0 ? item.score : '—'}</span></>
                : <><MetisInput className="fill-count-input" key={`fill-count-${item.number}-${item.blankCount}`} defaultValue={String(item.blankCount)} inputMode="numeric" onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={(event) => updateBlankCount(index, event.target.value)} />{item.blankCount > 1 ? <span>{item.score > 0 ? item.score : '—'}</span> : <MetisInput key={`fill-score-${item.number}-${item.score}`} defaultValue={String(item.score)} inputMode="decimal" onBlur={(event) => updateItem(index, { score: Math.max(0, Number(event.target.value) || 0), blankScores: [Math.max(0, Number(event.target.value) || 0)] })} />}</>}
              <div className="question-item-actions"><MetisButton type="borderless" icon={<Plus size={13} />} onClick={() => addFillSubquestion(index)}>添加小题</MetisButton><MetisButton type="borderless" icon={<Trash2 size={13} />} disabled={draft.items.length <= 1} onClick={() => removeItem(index)}>删除</MetisButton></div>
            </div>
            {!item.subquestionCount && item.blankCount > 1 && <div className="fill-blank-list">{Array.from({ length: item.blankCount }, (_, blankIndex) => <div className="fill-blank-row fill-parent-blank-row" key={blankIndex}><b>空{blankIndex + 1}</b><MetisInput key={`blank-score-${item.number}-${blankIndex}-${item.blankScores?.[blankIndex] ?? 0}`} defaultValue={String(item.blankScores?.[blankIndex] ?? Number((item.score / item.blankCount).toFixed(2)))} inputMode="decimal" onBlur={(event) => updateBlank(index, blankIndex, { score: Math.max(0, Number(event.target.value) || 0) })} /><span /><MetisButton type="borderless" icon={<Trash2 size={13} />} onClick={() => removeBlank(index, blankIndex)}>删除</MetisButton></div>)}</div>}
            {item.subquestionCount > 0 && <div className="fill-subquestion-list">{Array.from({ length: item.subquestionCount }, (_, subIndex) => {
              const blankCount = item.subquestionBlankCounts?.[subIndex] ?? 1
              const blankScores = item.subquestionBlankScores?.[subIndex] ?? [item.subquestionScores?.[subIndex] ?? 0]
              return <div className={`fill-subquestion-group ${blankCount > 1 ? 'has-multiple-blanks' : ''}`} key={subIndex}>
                <div className="fill-subquestion-row"><b>（{subIndex + 1}）</b><MetisInput key={`sub-blank-count-${item.number}-${subIndex}-${blankCount}`} defaultValue={String(blankCount)} inputMode="numeric" onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={(event) => updateFillSubquestionBlankCount(index, subIndex, event.target.value)} />{blankCount === 1 ? <MetisInput key={`sub-blank-score-${item.number}-${subIndex}-${blankScores[0]}`} defaultValue={String(blankScores[0] ?? 0)} inputMode="decimal" onBlur={(event) => updateFillSubquestionScore(index, subIndex, 0, event.target.value)} /> : <span>{blankScores.some((value) => value > 0) ? Number(blankScores.reduce((sum, value) => sum + value, 0).toFixed(2)) : '—'}</span>}<MetisButton type="borderless" icon={<Trash2 size={13} />} onClick={() => removeFillSubquestion(index, subIndex)}>删除</MetisButton></div>
                {blankCount > 1 && <div className="fill-subquestion-blank-list">{Array.from({ length: blankCount }, (_, blankIndex) => <div className="fill-subquestion-blank-row" key={blankIndex}><b>空{blankIndex + 1}</b><MetisInput key={`nested-blank-score-${item.number}-${subIndex}-${blankIndex}-${blankScores[blankIndex] ?? 0}`} defaultValue={String(blankScores[blankIndex] ?? 0)} inputMode="decimal" onBlur={(event) => updateFillSubquestionScore(index, subIndex, blankIndex, event.target.value)} /><MetisButton type="borderless" icon={<Trash2 size={13} />} onClick={() => removeFillSubquestionBlank(index, subIndex, blankIndex)}>删除</MetisButton></div>)}</div>}
              </div>
            })}</div>}
          </div>)}
        </div>
      </section>}
      {(draft.type === 'solution' || draft.type === 'essay') && <section className="question-item-editor">
        <header><strong>{typeLabels[draft.type]}：{draft.questionCount}题，共{draft.totalScore}分</strong><span>可逐题增删</span></header>
        <div className="question-item-table solution-items editable-rows">
          <div className="question-item-head"><span>题号</span><span>分值</span><span>操作</span></div>
          {draft.items.map((item, index) => index === Math.min(selectedItemIndex, draft.items.length - 1) && <div className={`solution-question-group ${item.subquestionCount ? 'has-subquestions' : ''}`} key={item.number}>
            <div className="question-item-row"><b>{item.number}</b>{item.subquestionCount > 0 ? <span>{item.score > 0 ? item.score : '—'}</span> : <MetisInput key={`solution-item-score-${item.number}-${item.score}`} defaultValue={String(item.score)} inputMode="decimal" onBlur={(event) => updateItem(index, { score: Math.max(0, Number(event.target.value) || 0) })} />}<div className="question-item-actions"><MetisButton type="borderless" icon={<Plus size={13} />} onClick={() => addSubquestion(index)}>添加小题</MetisButton><MetisButton type="borderless" icon={<Trash2 size={13} />} disabled={draft.items.length <= 1} onClick={() => removeItem(index)}>删除</MetisButton></div></div>
            {item.subquestionCount > 0 && <div className="solution-subquestion-list">{Array.from({ length: item.subquestionCount }, (_, subIndex) => <div className="solution-subquestion-row" key={subIndex}><b>（{subIndex + 1}）</b><MetisInput key={`solution-sub-score-${item.number}-${subIndex}-${item.subquestionScores?.[subIndex] ?? 0}`} defaultValue={String(item.subquestionScores?.[subIndex] ?? 0)} inputMode="decimal" onBlur={(event) => updateSubquestion(index, subIndex, { score: Math.max(0, Number(event.target.value) || 0) })} /><MetisButton type="borderless" icon={<Trash2 size={13} />} onClick={() => removeSubquestion(index, subIndex)}>删除</MetisButton></div>)}</div>}
          </div>)}
        </div>
      </section>}
      {draft.type === 'comprehensive' && <section className="question-item-editor">
        <header><strong>综合题：{draft.questionCount}题，共{draft.totalScore}分</strong><span>每题至少 2 个小题</span></header>
        <div className="question-item-table comprehensive-items editable-rows">
          <div className="question-item-head"><span>题号</span><span>小题数</span><span /><span>分值</span><span>操作</span></div>
          {draft.items.map((item, index) => index === Math.min(selectedItemIndex, draft.items.length - 1) && <div className="comprehensive-question-group" key={item.number}>
            <div className="question-item-row"><b>{item.number}</b><MetisInput key={`comprehensive-item-count-${item.number}-${item.subquestionCount}`} defaultValue={String(item.subquestionCount)} inputMode="numeric" onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={(event) => updateComprehensiveSubquestionCount(index, event.target.value)} /><span /><span>{item.score > 0 ? item.score : '—'}</span><MetisButton type="borderless" icon={<Trash2 size={13} />} disabled={draft.items.length <= 1} onClick={() => removeItem(index)}>删除</MetisButton></div>
            <div className="comprehensive-subquestion-list">{Array.from({ length: item.subquestionCount }, (_, subIndex) => <div className="comprehensive-subquestion-row" key={subIndex}><b>（{subIndex + 1}）</b><MetisSelect value={item.subquestionTypes?.[subIndex]} placeholder="题型" options={[{ value: 'single', label: '单选题' }, { value: 'multiple', label: '多选题' }, { value: 'judge', label: '判断题' }, { value: 'fill', label: '填空题' }, { value: 'solution', label: '解答题' }, ...(props.subject === '语文' || item.subquestionTypes?.[subIndex] === 'essay' ? [{ value: 'essay', label: '作文题' }] : [])]} onChange={(value) => updateComprehensiveSubquestionType(index, subIndex, value as Exclude<QuestionGroupType, 'comprehensive'>)} /><MetisInput key={`comprehensive-sub-score-${item.number}-${subIndex}-${item.subquestionScores?.[subIndex] ?? 0}`} defaultValue={String(item.subquestionScores?.[subIndex] ?? 0)} inputMode="decimal" onBlur={(event) => updateSubquestion(index, subIndex, { score: Math.max(0, Number(event.target.value) || 0) })} /><MetisButton type="borderless" icon={<Trash2 size={13} />} disabled={item.subquestionCount <= 2} onClick={() => removeComprehensiveSubquestion(index, subIndex)}>删除</MetisButton></div>)}</div>
          </div>)}
        </div>
      </section>}
      <section className="question-focus-preview" aria-label="当前题预览">
          {draft.items.filter((_, index) => index === Math.min(selectedItemIndex, draft.items.length - 1)).map((item) => <button type="button" key={item.number} className={`question-preview-item selected`}>
            <span className="question-preview-item-head"><b>{item.number}.</b><span>{item.score} 分</span></span>
            {item.subquestionCount > 0 ? Array.from({ length: item.subquestionCount }, (_, subIndex) => <span className="question-preview-sub" key={subIndex}>（{subIndex + 1}）{objective ? Array.from({ length: draft.type === 'judge' ? 2 : item.subquestionOptionCounts?.[subIndex] ?? item.optionCount }, (_, option) => `[${draft.type === 'judge' ? ['T', 'F'][option] : String.fromCharCode(65 + option)}]`).join('　') : draft.type === 'fill' ? Array.from({ length: item.subquestionBlankCounts?.[subIndex] ?? 1 }, () => '________').join('　') : '________________'}<small>{item.subquestionScores?.[subIndex] ?? 0} 分</small></span>) : objective ? <span className="question-preview-options">{Array.from({ length: draft.type === 'judge' ? 2 : item.optionCount }, (_, option) => <span key={option}>[{draft.type === 'judge' ? ['T', 'F'][option] : String.fromCharCode(65 + option)}]</span>)}</span> : <span className="question-preview-lines">{draft.type === 'fill' ? Array.from({ length: item.blankCount }, () => '________').join('　') : '________________________________________________'}</span>}
          </button>)}
      </section>
      </div>
    </div>
  </MetisDialog>
}
