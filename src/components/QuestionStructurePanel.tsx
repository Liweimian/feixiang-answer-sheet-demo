import { InlineQuestionNumber } from './InlineQuestionNumber'
import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { MetisButton, MetisCheckbox } from '@yuanfudao/metis-web-component'
import { ListChecks, Plus, Trash2, X } from 'lucide-react'
import { MAX_CHOICE_OPTIONS, type QuestionBatchPatch, type GroupQuestionSelection, type QuestionItemPatch } from '../features/answer-sheet/directQuestionEdit'
import type { QuestionGroupDraft, QuestionGroupType } from '../features/answer-sheet/types'

export interface QuestionStructurePanelProps {
  draft: QuestionGroupDraft
  onApplyBatch: (patch: QuestionBatchPatch) => void
  onUpdateGroupQuestion: (target: GroupQuestionSelection, patch: QuestionItemPatch) => void
  onAddGroupSubparts: (numbers: number[], count: number) => boolean
  onDeleteGroupQuestionSelection: (selection: GroupQuestionSelection[]) => boolean
  onAddGroupQuestion: () => boolean
  onResizeGroup: (count: number) => boolean
  onLocateQuestion?: (number: number) => void
  maxQuestionCount?: number
  subject: string
  onUpdateSubquestionType: (selection: readonly GroupQuestionSelection[], type: PartType) => void
}

const partTypeLabels = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题', solution: '解答题', essay: '作文题' }
type PartType = Exclude<QuestionGroupType, 'comprehensive'>

function PartTypeSelect({ label, placeholder, value, allowEssay, onChange }: {
  label: string
  placeholder: string
  value?: PartType
  allowEssay: boolean
  onChange: (type: PartType) => void
}) {
  const options = (Object.keys(partTypeLabels) as PartType[]).filter((type) => type !== 'essay' || allowEssay)
  return <select className="group-part-type" aria-label={label} value={value ?? ''} onChange={(event) => {
    const next = event.currentTarget.value
    const selected = options.find((type) => type === next)
    if (selected) onChange(selected)
  }}>
    <option value="" disabled>{placeholder}</option>
    {options.map((type) => <option key={type} value={type}>{partTypeLabels[type]}</option>)}
  </select>
}

const isChoice = (type: string) => type === 'single' || type === 'multiple'

function sharedValue(values: number[]) {
  return values.length && values.every((value) => value === values[0]) ? values[0] : undefined
}

function QuestionBatchSettings({ draft, onApplyBatch }: Pick<QuestionStructurePanelProps, 'draft' | 'onApplyBatch'>) {
  const [changes, setChanges] = useState<QuestionBatchPatch>({})
  const original: QuestionBatchPatch = {
    optionCount: sharedValue(draft.items.flatMap((item) => item.subquestionCount
      ? Array.from({ length: item.subquestionCount }, (_, index) => item.subquestionOptionCounts?.[index] ?? item.optionCount)
      : [item.optionCount])),
    blankCount: sharedValue(draft.items.flatMap((item) => item.subquestionCount
      ? Array.from({ length: item.subquestionCount }, (_, index) => item.subquestionBlankCounts?.[index] ?? 1)
      : [item.blankCount])),
    blankScore: sharedValue(draft.items.flatMap((item) => item.subquestionCount
      ? Array.from({ length: item.subquestionCount }, (_, index) => {
        const count = item.subquestionBlankCounts?.[index] ?? 1
        const score = item.subquestionScores?.[index] ?? item.score / item.subquestionCount
        return item.subquestionBlankScores?.[index] ?? Array(count).fill(Number((score / count).toFixed(2)))
      }).flat()
      : item.blankScores ?? Array(item.blankCount).fill(Number((item.score / Math.max(1, item.blankCount)).toFixed(2))))),
    partialScore: sharedValue(draft.items.flatMap((item) => item.subquestionCount
      ? Array.from({ length: item.subquestionCount }, (_, index) => item.subquestionPartialScores?.[index] ?? item.partialScore ?? 0)
      : [item.partialScore ?? 0])),
  }
  const updateField = (field: keyof QuestionBatchPatch, value: number) => {
    setChanges((current) => {
      const next = { ...current }
      if (value === original[field]) delete next[field]
      else next[field] = value
      return next
    })
  }
  const fieldValue = (field: keyof QuestionBatchPatch) => changes[field] ?? original[field]
  const isDirty = Object.keys(changes).length > 0

  const apply = () => {
    onApplyBatch(changes)
    setChanges({})
  }

  return <section className="question-structure-section" aria-label="题组批量设置">
    <div className="question-structure-section-head">
      <strong>题组批量设置</strong>
      <small>仅当前题组</small>
    </div>
    <div className="question-batch-inline-rows">
      {([
        ...(isChoice(draft.type) ? [{ field: 'optionCount', label: '每题选项数', unit: '个选项', min: 4, max: MAX_CHOICE_OPTIONS, step: 1 } as const] : []),
        ...(draft.type === 'multiple' ? [{ field: 'partialScore', label: '少选得分', unit: '分', min: 0, max: 300, step: 0.01 } as const] : []),
        ...(draft.type === 'fill' ? [
          { field: 'blankCount', label: '每题空数', unit: '个空', min: 1, max: 12, step: 1 } as const,
          { field: 'blankScore', label: '每空分值', unit: '分', min: 0, max: 300, step: 0.01 } as const,
        ] : []),
      ] as const).map(({ field, ...input }) => <div className="question-batch-inline-row" key={field}>
        <span>{input.label}</span>
        <InlineQuestionNumber {...input} value={fieldValue(field)} onCommit={(value) => updateField(field, value)} />
      </div>)}
    </div>
    <div className="question-structure-actions">
      <MetisButton type="primary" size="s" disabled={!isDirty} onClick={apply}>应用到本组</MetisButton>
    </div>
  </section>
}

