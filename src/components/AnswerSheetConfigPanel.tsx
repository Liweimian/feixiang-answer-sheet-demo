import { useState } from 'react'
import {
  MetisButton,
  MetisCascader,
  MetisCheckbox,
  MetisInput,
  MetisInputNumber,
  MetisRadio,
  MetisSelect,
  MetisSwitch,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import { Plus } from 'lucide-react'
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
          <MetisRadio.Group
            className="config-inline-options"
            value={candidatePreset}
            options={[{ value: 'quiz', label: '日常测验' }, { value: 'exam', label: '大型考试' }]}
            onChange={(event) => applyCandidatePreset(event.target.value as 'quiz' | 'exam')}
          />
        </section>

        {candidatePreset === 'exam' && <section className="config-flat-section config-header-template-section">
          <div className="config-flat-title">大考样式</div>
          <div className="header-template-control">
            <MetisSelect
              className="header-template-select"
              value={document.header.templateId}
              options={examHeaderTemplates.map((template) => ({
                value: template.id,
                label: `${template.shortName} · ${template.evidenceLabel}`,
              }))}
              onChange={(value) => props.onHeaderTemplateChange(value as HeaderTemplateId)}
            />
            {document.header.customized && <MetisButton size="s" onClick={props.onRestoreHeaderTemplate}>恢复</MetisButton>}
          </div>
          <p className="header-template-source">{document.header.sourceNote}</p>
        </section>}

        <section className="config-flat-section">
          <div className="config-meta-row">
            <span>题量与分值</span>
            <div className="config-check-list">
              <MetisCheckbox checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showQuestionCount)} onChange={(event) => props.onMetaVisibilityChange('showQuestionCount', event.target.checked)}>题量</MetisCheckbox>
              <MetisCheckbox checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showUnitScore)} onChange={(event) => props.onMetaVisibilityChange('showUnitScore', event.target.checked)}>每题分值</MetisCheckbox>
              <MetisCheckbox checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showScore)} onChange={(event) => props.onMetaVisibilityChange('showScore', event.target.checked)}>总分</MetisCheckbox>
            </div>
          </div>
        </section>

        <section className="config-flat-section">
          <div className="config-meta-row">
            <span>题号排序</span>
            <MetisRadio.Group
              className="config-inline-options"
              value={settings.questionNumberOrder}
              options={[{ value: 'major', label: '按大题排序' }, { value: 'minor', label: '按小题排序' }]}
              onChange={(event) => props.onSettingsChange({ questionNumberOrder: event.target.value as AnswerSheetSettings['questionNumberOrder'] })}
            />
          </div>
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
          <div className="config-meta-row">
            <span>客观题合并</span>
            <MetisSwitch size="small" checked={settings.objectiveMerge} onChange={(checked) => props.onSettingsChange({ objectiveMerge: checked })} />
          </div>
          <div className="config-meta-row">
            <span>解答题作答</span>
            <div className="subjective-answer-controls">
              <MetisRadio.Group
                className="config-inline-options"
                value={settings.subjectiveAnswerStyle}
                options={[{ value: 'blank', label: '空白' }, { value: 'lines', label: '下划线' }]}
                onChange={(event) => props.onSettingsChange({ subjectiveAnswerStyle: event.target.value as AnswerSheetSettings['subjectiveAnswerStyle'] })}
              />
            </div>
          </div>
          <div className="config-meta-row">
            <span>作答线行高</span>
            <MetisInputNumber
              className="subjective-line-height"
              value={settings.subjectiveLineHeight}
              min={12}
              max={40}
              addonAfter="px"
              onChange={(value) => props.onSettingsChange({ subjectiveLineHeight: Number(value ?? 16) })}
              aria-label="作答线行高"
            />
          </div>
        </section>

        <section className="config-flat-section config-block-section">
          <div className="config-flat-title"><span>题目结构</span><small>{pageCount} 面 · {outlineBlocks.length} 个题块</small></div>
          <div className="config-flat-body">
            {standaloneCard && <div className="question-type-actions">
              {([['single', '单选题'], ['multiple', '多选题'], ['judge', '判断题'], ['fill', '填空题'], ['solution', '解答题'], ['comprehensive', '综合题']] as const).map(([type, label]) => <MetisButton key={type} type="bordered" icon={<Plus size={13} />} onClick={() => props.onAddQuestionGroup(type)}>{label}</MetisButton>)}
            </div>}
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
                      {isQuestion && <label className="config-block-batch-score"><span>每题分值</span><MetisInputNumber value={uniformValue(Object.values(resolvedScores(block)))} min={0} max={100} precision={2} controls={false} placeholder="分值" addonAfter="分" aria-label={`${block.title}每题分值`} onChange={(value) => setAllScores(block, Number(value ?? 0))} /></label>}
                    </div>
                    {isQuestion && <div className="config-question-tree">
                      {numbers.map((number, questionIndex) => {
                        const scores = resolvedScores(block)
                        const slotCount = block.answerSlotCounts?.[questionIndex] ?? 0
                        const slotNumbers = block.answerSlotNumbers?.[questionIndex] ?? Array.from({ length: slotCount }, (_, index) => index + 1)
                        const questionScore = slotCount > 0
                          ? slotNumbers.reduce((total, slot) => total + (scores[`${number}.${slot}`] ?? 0), 0)
                          : scores[String(number)] ?? 0
                        return <div key={number} className={`config-question-node ${slotCount > 0 ? 'nested' : 'direct'}`}>
                          {slotCount > 0 && <div className="config-question-head"><button type="button" onClick={() => props.onSelect(block.id)}><b>题 {number}</b><small>（共 {slotCount} 小题，共 {questionScore} 分）</small></button><label><span>每小题</span><MetisInputNumber value={uniformValue(slotNumbers.map((slot) => scores[`${number}.${slot}`] ?? 0))} min={0} max={100} precision={2} controls={false} placeholder="分值" addonAfter="分" aria-label={`第${number}题每小题分值`} onChange={(value) => updateScores(block, Object.fromEntries(slotNumbers.map((slot) => [`${number}.${slot}`, Number(value ?? 0)])))} /></label></div>}
                          {slotCount > 0
                            ? <div className="config-subquestion-list">{slotNumbers.map((slotNumber) => <label key={slotNumber}><span>题({slotNumber})</span><MetisInputNumber value={scores[`${number}.${slotNumber}`] ?? 0} min={0} max={100} precision={2} controls={false} addonAfter="分" aria-label={`第${number}题第${slotNumber}小题分值`} onChange={(value) => updateScores(block, { [`${number}.${slotNumber}`]: Number(value ?? 0) })} /></label>)}</div>
                            : <label className="config-direct-score"><span>{number}.</span><MetisInputNumber value={scores[String(number)] ?? 0} min={0} max={100} precision={2} controls={false} addonAfter="分" aria-label={`第${number}题分值`} onChange={(value) => updateScores(block, { [String(number)]: Number(value ?? 0) })} /></label>}
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

        {blankCard && selected && (
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
