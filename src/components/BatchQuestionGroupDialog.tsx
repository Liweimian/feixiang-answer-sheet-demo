import { useEffect, useState, type CSSProperties } from 'react'
import { MetisButton, MetisDialog, MetisInputNumber, MetisMessage } from '@yuanfudao/metis-web-component'
import { ChevronRight, ChevronsDown, ChevronsUp, ListChecks, Plus, Trash2 } from 'lucide-react'
import type { QuestionGroupDraft, QuestionGroupType } from '../features/answer-sheet/types'
import { createEntityId } from '../features/answer-sheet/ids'
import { QuestionStructurePanel } from './QuestionStructurePanel'
import {
  MAX_CHOICE_OPTIONS,
  type GroupQuestionSelection,
  type QuestionItemPatch,
  addGroupQuestionSubparts,
  appendGroupQuestion,
  applyQuestionBatch,
  deleteGroupQuestionSelection,
  setGroupSubquestionType,
  updateQuestionItem,
} from '../features/answer-sheet/directQuestionEdit'

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
  if (row.draft) {
    const { draft } = row
    if (draft.startNumber === start && draft.items.every((item, index) => item.number === start + index)) return draft
    return { ...draft, startNumber: start, items: draft.items.map((item, index) => ({ ...item, number: start + index })) }
  }
  const blankCount = type === 'fill' ? row.structureCount ?? 1 : 1
  const questionScore = Number((row.score * blankCount).toFixed(2))
  const subquestionCount = type === 'comprehensive' ? row.structureCount ?? 2 : 0
  const optionCount = (type === 'single' || type === 'multiple' ? row.structureCount ?? 4 : 4)
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

const batchFields = {
  score: { label: '统一分值', min: 0, max: 300, step: 0.01 },
  optionCount: { label: '统一选项数', min: 4, max: MAX_CHOICE_OPTIONS, step: 1 },
  partialScore: { label: '统一少选得分', min: 0, max: 300, step: 0.01 },
  blankCount: { label: '统一空数', min: 1, max: 20, step: 1 },
  blankScore: { label: '统一每空分值', min: 0, max: 300, step: 0.01 },
  add: { label: '每题添加小题', min: 1, max: 20, step: 1 },
} satisfies Record<keyof QuestionItemPatch | 'add', { label: string; min: number; max: number; step: number }>

type BatchAction = keyof typeof batchFields | 'type' | 'delete'
type PartType = Exclude<QuestionGroupType, 'comprehensive'>