function QuestionGroupSelectionSettings({ draft, onUpdateGroupQuestion, onAddGroupSubparts, onDeleteGroupQuestionSelection, onAddGroupQuestion, onLocateQuestion, subject, onUpdateSubquestionType, onApplyBatch }: QuestionStructurePanelProps) {
  const footerRef = useRef<HTMLDivElement>(null)
  const scrollToNewQuestion = useRef(false)
  useLayoutEffect(() => {
    if (!scrollToNewQuestion.current) return
    scrollToNewQuestion.current = false
    footerRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [draft.questionCount])

  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState<GroupQuestionSelection[]>([])
  const [pending, setPending] = useState<'add' | 'delete'>()
  const [rowToDelete, setRowToDelete] = useState<GroupQuestionSelection>()
  const [addQuantity, setAddQuantity] = useState(2)
  const targets = selected.filter(({ number, subIndex }) => draft.items.some((item) => item.number === number && (subIndex === undefined || subIndex < item.subquestionCount)))
  const canSetBatchType = draft.type === 'comprehensive' && targets.some(({ number, subIndex }) =>
    subIndex !== undefined || draft.items.some((item) => item.number === number && item.subquestionCount > 0))
  const count = targets.length
  const parentNumbers = [...new Set(targets.map((target) => target.number))]
  const batchItems = draft.items.filter((item) => parentNumbers.includes(item.number))
  const addLimit = Math.min(20, ...batchItems.map((item) => 20 - item.subquestionCount))
  const allSelected = count > 0 && targets.filter((target) => target.subIndex === undefined).length === draft.items.length
  const deletion = rowToDelete ? [rowToDelete] : targets
  const parentCount = deletion.filter((target) => target.subIndex === undefined).length
  const childCount = deletion.length - parentCount
  const selectedLabel = [parentCount > 0 ? `${parentCount} 道题` : '', childCount > 0 ? `${childCount} 个小题` : ''].filter(Boolean).join('和')
  const isSelected = ({ number, subIndex }: GroupQuestionSelection) => targets.some((target) => target.number === number && target.subIndex === subIndex)
  const close = () => { setPending(undefined); setRowToDelete(undefined) }

  const toggle = (target: GroupQuestionSelection, checked: boolean) => {
    close()
    setSelected((current) => {
      const remaining = current.filter((entry) => entry.number !== target.number || (
        target.subIndex !== undefined && entry.subIndex !== undefined && entry.subIndex !== target.subIndex
      ))
      return checked ? [...remaining, target] : remaining
    })
  }

  const toggleBatchMode = () => {
    close()
    setSelected([])
    setBatchMode((active) => !active)
  }

  const renderAddForm = () => <form className="solution-add-subparts" onSubmit={(event) => {
      event.preventDefault()
      if (Number.isInteger(addQuantity) && addQuantity >= 1 && addQuantity <= addLimit
        && onAddGroupSubparts(parentNumbers, addQuantity)) close()
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); close() }
    }}>
      <label>
        <span>每题增加</span>
        <input type="number" min={1} max={addLimit} step={1} required value={addQuantity || ''}
          aria-label="每题增加的小题数量" onChange={(event) => setAddQuantity(Number(event.currentTarget.value))} />
        <span>小题</span>
      </label>
      <div className="solution-add-subparts-actions">
        <button className="solution-add-submit" type="submit" aria-label={`添加到 ${parentNumbers.length} 题`}
          disabled={!Number.isInteger(addQuantity) || addQuantity < 1 || addQuantity > addLimit}>添加</button>
        <button className="solution-add-close" type="button" aria-label="取消添加小题" onClick={close}><X size={15} /></button>
      </div>
    </form>

  const renderDeleteForm = () => <div className="solution-selection-confirm">
      <span role="status">{rowToDelete ? (rowToDelete.subIndex === undefined ? `删除第 ${rowToDelete.number} 题？` : `删除第 ${rowToDelete.number} 题（${rowToDelete.subIndex + 1}）？`) : `删除所选 ${selectedLabel}？`}</span>
      <div>
        <MetisButton type="borderless" size="s" onClick={close}>取消</MetisButton>
        <MetisButton type="primary" size="s" disabled={!deletion.length} onClick={() => {
          if (onDeleteGroupQuestionSelection(deletion)) {
            setSelected([])
            close()
          }
        }}>确认删除</MetisButton>
      </div>
    </div>

  return <section className={`solution-batch ${batchMode ? 'is-batch-mode' : 'is-reading-mode'}`} aria-label="题目列表">
    {batchMode ? <div className={`solution-batch-select-all ${canSetBatchType ? 'has-batch-type' : ''}`}>
      <MetisCheckbox checked={allSelected} indeterminate={count > 0 && !allSelected} onChange={(event) => {
        close()
        setSelected(event.target.checked ? draft.items.map((item) => ({ number: item.number })) : [])
      }}>全选</MetisCheckbox>
      <div className="solution-selection-tools" aria-label="所选题目操作">
        <button type="button" className="solution-selection-add" disabled={count === 0 || addLimit < 1} onClick={() => {
          setRowToDelete(undefined)
          setAddQuantity(Math.min(addLimit, batchItems.every((item) => item.subquestionCount === 0) ? 2 : 1))
          setPending('add')
        }}><Plus size={13} /> 添加小题</button>
        {canSetBatchType && <PartTypeSelect label="设置所选小题的题型" placeholder="设置题型" allowEssay={subject === '语文'} onChange={(type) => {
          close()
          onUpdateSubquestionType(targets, type)
        }} />}
        <button type="button" className="solution-selection-delete" disabled={count === 0} onClick={() => { setRowToDelete(undefined); setPending('delete') }}><Trash2 size={13} /> 删除</button>
      </div>
      <button type="button" className="solution-batch-toggle" onClick={toggleBatchMode}>完成</button>
    </div> : <div className="solution-batch-entry">
      <button type="button" className="solution-batch-toggle" onClick={toggleBatchMode}><ListChecks size={14} /> 批量操作</button>
    </div>}
    {pending === 'add' && renderAddForm()}
    {pending === 'delete' && !rowToDelete && renderDeleteForm()}
    <div className="solution-batch-list">
      {draft.items.map((item) => <div key={item.number}>
        {[undefined, ...Array.from({ length: item.subquestionCount }, (_, index) => index)].map((subIndex) => {
          const target = { number: item.number, subIndex }
          const label = subIndex === undefined ? `第 ${item.number} 题` : `第 ${item.number} 题（${subIndex + 1}）`
          const score = subIndex === undefined ? item.score : item.subquestionScores?.[subIndex] ?? item.score / item.subquestionCount
          const hasChildren = subIndex === undefined && item.subquestionCount > 0
          const isChild = subIndex !== undefined
          const hasPartialScore = !hasChildren && draft.type === 'multiple'
          const options = (isChild ? item.subquestionOptionCounts?.[subIndex] : undefined) ?? item.optionCount
          const partialScore = (isChild ? item.subquestionPartialScores?.[subIndex] : undefined) ?? item.partialScore ?? 0
          const blanks = isChild ? item.subquestionBlankCounts?.[subIndex] ?? 1 : Math.max(1, item.blankCount)
          const blankScores = isChild ? item.subquestionBlankScores?.[subIndex] : item.blankScores
          const perBlank = blankScores?.length ? sharedValue(blankScores) : Number((score / blanks).toFixed(2))
          const partType = isChild ? item.subquestionTypes?.[subIndex] : undefined
          return <Fragment key={subIndex ?? 'parent'}><div className={`solution-batch-question ${subIndex === undefined ? '' : 'is-subpart'} ${isSelected(target) ? 'is-checked' : ''}`}>
            {batchMode && <MetisCheckbox checked={isSelected(target)} aria-label={`选择${label}`}
              indeterminate={subIndex === undefined && targets.some((entry) => entry.number === item.number && entry.subIndex !== undefined)}
              onChange={(event) => toggle(target, event.target.checked)} />}
            {subIndex === undefined
              ? onLocateQuestion
                ? <button type="button" onClick={() => onLocateQuestion(item.number)} title="在卡面定位">{item.number}.</button>
                : <span className="group-question-number">{item.number}.</span>
              : <span>（{subIndex + 1}）</span>}
            <div className="solution-batch-row-content">
            <div className="solution-batch-question-meta">
              {!hasChildren && isChoice(draft.type) && <span className="group-question-detail">
                <InlineQuestionNumber label={`${label}选项数`} value={options} unit="个选项" min={4} max={MAX_CHOICE_OPTIONS} step={1}
                  onCommit={(optionCount) => onUpdateGroupQuestion(target, { optionCount })} />，
              </span>}
              {hasPartialScore && <span className="group-question-partial">
                <span>少选得</span>
                <InlineQuestionNumber label={`${label}少选得分`} value={partialScore} unit="分" min={0} max={score} step={0.01}
                  onCommit={(value) => onUpdateGroupQuestion(target, { partialScore: value })} />，
              </span>}
              {!hasChildren && draft.type === 'fill' && <>
                <span className="group-question-detail">
                  <InlineQuestionNumber label={`${label}空数`} value={blanks} unit="个空" min={1} max={20} step={1}
                    onCommit={(blankCount) => onUpdateGroupQuestion(target, { blankCount })} />，
                </span>
                <span className="group-question-detail">
                  <InlineQuestionNumber label={`${label}每空分值`} value={perBlank} placeholder="每空分值不统一" unit="分/空" min={0} max={300} step={0.01}
                    onCommit={(blankScore) => onUpdateGroupQuestion(target, { blankScore })} />，
                </span>
              </>}
              {isChild && draft.type === 'comprehensive' && <span className="group-question-detail">
                <PartTypeSelect label={`${label}题型`} placeholder="选择题型" value={partType} allowEssay={subject === '语文' || partType === 'essay'}
                  onChange={(type) => onUpdateSubquestionType([target], type)} />，
              </span>}
              <span className="group-question-score">
                {subIndex === undefined && <span>共</span>}
                <InlineQuestionNumber label={`${label}分值`} value={score} unit="分" min={0} max={300} step={0.01}
                  onCommit={(value) => onUpdateGroupQuestion(target, { score: value })} />
              </span>
            </div>
            <div className="solution-row-actions">
              {!isChild && <button type="button" className="solution-row-add" aria-label={`为${label}添加小题`} title="添加小题"
                disabled={item.subquestionCount >= 20} onClick={() => {
                  if (onAddGroupSubparts([item.number], 1)) close()
                }}><Plus size={15} /></button>}
              <button type="button" className="solution-row-delete" aria-label={`删除${label}`} title={`删除${label}`} disabled={isChild && draft.type === 'comprehensive' && item.subquestionCount <= 2} onClick={() => {
                setRowToDelete(target)
                setPending('delete')
              }}><Trash2 size={14} /></button>
            </div>
          </div>
          </div>
          {pending === 'delete' && rowToDelete?.number === item.number && rowToDelete.subIndex === subIndex && renderDeleteForm()}
          </Fragment>
        })}
      </div>)}
    </div>
    <div className="solution-batch-footer" ref={footerRef}>
      <MetisButton type="borderless" size="s" icon={<Plus size={14} />} onClick={() => {
        scrollToNewQuestion.current = onAddGroupQuestion()
      }}>新增一题</MetisButton>
    </div>
    {batchMode && (isChoice(draft.type) || draft.type === 'fill') && <details className="question-type-batch">
      <summary>批量设置{draft.type === 'fill' ? '空数与分值' : '选项'}</summary>
      <QuestionBatchSettings draft={draft} onApplyBatch={onApplyBatch} />
    </details>}
  </section>
}

