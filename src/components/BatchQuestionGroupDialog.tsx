import { useEffect, useState } from 'react'
import { MetisButton, MetisDialog, MetisInputNumber } from '@yuanfudao/metis-web-component'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { QuestionGroupDraft, QuestionGroupType } from '../features/answer-sheet/types'
import { createEntityId } from '../features/answer-sheet/ids'
import { QuestionGroupDialog } from './QuestionGroupDialog'

interface Props {
  open: boolean
  subject: string
  suggestedStart: number
  onClose: () => void
  onSubmit: (drafts: QuestionGroupDraft[]) => void
}
interface GroupRow { id: string; type?: QuestionGroupType; count: number; score: number; structureCount?: number; partialScore?: number; draft?: QuestionGroupDraft }
const labels: Record<QuestionGroupType, string> = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题', solution: '解答题', essay: '作文题', comprehensive: '综合题' }
const newRow = (): GroupRow => ({ id: createEntityId('group-row'), count: 10, score: 2 })
const createDraft = (row: GroupRow, start: number): QuestionGroupDraft => {
  const type = row.type!
  if (row.draft) return { ...row.draft, startNumber: start, items: row.draft.items.map((item, index) => ({ ...item, number: start + index })) }
  const blankCount = type === 'fill' ? row.structureCount ?? 1 : 1
  const questionScore = Number((row.score * blankCount).toFixed(2))
  const subquestionCount = type === 'comprehensive' ? row.structureCount ?? 2 : 0
  const optionCount = (type === 'single' || type === 'multiple' ? row.structureCount ?? 4 : 4) as 4 | 5
  return {
    title: labels[type], type, groupType: 'normal', startNumber: start, questionCount: row.count,
    totalScore: Number((row.count * questionScore).toFixed(2)), optionCount: type === 'judge' ? 2 : optionCount,
    items: Array.from({ length: row.count }, (_, index) => ({
      number: start + index, score: questionScore, blankCount,
      blankScores: type === 'fill' ? Array(blankCount).fill(row.score) : undefined,
      fillStyle: 'lines', lineCount: 1, subquestionCount,
      subquestionScores: subquestionCount ? Array.from({ length: subquestionCount }, (_, subIndex) => Number((subIndex === subquestionCount - 1 ? questionScore - Number((questionScore / subquestionCount).toFixed(2)) * (subquestionCount - 1) : questionScore / subquestionCount).toFixed(2))) : undefined,
      optionCount, answer: '', partialScore: type === 'multiple' ? row.partialScore ?? 1 : undefined,
    })),
  }
}