export function BatchQuestionGroupDialog(props: Props) {
  const [rows, setRows] = useState<GroupRow[]>([])
  const [activeField, setActiveField] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selection, setSelection] = useState<Record<string, GroupQuestionSelection[]>>({})
  const [batchAction, setBatchAction] = useState<BatchAction>()
  const [batchValue, setBatchValue] = useState<string>('')
  const [expandAllClicked, setExpandAllClicked] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  useEffect(() => {
    if (props.open) { setRows([]); setBatchMode(false); setSelection({}); setBatchAction(undefined); setExpandAllClicked(false); setExpandedIds([]); setActiveField(null) }
  }, [props.open])
  const updateRow = (id: string, patch: Partial<GroupRow>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row))
  const updateStructure = (row: GroupRow, value: number) => {
    const draft = row.draft ? structuredClone(row.draft) : undefined
    if (draft) {
      if (row.type === 'single' || row.type === 'multiple') {
        draft.optionCount = value
        draft.items = draft.items.map((item) => ({ ...item, optionCount: value, subquestionOptionCounts: item.subquestionCount ? Array(item.subquestionCount).fill(value) : item.subquestionOptionCounts }))
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
  const totalQuestions = rows.reduce((sum, row) => sum + row.count, 0)
  const valid = rows.length > 0 && props.suggestedStart + totalQuestions - 1 <= 999 && rows.every((row) => row.type && Number.isInteger(row.count) && row.count >= 1 && row.count <= 100 && Number.isFinite(row.score) && row.score >= 0)
  const totalScore = Number(rows.reduce((sum, row) => sum + (row.draft?.totalScore ?? row.count * row.score * (row.type === 'fill' ? row.structureCount ?? 1 : 1)), 0).toFixed(2))
  const startFor = (index: number) => props.suggestedStart + rows.slice(0, index).reduce((sum, row) => sum + row.count, 0)
  const selectedGroups = rows.flatMap((row, index) => {
    const start = startFor(index)
    const targets = selection[row.id]
    if (!batchMode || !targets?.length) return []
    const draft = createDraft(row, start)
    const existing = targets.filter(({ number, subIndex }) => {
      const item = draft.items[number]
      return item && (subIndex === undefined || subIndex < item.subquestionCount)
    })
    return existing.length ? [{ row, draft, targets: existing.map((target) => ({ ...target, number: start + target.number })) }] : []
  })
  const selectedCount = selectedGroups.reduce((sum, group) => sum + group.targets.length, 0)
  const allTypesMatch = (...types: QuestionGroupType[]) => selectedGroups.every(({ draft }) => types.includes(draft.type))
  const wholeQuestions = selectedGroups.every(({ targets }) => targets.every(({ subIndex }) => subIndex === undefined))
  const canSetType = allTypesMatch('comprehensive') && selectedGroups.every(({ draft, targets }) =>
    targets.every(({ number, subIndex }) => subIndex !== undefined || draft.items.some((item) => item.number === number && item.subquestionCount)))
  const availableActions: BatchAction[] = ['score']
  if (allTypesMatch('single', 'multiple')) availableActions.push('optionCount')
  if (allTypesMatch('multiple')) availableActions.push('partialScore')
  if (allTypesMatch('fill')) availableActions.push('blankCount', 'blankScore')
  if (canSetType) availableActions.push('type')
  if (wholeQuestions) availableActions.push('add')
  availableActions.push('delete')
  const activeAction = selectedCount && batchAction && availableActions.includes(batchAction) ? batchAction : undefined
  const numericField = activeAction && activeAction !== 'type' && activeAction !== 'delete' ? batchFields[activeAction] : undefined
  let batchMaximum = numericField?.max
  if (activeAction === 'add' || activeAction === 'partialScore') {
    batchMaximum = Math.min(batchMaximum ?? 0, ...selectedGroups.flatMap(({ draft, targets }) => targets.flatMap(({ number, subIndex }) => {
      const item = draft.items[number - draft.startNumber]
      if (activeAction === 'add') return [20 - item.subquestionCount]
      if (subIndex !== undefined) return [item.subquestionScores?.[subIndex] ?? item.score / item.subquestionCount]
      return item.subquestionCount ? item.subquestionScores ?? [item.score / item.subquestionCount] : [item.score]
    })))
  }

  const clearSelection = () => {
    setSelection({})
    setBatchAction(undefined)
    setBatchValue('')
  }
  const showCollapseAll = expandAllClicked && rows.length > 0 && rows.every(({ id }) => expandedIds.includes(id))
  const toggleGroup = (id: string) => {
    setExpandAllClicked(false)
    setActiveField(null)
    setExpandedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }
  const changeDraft = (next: QuestionGroupDraft, row: GroupRow) => {
    if (!next.items.length) {
      MetisMessage.info('题组至少保留一道题')
      return false
    }
    const resultingCount = totalQuestions - row.count + next.questionCount
    if (next.questionCount > 100 || props.suggestedStart + resultingCount - 1 > 999) {
      MetisMessage.info('已达到题量或题号上限')
      return false
    }
    if (next.questionCount !== row.count) setSelection((current) => ({ ...current, [row.id]: [] }))
    updateRow(row.id, withDraft(row, next))
    return true
  }
  const withDraft = (row: GroupRow, next: QuestionGroupDraft): GroupRow => {
    const first = next.items[0]
    return {
      ...row,
      draft: next, count: next.questionCount,
      score: Number((next.totalScore / next.questionCount).toFixed(2)),
      partialScore: first?.partialScore,
      structureCount: next.type === 'fill' ? first?.blankCount
        : next.type === 'comprehensive' ? first?.subquestionCount : first?.optionCount,
    }
  }
  const value = Number(batchValue)
  const invalidNumber = Boolean(numericField && (!batchValue || !Number.isFinite(value) || value < numericField.min
    || value > (batchMaximum ?? numericField.max) || (numericField.step === 1 && !Number.isInteger(value))))
  const applySelection = () => {
    if (!activeAction || invalidNumber) return
    if (activeAction === 'type' && (!batchValue || batchValue === 'comprehensive' || !Object.keys(labels).includes(batchValue))) return

    const updates = new Map<string, QuestionGroupDraft>()
    for (const { row, draft, targets } of selectedGroups) {
      const next = activeAction === 'delete' ? deleteGroupQuestionSelection(draft, targets)
        : activeAction === 'type' ? setGroupSubquestionType(draft, targets, batchValue as PartType)
        : activeAction === 'add' ? addGroupQuestionSubparts(draft, targets.map(({ number }) => number), value)
        : targets.reduce((result, { number, subIndex }) => updateQuestionItem(result, number, { [activeAction]: value }, subIndex), draft)
      if (activeAction === 'delete' && next === draft) {
        MetisMessage.info('综合题的每道题至少保留两个小题，请调整选择')
        return
      }
      updates.set(row.id, next)
    }
    setRows((current) => current.flatMap((row) => {
      const next = updates.get(row.id)
      return !next ? [row] : next.questionCount ? [withDraft(row, next)] : []
    }))
    setExpandedIds((current) => current.filter((id) => updates.get(id)?.questionCount !== 0))
    clearSelection()
  }
  const resizeDraft = (count: number, row: GroupRow, draft: QuestionGroupDraft) => {
    if (count === draft.questionCount || !Number.isInteger(count) || count < 1 || count > 100) return false
    const items = draft.items
    if (count < items.length) return changeDraft(deleteGroupQuestionSelection(draft, items.slice(count).map(({ number }) => ({ number }))), row)
    let next = draft
    let number = Math.max(...items.map((item) => item.number)) + 1
    while (next.items.length < count) {
      const appended = appendGroupQuestion(next, number)
      if (appended === next) {
        MetisMessage.info('已达到题号上限')
        return false
      }
      next = appended
      number += 1
    }
    return changeDraft(next, row)
  }
  return <MetisDialog open={props.open} title="添加题组" width="min(1040px, calc(100vw - 32px))" centered
    styles={{
      content: { display: 'flex', flexDirection: 'column', height: 'min(680px, calc(100dvh - 32px))', padding: '14px 18px' },
      header: { flexShrink: 0, marginBottom: 10 },
      body: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
      footer: { flexShrink: 0, marginTop: 10 },
    }} onCancel={props.onClose} footer={<div className="batch-group-footer"><span>共 {rows.length} 组 · {totalQuestions} 题 · {totalScore} 分</span><MetisButton size="s" onClick={props.onClose}>取消</MetisButton><MetisButton type="primary" size="s" disabled={!valid} onClick={() => props.onSubmit(rows.map((row, index) => createDraft(row, startFor(index))))}>添加 {rows.length} 个题组</MetisButton></div>}>
      <div className="group-type-presets" role="group" aria-label="按题型添加题组">{Object.entries(labels).filter(([type]) => type !== 'essay' || props.subject === '语文').map(([type, label]) => <button type="button" key={type} onClick={() => setRows((current) => [...current, { ...newRow(), type: type as QuestionGroupType, count: type === 'fill' ? 5 : type === 'solution' || type === 'essay' ? 2 : 10, score: type === 'solution' ? 5 : type === 'essay' ? 30 : 2 }])}><Plus size={14} />{label}</button>)}</div>
      <section className="group-edit-workspace" aria-label="题组编辑">
        <div className="group-edit-heading">
          <h3>题组编辑</h3>
          <div className="group-edit-heading-actions">
            <MetisButton type="borderless" size="s"
              icon={showCollapseAll ? <ChevronsUp size={14} /> : <ChevronsDown size={14} />}
              disabled={!rows.length}
              onClick={() => {
                setExpandAllClicked(!showCollapseAll)
                setExpandedIds(showCollapseAll ? [] : rows.map(({ id }) => id))
              }}>{showCollapseAll ? '全部收起' : '全部展开'}</MetisButton>
            <MetisButton type={batchMode ? 'primary' : 'borderless'} size="s" icon={<ListChecks size={14} />}
              disabled={!rows.length} aria-pressed={batchMode} onClick={() => {
                clearSelection()
                if (!batchMode && !expandedIds.length) setExpandedIds(rows.map(({ id }) => id))
                setBatchMode(!batchMode)
              }}>{batchMode ? '退出批量模式' : '批量操作'}</MetisButton>
          </div>
          {batchMode && <div className="group-workspace-batch-actions">
            {selectedCount > 0 && <>
              <select aria-label="选择批量操作" value={activeAction ?? ''} onChange={(event) => {
                const action = event.currentTarget.value as BatchAction
                setBatchAction(action)
                setBatchValue(action === 'add' ? '1' : '')
              }}>
                <option value="" disabled>选择批量操作</option>
                {availableActions.map((action) => <option key={action} value={action}>
                  {action === 'type' ? '设置小题题型' : action === 'delete' ? '删除所选' : batchFields[action].label}
                </option>)}
              </select>
              {numericField && <input type="number" aria-label={numericField.label} value={batchValue}
                min={numericField.min} max={batchMaximum} step={numericField.step}
                onChange={(event) => setBatchValue(event.currentTarget.value)} />}
              {activeAction === 'type' && <select aria-label="小题题型" value={batchValue} onChange={(event) => setBatchValue(event.currentTarget.value)}>
                <option value="" disabled>选择题型</option>
                {Object.entries(labels).filter(([type]) => type !== 'comprehensive' && (type !== 'essay' || props.subject === '语文'))
                  .map(([type, label]) => <option key={type} value={type}>{label}</option>)}
              </select>}
              {activeAction === 'delete' && <span>删完的题组会一并移除</span>}
              {activeAction && <MetisButton type="primary" size="s" disabled={invalidNumber || (activeAction === 'type' && !batchValue)}
                onClick={applySelection}>{activeAction === 'delete' ? '确认删除' : '确定'}</MetisButton>}
              <MetisButton type="borderless" size="s" onClick={clearSelection}>取消勾选</MetisButton>
            </>}
            <span aria-live="polite">{selectedCount ? `已选 ${selectedCount} 项` : '勾选要操作的题目或小题'}</span>
          </div>}
        </div>
        <div className="group-summary-list">
          {rows.map((row, index) => {
            const expanded = expandedIds.includes(row.id)
            const editingStart = startFor(index)
            const editingDraft = expanded ? createDraft(row, editingStart) : undefined
            return <section key={row.id}>
              <div className="group-summary-line">
                <button type="button" className="group-summary-toggle"
                  aria-label={`${expanded ? '收起' : '展开'}第 ${index + 1} 组${labels[row.type!]}`}
                  aria-expanded={expanded} aria-controls={expanded ? `details-${row.id}` : undefined}
                  onClick={() => toggleGroup(row.id)}>
                  <ChevronRight size={15} />
                </button>
                <strong>{labels[row.type!]}</strong>
                <span className="group-number-range">第 {startFor(index)}–{startFor(index) + row.count - 1} 题</span>
                <div className="group-summary-values">
                  {activeField === `${row.id}-count` ? <MetisInputNumber autoFocus aria-label="题量" value={row.count} min={1} max={100} precision={0} onBlur={() => setActiveField(null)} onChange={(value) => {
                    if (value == null) return
                    if (row.draft) resizeDraft(Number(value), row, createDraft(row, startFor(index)))
                    else updateRow(row.id, { count: Number(value) })
                  }} /> : <button type="button" onClick={() => setActiveField(`${row.id}-count`)}>{row.count} 道</button>}
                  {row.type === 'fill' && !row.draft && <>
                    <span>×</span>
                    {activeField === `${row.id}-blanks` ? <MetisInputNumber autoFocus aria-label="每题空数" value={row.structureCount ?? 1} min={1} max={12} precision={0} onBlur={() => setActiveField(null)} onChange={(value) => updateRow(row.id, { structureCount: Number(value ?? 1) })} /> : <button type="button" onClick={() => setActiveField(`${row.id}-blanks`)}>{row.structureCount ?? 1} 空/题</button>}
                  </>}
                  <span>{row.draft ? '，' : '×'}</span>
                  {row.draft ? <button type="button" onClick={() => setExpandedIds((current) => current.includes(row.id) ? current : [...current, row.id])}>逐题分值</button> : activeField === `${row.id}-score` ? <MetisInputNumber autoFocus aria-label={row.type === 'fill' ? '每空分值' : '每题分值'} value={row.score} min={0} max={100} precision={2} onBlur={() => setActiveField(null)} onChange={(value) => updateRow(row.id, { score: Number(value ?? 0) })} /> : <button type="button" onClick={() => setActiveField(`${row.id}-score`)}>{row.score} {row.type === 'fill' ? '分/空' : '分'}</button>}
                  <span className="group-score-equals">{row.draft ? '，' : '＝'}</span>
                  <strong className="group-row-total">共 {Number((row.draft?.totalScore ?? row.count * row.score * (row.type === 'fill' ? row.structureCount ?? 1 : 1)).toFixed(2))} 分</strong>
                  {row.type === 'multiple' && <div className="group-partial-score"><span>少选得</span>{activeField === `${row.id}-partial` ? <MetisInputNumber autoFocus aria-label="少选得分" value={row.partialScore ?? 1} min={0} max={row.score} precision={2} onBlur={() => setActiveField(null)} onChange={(value) => {
                    const partialScore = Number(value ?? 0)
                    const draft = row.draft ? { ...row.draft, items: row.draft.items.map((item) => ({ ...item, partialScore, subquestionPartialScores: item.subquestionCount ? Array(item.subquestionCount).fill(partialScore) : item.subquestionPartialScores })) } : undefined
                    updateRow(row.id, { partialScore, draft })
                  }} /> : <button type="button" onClick={() => setActiveField(`${row.id}-partial`)}>{row.partialScore ?? 1} 分</button>}</div>}

                </div>
                <div className="group-structure-setting">{(['single', 'multiple', 'comprehensive'] as const).some((type) => type === row.type) && (activeField === `${row.id}-structure` ? <MetisInputNumber autoFocus aria-label={row.type === 'fill' ? '每题空数' : row.type === 'comprehensive' ? '每题小题数' : '选项数'} min={row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4} max={row.type === 'fill' ? 12 : row.type === 'comprehensive' ? 20 : MAX_CHOICE_OPTIONS} precision={0} value={row.structureCount ?? (row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4)} onBlur={() => setActiveField(null)} onChange={(value) => updateStructure(row, Number(value ?? (row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4)))} /> : <button type="button" onClick={() => setActiveField(`${row.id}-structure`)}>{row.structureCount ?? (row.type === 'fill' ? 1 : row.type === 'comprehensive' ? 2 : 4)} {row.type === 'fill' ? '个空 / 题' : row.type === 'comprehensive' ? '个小题 / 题' : '个选项'}</button>)}</div>
                <div className="group-batch-actions">
                  <MetisButton type="borderless" title="删除" aria-label={`删除第${index + 1}组`} icon={<Trash2 size={15} />} onClick={() => {
                    setRows((current) => current.filter((item) => item.id !== row.id))
                    setExpandedIds((current) => current.filter((id) => id !== row.id))
                  }} />
                </div>
              </div>
              {expanded && editingDraft && (
                <div className="batch-group-edit-body" id={`details-${row.id}`}
                  style={{
                    '--question-rows-two-columns': Math.ceil(editingDraft.items.length / 2),
                    '--question-rows-three-columns': Math.ceil(editingDraft.items.length / 3),
                  } as CSSProperties}>
                  <QuestionStructurePanel
                    key={`${editingStart}-${batchMode}`}
                    workspaceSelection={batchMode ? (selection[row.id] ?? []).map((target) => ({ ...target, number: editingStart + target.number })) : undefined}
                    onWorkspaceSelectionChange={batchMode ? (targets) => {
                      setSelection((current) => ({ ...current, [row.id]: targets.map((target) => ({ ...target, number: target.number - editingStart })) }))
                      setBatchAction(undefined)
                      setBatchValue('')
                    } : undefined}
                    hideHeading
                    draft={editingDraft}
                    maxQuestionCount={100}
                    subject={props.subject}
                    onApplyBatch={(patch) => changeDraft(applyQuestionBatch(editingDraft, patch), row)}
                    onUpdateGroupQuestion={({ number, subIndex }, patch) => changeDraft(updateQuestionItem(editingDraft, number, patch, subIndex), row)}
                    onAddGroupSubparts={(numbers, count) => changeDraft(addGroupQuestionSubparts(editingDraft, numbers, count), row)}
                    onDeleteGroupQuestionSelection={(selection) => {
                      const next = deleteGroupQuestionSelection(editingDraft, selection)
                      if (next === editingDraft && editingDraft.type === 'comprehensive') MetisMessage.info('综合题的每道题至少保留两个小题')
                      return next !== editingDraft && changeDraft(next, row)
                    }}
                    onResizeGroup={(count) => resizeDraft(count, row, editingDraft)}
                    onUpdateSubquestionType={(selection, type) => changeDraft(setGroupSubquestionType(editingDraft, selection, type), row)}
                  />
                </div>
              )}
            </section>
          })}
          {!rows.length && <div className="group-preset-empty">选择上方题型，加入题组</div>}
        </div>
      </section>
    </MetisDialog>
}
