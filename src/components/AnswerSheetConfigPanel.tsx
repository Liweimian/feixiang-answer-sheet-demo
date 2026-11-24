import { useState } from 'react'
import {
  MetisButton,
  MetisCascader,
  MetisCheckbox,
  MetisInput,
  MetisInputNumber,
  MetisRadio,
  MetisSelect,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { blockKindLabels } from '../data/mockPaper'
import { examHeaderTemplates } from '../data/headerTemplates'
import { questionNumbers } from '../features/answer-sheet/range'
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
  document: AnswerSheetDocument
  activePage: number
  selectedBlockId: string
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onModuleMergeChange: (kind: 'objective' | 'subjective', checked: boolean) => void
  onPresetChange: (preset: HeaderPreset) => void
  onHeaderTemplateChange: (templateId: HeaderTemplateId) => void
  onRestoreHeaderTemplate: () => void
  onMetaVisibilityChange: (field: 'showQuestionCount' | 'showUnitScore' | 'showScore', visible: boolean) => void
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdateBlock: (patch: Partial<AnswerBlock>) => void
  onBlockScoresChange: (id: string, scores: Record<string, number>) => void
  onAdd: (kind: AnswerBlockKind) => void
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
  const { blocks, pageCount, settings } = document
  const outlineBlocks = blocks.filter((block) => block.kind !== 'forbidden')
  const answerSheetTotalScore = blocks
    .filter((block) => isQuestionBlockKind(block.kind))
    .reduce((total, block) => total + Number(block.score ?? 0), 0)
  const selected = blocks.find((block) => block.id === props.selectedBlockId)
  const questionBlock = selected && isQuestionBlockKind(selected.kind)
  const blankCard = document.paper.sections.length === 0
  const standaloneCard = !settings.linkedPaperId
  const [addKind, setAddKind] = useState<AnswerBlockKind>('short-answer')
  const candidatePreset = document.header.preset

  const updateScores = (block: AnswerBlock, patch: Record<string, number>) => {
    props.onSelect(block.id)
    props.onBlockScoresChange(block.id, { ...resolvedScores(block), ...patch })
  }

  const setAllScores = (block: AnswerBlock, value: number) => {
    updateScores(block, Object.fromEntries(scoreKeys(block).map((key) => [key, value])))
  }

  const applyCandidatePreset = (preset: 'quiz' | 'exam') => {
    props.onPresetChange(preset)
  }

  return (
    <aside className="answer-sheet-config" data-sec="4">
      <div className="config-panel-head">
        <div><strong>答题卡配置</strong></div>
        <MetisTag preset="primary">{outlineBlocks.length} 个题块</MetisTag>
      </div>

      <div className="config-scroll">
        <section className="config-flat-section config-layout-inline">
          <div className="config-flat-title">版面设置</div>
          <MetisCascader
            className="layout-cascader"
            value={[settings.paperSize, settings.frontColumns]}
            options={layoutOptions}
            allowClear={false}
            displayRender={() => `${settings.paperSize} - ${settings.frontColumns}栏`}
            onChange={(value) => {
              const [paperSize, rawColumns] = value as [AnswerSheetSettings['paperSize'], number]
              const columns = Number(rawColumns) as 1 | 2 | 3
              props.onSettingsChange({ paperSize, frontColumns: columns, backColumns: columns })
            }}
          />
        </section>

        <section className="config-flat-section config-preset-section">
          <div className="config-flat-title">表头模板</div>
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

        <section className="config-flat-section">
          <div className="config-meta-row config-score-meta-row">
            <span>题量与分值</span>
            <div className="config-check-list config-score-primary">
              <MetisCheckbox checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showQuestionCount)} onChange={(event) => props.onMetaVisibilityChange('showQuestionCount', event.target.checked)}>模块总题量</MetisCheckbox>
              <MetisCheckbox checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showScore)} onChange={(event) => props.onMetaVisibilityChange('showScore', event.target.checked)}>模块总分</MetisCheckbox>
            </div>
            <div className="config-check-list config-score-secondary">
              <MetisCheckbox checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showUnitScore)} onChange={(event) => props.onMetaVisibilityChange('showUnitScore', event.target.checked)}>单题分值</MetisCheckbox>
            </div>
          </div>
        </section>

        <section className="config-flat-section">
          {standaloneCard && <div className="config-meta-row config-question-order-row">
            <span>题号编排</span>
            <MetisRadio.Group
              className="config-inline-options"
              value={(settings.questionNumberOrder as string) === 'minor' || settings.questionNumberOrder === 'whole-paper-continuous'
                ? 'whole-paper-continuous'
                : 'within-major-continuous'}
              options={[
                { value: 'within-major-continuous', label: '大题内部连续' },
                { value: 'whole-paper-continuous', label: '全卷连续' },
              ]}
              onChange={(event) => props.onSettingsChange({ questionNumberOrder: event.target.value as AnswerSheetSettings['questionNumberOrder'] })}
            />
          </div>}
          <div className="config-meta-row config-objective-sort-row">
            <span>客观题排列</span>
            <MetisSelect
              className="objective-sort-select"
              value={settings.objectiveSortMode}
              options={[
                { value: 'number-vertical-option-horizontal', label: '题号竖排 · 选项横排' },
                { value: 'number-horizontal-option-vertical', label: '题号横排 · 选项竖排' },
                { value: 'number-horizontal-option-horizontal', label: '题号横排 · 选项横排' },
              ]}
              onChange={(value) => props.onSettingsChange({ objectiveSortMode: value as AnswerSheetSettings['objectiveSortMode'] })}
            />
          </div>
          <div className="config-meta-row config-module-merge-row">
            <span>模块合并</span>
            <div className="config-check-list config-module-merge-options">
              <MetisCheckbox checked={settings.objectiveMerge} onChange={(event) => props.onModuleMergeChange('objective', event.target.checked)}>客观题</MetisCheckbox>
              <MetisCheckbox checked={settings.subjectiveMerge} onChange={(event) => props.onModuleMergeChange('subjective', event.target.checked)}>主观题</MetisCheckbox>
            </div>
          </div>
          <div className="config-meta-row">
            <span>手批方式</span>
            <MetisRadio.Group
              className="config-inline-options manual-grading-options"
              value={settings.subjectiveManualGrading ? (settings.manualScoreStyle ?? 'handwrite') : 'none'}
              options={[{ value: 'none', label: '不启用' }, { value: 'handwrite', label: '手写' }, { value: 'slash', label: '划线' }]}
              onChange={(event) => {
                const value = event.target.value as 'none' | NonNullable<AnswerSheetSettings['manualScoreStyle']>
                props.onSettingsChange(value === 'none'
                  ? { subjectiveManualGrading: false }
                  : { subjectiveManualGrading: true, manualScoreStyle: value })
              }}
            />
          </div>
          {settings.subjectiveManualGrading && settings.manualScoreStyle === 'slash' && <>
            <div className="config-meta-row">
              <span>半分</span>
              <MetisCheckbox checked={!!settings.allowHalfScore} onChange={(event) => props.onSettingsChange({ allowHalfScore: event.target.checked })}>显示独立 0.5 格</MetisCheckbox>
            </div>
          </>}
          <div className="config-meta-row">
            <span>解答题作答</span>
            <div className="subjective-answer-controls">
              <MetisRadio.Group
                className="config-inline-options"
                value={settings.subjectiveAnswerStyle}
                options={[{ value: 'blank', label: '空白' }, { value: 'lines', label: '作答线' }]}
                onChange={(event) => props.onSettingsChange({ subjectiveAnswerStyle: event.target.value as AnswerSheetSettings['subjectiveAnswerStyle'] })}
              />
            </div>
          </div>
          <div className="config-meta-row">
            <span title="同时作用于填空题和解答题">作答线行高</span>
            <MetisInputNumber
              className="subjective-line-height"
              value={settings.subjectiveLineHeight}
              min={12}
              max={40}
              addonAfter="px"
              onChange={(value) => props.onSettingsChange({ subjectiveLineHeight: Number(value ?? 16) })}
              aria-label="填空题和解答题作答线行高"
            />
          </div>
        </section>

        <section className="config-flat-section config-block-section">
          <div className="config-flat-title"><span>题目结构</span><small>{pageCount} 面 · {outlineBlocks.length} 个题块</small></div>
          <div className="config-flat-body">
            {standaloneCard && <div className="question-type-actions">
              {([['single', '单选题'], ['multiple', '多选题'], ['judge', '判断题'], ['fill', '填空题'], ['solution', '解答题'], ['essay', '作文题'], ['comprehensive', '综合题']] as const).map(([type, label]) => <MetisButton key={type} type="bordered" icon={<Plus size={13} />} onClick={() => props.onAddQuestionGroup(type)}>{label}</MetisButton>)}
            </div>}
            <div className="answer-sheet-total-score" aria-live="polite">
              <span>答题卡总分</span>
              <strong>{Number(answerSheetTotalScore.toFixed(2))}</strong>
              <em>分</em>
            </div>
            <div className="config-block-list">
              {outlineBlocks.map((block) => {
                const isQuestion = isQuestionBlockKind(block.kind)
                const numbers = isQuestion ? questionNumbers(block.range) : []
                const questionCount = numbers.length
                const selected = block.id === props.selectedBlockId
                return (
                  <div key={block.id} className={`config-outline-group ${selected ? 'selected' : ''}`} aria-current={selected ? 'true' : undefined}>
                    <div className="config-block-row">
                      <button type="button" onClick={() => props.onSelect(block.id)}>
                        <b>{block.title}</b>
                        <small>{isQuestion ? `（共 ${questionCount} 题，共 ${block.score ?? 0} 分）` : blockKindLabels[block.kind]}</small>
                      </button>
                      {isQuestion && <label className="config-block-batch-score"><span>总分值</span><div className="config-score-with-unit"><MetisInputNumber value={block.score ?? 0} min={0} max={300} precision={2} controls={false} placeholder="分值" aria-label={`${block.title}总分值`} onChange={(value) => setAllScores(block, Number(value ?? 0) / Math.max(1, questionCount))} /><em>分</em></div></label>}
                      {standaloneCard && <div className="config-question-group-actions"><MetisButton type="borderless" icon={<Pencil size={13} />} aria-label={`编辑${block.title}`} title="编辑" onClick={() => props.onEditQuestionGroup(block.id)} /><MetisButton type="borderless" icon={<Trash2 size={13} />} aria-label={`删除${block.title}`} title="删除" onClick={() => props.onDeleteBlock(block.id)} /></div>}
                    </div>
                    {isQuestion && <div className="config-question-tree">
                      {numbers.map((number, questionIndex) => {
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
              {!outlineBlocks.length && <div className="config-empty-blocks">暂无题目结构</div>}
            </div>
            {blankCard && !standaloneCard && <div className="config-add-row">
              <MetisSelect value={addKind} options={addableKinds.map((kind) => ({ value: kind, label: blockKindLabels[kind] }))} onChange={(value) => setAddKind(value as AnswerBlockKind)} />
              <MetisButton type="primary" size="s" icon={<Plus size={13} />} onClick={() => props.onAdd(addKind)}>添加到本页</MetisButton>
            </div>}
          </div>
        </section>

        {blankCard && selected && !standaloneCard && (
          <section className="config-flat-section config-selected-section">
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