export function BatchQuestionGroupDialog(props: Props) {
  const [rows, setRows] = useState<GroupRow[]>([])
  const [activeField, setActiveField] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  useEffect(() => {
    if (props.open) { setRows([]); setEditingId(null) }
  }, [props.open])
  const updateRow = (id: string, patch: Partial<GroupRow>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row))
  const updateStructure = (row: GroupRow, value: number) => {
    const draft = row.draft ? structuredClone(row.draft) : undefined
    if (draft) {
      if (row.type === 'single' || row.type === 'multiple') {
        draft.optionCount = value as 4 | 5
        draft.items = draft.items.map((item) => ({ ...item, optionCount: value as 4 | 5, subquestionOptionCounts: item.subquestionCount ? Array(item.subquestionCount).fill(value) : item.subquestionOptionCounts }))
      } else {
        draft.items = draft.items.map((item) => {
          const scores = Array.from({ length: value }, (_, index) => Number((index === value - 1 ? item.score - Number((item.score / value).toFixed(2)) * (value - 1) : item.score / value).toFixed(2)))
          return row.type === 'fill'
            ? { ...item, blankCount: value, blankScores: scores, blankStyles: Array(value).fill(item.fillStyle), subquestionBlankCounts: item.subquestionCount ? Array(item.subquestionCount).fill(value) : item.subquestionBlankCounts, subquestionBlankScores: item.subquestionScores?.map((score) => Array.from({ length: value }, (_, index) => Number((index === value - 1 ? score - Number((score / value).toFixed(2)) * (value - 1) : score / value).toFixed(2)))) }
            : { ...item, subquestionCount: value, subquestionScores: scores, subquestionTypes: Array.from({ length: value }, (_, index) => item.subquestionTypes?.[index]) }
        })
      }
    }
    updateRow(row.id, { structureCount: value, draft })
  }
  const valid = rows.length > 0 && rows.every((row) => row.type && Number.isInteger(row.count) && row.count >= 1 && row.count <= 100 && Number.isFinite(row.score) && row.score >= 0)
  const totalQuestions = rows.reduce((sum, row) => sum + row.count, 0)
  const totalScore = Number(rows.reduce((sum, row) => sum + (row.draft?.totalScore ?? row.count * row.score * (row.type === 'fill' ? row.structureCount ?? 1 : 1)), 0).toFixed(2))
  const startFor = (index: number) => props.suggestedStart + rows.slice(0, index).reduce((sum, row) => sum + row.count, 0)
  const editingIndex = rows.findIndex((row) => row.id === editingId)
  const editing = rows[editingIndex]
  return <>
    <MetisDialog open={props.open && !editing} title="添加题组" width={760} onCancel={props.onClose} footer={<div className="batch-group-footer"><span>共 {rows.length} 组 · {totalQuestions} 题 · {totalScore} 分</span><MetisButton onClick={props.onClose}>取消</MetisButton><MetisButton type="primary" disabled={!valid} onClick={() => props.onSubmit(rows.map((row, index) => createDraft(row, startFor(index))))}>添加 {rows.length} 个题组</MetisButton></div>}>
      <div className="group-type-presets">{Object.entries(labels).filter(([type]) => type !== 'essay' || props.subject === '语文').map(([type, label]) => <button type="button" key={type} onClick={() => setRows((current) => [...current, { ...newRow(), type: type as QuestionGroupType, count: type === 'fill' ? 5 : type === 'solution' || type === 'essay' ? 2 : 10, score: type === 'solution' ? 5 : type === 'essay' ? 30 : 2 }])}><Plus size={14} />{label}</button>)}</div>
      <div className="group-summary-list">
        {rows.map((row, index) => <div className="group-summary-line" key={row.id}>
          <strong>{labels[row.type!]}</strong>
          <span className="group-number-range">第 {startFor(index)}–{startFor(index) + row.count - 1} 题</span>
          <div className="group-summary-values">
            {activeField === `${row.id}-count` ? <MetisInputNumber autoFocus aria-label="题量" value={row.count} min={1} max={100} precision={0} onBlur={() => setActiveField(null)} onChange={(value) => updateRow(row.id, { count: Number(value ?? 1), draft: undefined })} /> : <button type="button" onClick={() => row.draft ? setEditingId(row.id) : setActiveField(`${row.id}-count`)}>{row.count} 道</button>}
            {row.type === 'fill' && !row.draft && <>
              <span>×</span>
              {activeField === `${row.id}-blanks` ? <MetisInputNumber autoFocus aria-label="每题空数" value={row.structureCount ?? 1} min={1} max={12} precision={0} onBlur={() => setActiveField(null)} onChange={(value) => updateRow(row.id, { structureCount: Number(value ?? 1) })} /> : <button type="button" onClick={() => setActiveField(`${row.id}-blanks`)}>{row.structureCount ?? 1} 空/题</button>}
            </>}
            <span>×</span>
            {row.draft ? <button type="button" onClick={() => setEditingId(row.id)}>逐题分值</button> : activeField === `${row.id}-score` ? <MetisInputNumber autoFocus aria-label={row.type === 'fill' ? '每空分值' : '每题分值'} value={row.score} min={0} max={100} precision={2} onBlur={() => setActiveField(null)} onChange={(value) => updateRow(row.id, { score: Number(value ?? 0) })} /> : <button type="button" onClick={() => setActiveField(`${row.id}-score`)}>{row.score} {row.type === 'fill' ? '分/空' : '分'}</button>}
            <span className="group-score-equals">＝</span>
            <strong className="group-row-total">共 {Number((row.draft?.totalScore ?? row.count * row.score * (row.type === 'fill' ? row.structureCount ?? 1 : 1)).toFixed(2))} 分</strong>
            {row.type === 'multiple' && <div className="group-partial-score"><span>少选得</span>{activeField === `${row.id}-partial` ? <MetisInputNumber autoFocus aria-label="少选得分" value={row.partialScore ?? 1} min={0} max={row.score} precision={2} onBlur={() => setActiveField(null)} onChange={(value) => {
              const partialScore = Number(value ?? 0)
              const draft = row.draft ? { ...row.draft, items: row.draft.items.map((item) => ({ ...item, partialScore, subquestionPartialScores: item.subquestionCount ? Array(item.subquestionCount).fill(partialScore) : item.subquestionPartialScores })) } : undefined
              updateRow(row.id, { partialScore, draft })
            }} /> : <button type="button" onClick={() => setActiveField(`${row.id}-partial`)}>{row.partialScore ?? 1} 分</button>}</div>}

          </div>
          <div className="group-structure-setting">{(['single', 'multiple', 'comprehensive'] as const).some((type) => type === row.type) && (activeField === `${row.id}-structure` ? <MetisInputNumber autoFocus aria-label={row.type === 'fill' ? '每题空数' : row.type === 'comprehensive' ? '每题小题数' : '选项数'} min={row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4} max={row.type === 'fill' ? 12 : row.type === 'comprehensive' ? 20 : 5} precision={0} value={row.structureCount ?? (row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4)} onBlur={() => setActiveField(null)} onChange={(value) => updateStructure(row, Number(value ?? (row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4)))} /> : <button type="button" onClick={() => setActiveField(`${row.id}-structure`)}>{row.structureCount ?? (row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4)} {row.type === 'fill' ? '个空 / 题' : row.type === 'comprehensive' ? '个小题 / 题' : '个选项'}</button>)}</div>
          <div className="group-batch-actions"><MetisButton type="borderless" title="详细设置" aria-label={`第${index + 1}组详细设置`} icon={<Pencil size={15} />} onClick={() => setEditingId(row.id)} /><MetisButton type="borderless" title="删除" aria-label={`删除第${index + 1}组`} icon={<Trash2 size={15} />} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} /></div>
        </div>)}
        {!rows.length && <div className="group-preset-empty">选择上方题型，加入题组</div>}
      </div>
    </MetisDialog>
    {editing?.type && <QuestionGroupDialog open={props.open} subject={props.subject} suggestedStart={startFor(editingIndex)} type={editing.type} initialValue={createDraft(editing, startFor(editingIndex))} onClose={() => setEditingId(null)} onSubmit={(draft) => {
      updateRow(editing.id, { draft, partialScore: draft.items[0]?.partialScore, structureCount: draft.type === 'fill' ? draft.items[0]?.blankCount : draft.type === 'comprehensive' ? draft.items[0]?.subquestionCount : draft.optionCount, count: draft.questionCount, score: Number((draft.totalScore / draft.questionCount).toFixed(2)) })
      setEditingId(null)
    }} />}
  </>
}
