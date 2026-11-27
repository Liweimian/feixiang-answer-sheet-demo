import { useEffect, useId, useState } from 'react'
import {
  MetisButton,
  MetisCheckbox,
  MetisInput,
  MetisInputNumber,
  MetisRadio,
  MetisSelect,
} from '@yuanfudao/metis-web-component'
import { Ban, Check, ChevronLeft, ChevronRight, Pencil, PenLine, Plus, Slash, Square, Trash2 } from 'lucide-react'
import { blockKindLabels } from '../data/mockPaper'
import { examHeaderTemplates } from '../data/headerTemplates'
import { questionNumbers } from '../features/answer-sheet/range'
import { QuestionStructurePanel, type QuestionStructurePanelProps } from './QuestionStructurePanel'
import {
  isQuestionBlockKind,
  type AnswerBlock,
  type AnswerBlockKind,
  type AnswerSheetDocument,
  type AnswerSheetSettings,
  type HeaderPreset,
  type HeaderTemplateId,
  type QuestionGroupType,
} from '../features/answer-sheet/types'

interface AnswerSheetConfigPanelProps {
  settingsRequest?: number
  questionStructure?: QuestionStructurePanelProps
  document: AnswerSheetDocument
  activePage: number
  selectedBlockId: string
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onModuleMergeChange: (kind: 'objective' | 'subjective' | 'none', checked: boolean) => void
  onPresetChange: (preset: HeaderPreset) => void
  onHeaderTemplateChange: (templateId: HeaderTemplateId) => void
  onRestoreHeaderTemplate: () => void
  onMetaVisibilityChange: (field: 'showQuestionCount' | 'showUnitScore' | 'showScore', visible: boolean) => void
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdateBlock: (patch: Partial<AnswerBlock>) => void
  onBlockScoresChange: (id: string, scores: Record<string, number>) => void
  onAdd: (kind: AnswerBlockKind) => void
  onBatchAddQuestionGroups: () => void
  onAddQuestionGroup: (type: QuestionGroupType) => void
  onDeleteBlock: (id: string) => void
  onEditQuestionGroup: (id: string) => void
}

const layoutOptions = (['A3', '8K', 'A4', '16K'] as const).map((paperSize) => ({
  value: paperSize,
  label: paperSize,
  children: ([1, 2, 3] as const).map((columns) => ({ value: columns, label: `${columns} 栏` })),
}))
const addableKinds: AnswerBlockKind[] = ['objective', 'short-answer', 'essay', 'mixed', 'drawing', 'table', 'forbidden', 'notice']

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="config-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

function ToggleField({ title, description, checked, disabled, onChange }: {
  title: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <MetisCheckbox className={`config-toggle ${disabled ? 'disabled' : ''}`} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)}>
      <span><b>{title}</b>{description && <small>{description}</small>}</span>
    </MetisCheckbox>
  )
}

function scoreKeys(block: AnswerBlock) {
  return questionNumbers(block.range).flatMap((number, questionIndex) => {
    const count = block.answerSlotCounts?.[questionIndex] ?? 0
    const slots = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: count }, (_, index) => index + 1)
    return count > 0 ? slots.map((slot) => `${number}.${slot}`) : [String(number)]
  })
}

function resolvedScores(block: AnswerBlock) {
  const keys = scoreKeys(block)
  if (!keys.length) return {}
  const unit = Number(((block.score ?? 0) / keys.length).toFixed(2))
  const distributed = Object.fromEntries(keys.map((key, index) => [key, index === keys.length - 1 ? Number(((block.score ?? 0) - unit * (keys.length - 1)).toFixed(2)) : unit]))
  return Object.fromEntries(keys.map((key) => [key, block.questionScores?.[key] ?? distributed[key]]))
}

function uniformValue(values: number[]) {
  if (!values.length || values.some((value) => value !== values[0])) return undefined
  return values[0]
}