export function QuestionStructurePanel(props: QuestionStructurePanelProps) {
  const { draft } = props
  const [pendingCount, setPendingCount] = useState<number>()

  return <div className="question-structure-panel config-questions-view solution-structure-panel">
    <header className="question-structure-heading">
      <div className="question-structure-heading-line">
        <strong title={draft.title}>{draft.title}</strong>
        <div className="question-structure-summary solution-structure-summary">
        共 <InlineQuestionNumber label="本组题量" value={draft.questionCount} unit="道题" min={1} max={props.maxQuestionCount ?? 300} step={1} onCommit={(count) => {
          if (count < draft.questionCount) setPendingCount(count)
          else props.onResizeGroup(count)
        }} />，共 {draft.totalScore} 分
        </div>
      </div>
      {pendingCount !== undefined && <div className="solution-selection-confirm">
        <span>题量改为 {pendingCount} 道，将删除本组最后 {draft.questionCount - pendingCount} 道题。</span>
        <div>
          <MetisButton type="borderless" size="s" onClick={() => setPendingCount(undefined)}>取消</MetisButton>
          <MetisButton type="primary" size="s" onClick={() => {
            if (props.onResizeGroup(pendingCount)) setPendingCount(undefined)
          }}>确认调整</MetisButton>
        </div>
      </div>}
    </header>
    <QuestionGroupSelectionSettings {...props} />
  </div>
}