export function AnswerSheetConfigPanel(props: AnswerSheetConfigPanelProps) {
  const { document } = props
  const { blocks, settings } = document
  const outlineBlocks = blocks.filter((block) => block.kind !== 'forbidden')
  const answerSheetQuestionCount = blocks.filter((block) => isQuestionBlockKind(block.kind)).reduce((total, block) => total + questionNumbers(block.range).length, 0)
  const answerSheetTotalScore = blocks
    .filter((block) => isQuestionBlockKind(block.kind))
    .reduce((total, block) => total + Number(block.score ?? 0), 0)
  const selected = blocks.find((block) => block.id === props.selectedBlockId)
  const questionBlock = selected && isQuestionBlockKind(selected.kind)
  const blankCard = document.paper.sections.length === 0
  const standaloneCard = !settings.linkedPaperId
  const [addKind, setAddKind] = useState<AnswerBlockKind>('short-answer')
  const [activeConfigView, setActiveConfigView] = useState<'questions' | 'card'>('questions')
  const [editingScoreBlockId, setEditingScoreBlockId] = useState<string | null>(null)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(0)
  useEffect(() => {
    if (props.settingsRequest) setActiveConfigView('card')
  }, [props.settingsRequest])
  useEffect(() => {
    setActiveConfigView('questions')
    setEditingScoreBlockId(null)
    setEditingQuestionIndex(0)
  }, [props.selectedBlockId])
  const candidatePreset = document.header.preset

  const updateScores = (block: AnswerBlock, patch: Record<string, number>) => {
    props.onSelect(block.id)
    props.onBlockScoresChange(block.id, { ...resolvedScores(block), ...patch })
  }

  const applyCandidatePreset = (preset: 'quiz' | 'exam') => {
    props.onPresetChange(preset)
  }

  return (
    <aside className="answer-sheet-config" data-sec="4">
      <div className="config-panel-head">
        <div><strong>题目与分值</strong></div>
        {props.questionStructure && <button type="button" className="config-group-overview-action" onClick={() => {
          setActiveConfigView('questions')
          props.onSelect('')
        }}><ChevronLeft size={13} /> 全部题组</button>}
      </div>



      <div className="config-scroll" data-view={activeConfigView} key={props.questionStructure ? `structure-${props.selectedBlockId}` : 'overview'}>
        <section className="config-flat-section config-layout-inline config-card-view">
          <div className="config-flat-title">纸张</div>
          <MetisSelect value={settings.paperSize} options={layoutOptions.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => props.onSettingsChange({ paperSize: value as AnswerSheetSettings['paperSize'] })} />
          <div className="config-flat-title">分栏</div>
          <MetisSelect value={settings.frontColumns} options={[1, 2, 3].map((value) => ({ value, label: `${value} 栏` }))} onChange={(value) => props.onSettingsChange({ frontColumns: Number(value) as 1 | 2 | 3, backColumns: Number(value) as 1 | 2 | 3 })} />
        </section>

        <section className="config-flat-section config-preset-section config-card-view">
          <div className="config-flat-title">表头</div>
          <div className="header-template-control">
            <MetisSelect
              className="header-template-select"
              value={candidatePreset === 'quiz' ? 'daily-quiz' : document.header.templateId}
              options={[
                { value: 'daily-quiz', label: '日常测验' },
                ...examHeaderTemplates.map((template) => ({ value: template.id, label: template.shortName })),
              ]}
              onChange={(value) => {
                if (value === 'daily-quiz') {
                  applyCandidatePreset('quiz')
                  return
                }
                props.onHeaderTemplateChange(value as HeaderTemplateId)
              }}
            />
            {document.header.customized && <MetisButton size="s" onClick={props.onRestoreHeaderTemplate}>恢复</MetisButton>}
          </div>
        </section>

        <details className="config-more-settings config-card-view"><summary>更多</summary>
          <AnswerSheetMoreSettings {...props} />
        </details>

        {props.questionStructure ? <QuestionStructurePanel {...props.questionStructure} /> : <section className="config-flat-section config-block-section config-questions-view">
          <div className="config-flat-body">
            {standaloneCard && <div className="config-creation-tools">
            <div className="config-meta-row config-question-order-row">
              <span>题号规则</span>
              <MetisSelect aria-label="题号规则"
                value={(settings.questionNumberOrder as string) === 'minor' || settings.questionNumberOrder === 'whole-paper-continuous' ? 'whole-paper-continuous' : 'within-major-continuous'}
                options={[{ value: 'within-major-continuous', label: '大题内部连续' }, { value: 'whole-paper-continuous', label: '全卷连续' }]}
                onChange={(value) => props.onSettingsChange({ questionNumberOrder: value as AnswerSheetSettings['questionNumberOrder'] })}
              />
            </div></div>}
            <div className="answer-sheet-total-score" aria-live="polite">
              <span>共 <b>{answerSheetQuestionCount}</b> 道题，共 <b>{Number(answerSheetTotalScore.toFixed(2))}</b> 分</span>
            </div>
            <div className="config-block-list">
              {outlineBlocks.map((block) => {
                const isQuestion = isQuestionBlockKind(block.kind)
                const numbers = isQuestion ? questionNumbers(block.range) : []
                const questionCount = numbers.length
                const computedGroupScore = isQuestion
                  ? Object.values(resolvedScores(block)).reduce((total, score) => total + score, 0)
                  : 0
                const selected = block.id === props.selectedBlockId
                return (
                  <div key={block.id} className={`config-outline-group ${selected ? 'selected' : ''}`} aria-current={selected ? 'true' : undefined}>
                    <div className={`config-block-row ${standaloneCard ? '' : 'config-block-row-linked'}`}>
                      <button type="button" className="config-block-title-button" onClick={() => props.onSelect(block.id)}>
                        <b>{block.title}</b>
                        <small className={isQuestion ? 'computed-group-summary' : undefined}>{isQuestion
                          ? `共 ${questionCount} 题　共 ${Number(computedGroupScore.toFixed(2))} 分`
                          : blockKindLabels[block.kind]}</small>
                      </button>
                      {standaloneCard && <div className="config-question-group-actions"><MetisButton type="borderless" icon={<Pencil size={13} />} aria-label={`编辑${block.title}`} title="编辑" onClick={() => props.onEditQuestionGroup(block.id)} /><MetisButton type="borderless" icon={<Trash2 size={13} />} aria-label={`删除${block.title}`} title="删除" onClick={() => props.onDeleteBlock(block.id)} /></div>}
                    </div>
                    {isQuestion && editingScoreBlockId === block.id && <div className="config-question-tree">
                      {numbers.length > 1 && <div className="config-score-pager"><button type="button" aria-label="上一题" disabled={editingQuestionIndex === 0} onClick={() => setEditingQuestionIndex((index) => Math.max(0, index - 1))}><ChevronLeft size={14} /></button><span>第 {Math.min(editingQuestionIndex + 1, numbers.length)} / {numbers.length} 题</span><button type="button" aria-label="下一题" disabled={editingQuestionIndex >= numbers.length - 1} onClick={() => setEditingQuestionIndex((index) => Math.min(numbers.length - 1, index + 1))}><ChevronRight size={14} /></button></div>}
                      {numbers.map((number, questionIndex) => {
                        if (questionIndex !== Math.min(editingQuestionIndex, numbers.length - 1)) return null
                        const scores = resolvedScores(block)
                        const slotCount = block.answerSlotCounts?.[questionIndex] ?? 0
                        const slotNumbers = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: slotCount }, (_, index) => index + 1)
                        const questionScore = slotCount > 0
                          ? slotNumbers.reduce((total, slot) => total + (scores[`${number}.${slot}`] ?? 0), 0)
                          : scores[String(number)] ?? 0
                        const compactQuestionGroup = standaloneCard && Boolean(block.questionGroupDraft)
                        return <div key={number} className={`config-question-node ${slotCount > 0 ? 'nested' : 'direct'}`}>
                          {!compactQuestionGroup && slotCount > 0 && <div className="config-question-head"><button type="button" onClick={() => props.onSelect(block.id)}><b>{number}.</b><small>（共 {slotCount} 小题，共 {questionScore} 分）</small></button></div>}
                          {compactQuestionGroup
                            ? <label className="config-direct-score"><span>{number}.</span><div className="config-score-with-unit"><MetisInputNumber value={questionScore} min={0} max={100} precision={2} controls={false} aria-label={`第${number}题分值`} onChange={(value) => { const total = Number(value ?? 0); if (slotCount > 0) { const unitScore = Number((total / slotCount).toFixed(2)); updateScores(block, Object.fromEntries(slotNumbers.map((slot) => [`${number}.${slot}`, unitScore]))) } else updateScores(block, { [String(number)]: total }) }} /><em>分</em></div></label>
                            : slotCount > 0
                            ? <div className="config-subquestion-list">{slotNumbers.map((slotNumber, slotIndex) => <label key={slotNumber}><span>{block.answerSlotLabels?.[questionIndex]?.[slotIndex] ?? `(${slotNumber})`}</span><div className="config-score-with-unit"><MetisInputNumber value={scores[`${number}.${slotNumber}`] ?? 0} min={0} max={100} precision={2} controls={false} aria-label={`第${number}题第${slotNumber}小题分值`} onChange={(value) => updateScores(block, { [`${number}.${slotNumber}`]: Number(value ?? 0) })} /><em>分</em></div></label>)}</div>
                            : <label className="config-direct-score"><span>{number}.</span><div className="config-score-with-unit"><MetisInputNumber value={scores[String(number)] ?? 0} min={0} max={100} precision={2} controls={false} aria-label={`第${number}题分值`} onChange={(value) => updateScores(block, { [String(number)]: Number(value ?? 0) })} /><em>分</em></div></label>}
                        </div>
                      })}
                    </div>}
                  </div>
                )
              })}
            </div>
            {standaloneCard && <div className="question-add-control question-add-single"><MetisButton type="borderless" icon={<Plus size={14} />} onClick={props.onBatchAddQuestionGroups}>添加题组</MetisButton></div>}
            {blankCard && !standaloneCard && <div className="config-add-row">
              <MetisSelect value={addKind} options={addableKinds.map((kind) => ({ value: kind, label: blockKindLabels[kind] }))} onChange={(value) => setAddKind(value as AnswerBlockKind)} />
              <MetisButton type="primary" size="s" icon={<Plus size={13} />} onClick={() => props.onAdd(addKind)}>添加到本页</MetisButton>
            </div>}
          </div>
        </section>}

        {blankCard && selected && !standaloneCard && (
          <section className="config-flat-section config-selected-section config-questions-view">
            <div className="config-flat-title"><span>所选题块</span><small title={selected.title}>{selected.title}</small></div>
            <div className="config-flat-body">
              <Field label="模块标题"><MetisInput value={selected.title} onChange={(event) => props.onUpdateBlock({ title: event.target.value })} /></Field>
              <div className="config-grid-two">
                <Field label="题块类型">
                  <MetisSelect value={selected.kind} options={addableKinds.map((kind) => ({ value: kind, label: blockKindLabels[kind] }))} onChange={(value) => props.onUpdateBlock({ kind: value as AnswerBlockKind })} />
                </Field>
                {questionBlock && <Field label="题号范围" hint="支持 1–10，12–20 跳号"><MetisInput value={selected.range ?? ''} placeholder="如 1–20" onChange={(event) => props.onUpdateBlock({ range: event.target.value })} /></Field>}
                {questionBlock && <Field label="区域分值"><MetisInputNumber className="config-number" value={selected.score} min={0} max={300} addonAfter="分" onChange={(value) => props.onUpdateBlock({ score: Number(value ?? 0) })} /></Field>}
              </div>

              {selected.kind === 'objective' && (
                <div className="config-grid-two">
                  <Field label="选项数量"><MetisSelect value={selected.optionCount ?? 4} options={[{ value: 2, label: 'T / F' }, { value: 4, label: 'A–D' }, { value: 5, label: 'A–E' }]} onChange={(value) => props.onUpdateBlock({ optionCount: Number(value) as 2 | 4 | 5 })} /></Field>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}

const objectiveLayoutChoices = [
  { value: 'number-vertical-option-horizontal', label: '题竖 · 项横', title: '题号竖排 · 选项横排', illustration: 'vertical-horizontal' },
  { value: 'number-horizontal-option-vertical', label: '题横 · 项竖', title: '题号横排 · 选项竖排', illustration: 'horizontal-vertical' },
  { value: 'number-horizontal-option-horizontal', label: '题横 · 项横', title: '题号横排 · 选项横排', illustration: 'horizontal-horizontal' },
] as const

export function AnswerSheetMoreSettings(props: Pick<AnswerSheetConfigPanelProps, 'document' | 'onSettingsChange' | 'onModuleMergeChange' | 'onMetaVisibilityChange'>) {
  const { blocks, settings } = props.document
  const choiceId = useId()
  const questionBlocks = blocks.filter((block) => isQuestionBlockKind(block.kind))
  const gradingMode = settings.subjectiveManualGrading ? settings.manualScoreStyle ?? 'handwrite' : 'none'

  return <div className="visual-card-settings">
    <section className="visual-setting-section">
      <div className="visual-setting-heading"><h3>题数与分值显示</h3><span>可多选 · 即时生效</span></div>
      <div className="visual-toggle-group">
        {([
          ['showQuestionCount', '题组题数', '12 题'],
          ['showScore', '题组总分', '共 24 分'],
          ['showUnitScore', '每题分值', '2 分 / 题'],
        ] as const).map(([field, label, sample]) => <button type="button" key={field} className="visual-toggle" aria-pressed={questionBlocks.every((block) => block[field])} onClick={() => props.onMetaVisibilityChange(field, !questionBlocks.every((block) => block[field]))}>
          <span className="visual-toggle-sample" aria-hidden="true">{sample}</span><span className="visual-toggle-caption"><span className="visual-check-mark" aria-hidden="true">{questionBlocks.every((block) => block[field]) && <Check size={10} strokeWidth={3} />}</span>{label}</span>
        </button>)}
      </div>
    </section>

    <section className="visual-setting-section">
      <h3>客观题填涂排列</h3>
      <div className="visual-radio-group objective-visual-choices" role="radiogroup" aria-label="客观题填涂排列">
        {objectiveLayoutChoices.map((choice) => <label className="visual-radio" key={choice.value} title={choice.title}>
          <input type="radio" name={`${choiceId}-objective`} aria-label={choice.title} value={choice.value} checked={settings.objectiveSortMode === choice.value} onChange={() => props.onSettingsChange({ objectiveSortMode: choice.value })} />
          <span className="visual-radio-face"><span className={`objective-miniature ${choice.illustration}`} aria-hidden="true">{[1, 2].map((number) => <span className="miniature-question" key={number}><b>{number}</b><span><i>A</i><i>B</i><i>C</i></span></span>)}</span><span>{choice.label}</span></span>
        </label>)}
      </div>
      <div className="visual-setting-inline visual-merge-setting">
        <span>题块合并</span>
        <div className="visual-inline-toggles">
          <button type="button" aria-pressed={!settings.objectiveMerge && !settings.subjectiveMerge} onClick={() => props.onModuleMergeChange('none', true)}><span className="visual-check-mark" aria-hidden="true">{!settings.objectiveMerge && !settings.subjectiveMerge && <Check size={10} strokeWidth={3} />}</span>不合并</button>
          <button type="button" aria-pressed={settings.objectiveMerge} onClick={() => props.onModuleMergeChange('objective', !settings.objectiveMerge)}><span className="visual-check-mark" aria-hidden="true">{settings.objectiveMerge && <Check size={10} strokeWidth={3} />}</span>客观题</button>
          <button type="button" aria-pressed={settings.subjectiveMerge} onClick={() => props.onModuleMergeChange('subjective', !settings.subjectiveMerge)}><span className="visual-check-mark" aria-hidden="true">{settings.subjectiveMerge && <Check size={10} strokeWidth={3} />}</span>主观题</button>
        </div>
      </div>
    </section>

    <section className="visual-setting-section">
      <h3>手批方式</h3>
      <div className="visual-radio-group" role="radiogroup" aria-label="手批方式">
        {([
          { value: 'none', label: '不启用', icon: Ban },
          { value: 'handwrite', label: '手写', icon: PenLine },
          { value: 'slash', label: '划线', icon: Slash },
        ] as const).map((choice) => <label className="visual-radio" key={choice.value}>
          <input type="radio" name={`${choiceId}-grading`} value={choice.value} checked={gradingMode === choice.value} onChange={() => props.onSettingsChange(choice.value === 'none' ? { subjectiveManualGrading: false } : { subjectiveManualGrading: true, manualScoreStyle: choice.value })} />
          <span className="visual-radio-face"><choice.icon size={19} strokeWidth={1.5} /><span>{choice.label}</span></span>
        </label>)}
      </div>
      {settings.subjectiveManualGrading && settings.manualScoreStyle === 'slash' && <div className="visual-half-score"><MetisCheckbox checked={!!settings.allowHalfScore} onChange={(event) => props.onSettingsChange({ allowHalfScore: event.target.checked })}>显示独立 0.5 格</MetisCheckbox></div>}
    </section>

    <section className="visual-setting-section">
      <h3>解答题作答</h3>
      <div className="visual-radio-group visual-two-choices" role="radiogroup" aria-label="解答题作答">
        {([
          { value: 'blank', label: '空白', icon: Square },
          { value: 'lines', label: '作答线', icon: Square },
        ] as const).map((choice) => <label className="visual-radio" key={choice.value}>
          <input type="radio" name={`${choiceId}-answer`} value={choice.value} checked={settings.subjectiveAnswerStyle === choice.value} onChange={() => props.onSettingsChange({ subjectiveAnswerStyle: choice.value })} />
          <span className="visual-radio-face">{choice.value === 'lines' ? <span className="ruled-answer-icon" aria-hidden="true"><i /><i /><i /><i /></span> : <choice.icon size={19} strokeWidth={1.5} />}<span>{choice.label}</span></span>
        </label>)}
      </div>
      <div className="visual-setting-inline">
        <span title="同时作用于填空题和解答题">作答线行高</span>
        <MetisInputNumber className="subjective-line-height" value={settings.subjectiveLineHeight} min={12} max={40} addonAfter="px" onChange={(value) => props.onSettingsChange({ subjectiveLineHeight: Number(value ?? 16) })} aria-label="填空题和解答题作答线行高" />
      </div>
    </section>
  </div>
}
