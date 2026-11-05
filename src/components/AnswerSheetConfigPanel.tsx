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
import {
  isQuestionBlockKind,
  type AnswerBlock,
  type AnswerBlockKind,
  type AnswerSheetDocument,
  type AnswerSheetSettings,
  type CandidateNumberLayout,
  type IdentityField,
} from '../features/answer-sheet/types'

interface AnswerSheetConfigPanelProps {
  document: AnswerSheetDocument
  activePage: number
  selectedBlockId: string
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onMetaVisibilityChange: (field: 'showQuestionCount' | 'showUnitScore' | 'showScore', visible: boolean) => void
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdateBlock: (patch: Partial<AnswerBlock>) => void
  onAdd: (kind: AnswerBlockKind) => void
}

const identityFields: IdentityField[] = ['学号', '姓名', '班级', '学校', '准考证号']
const candidateLayoutOptions: Array<{ value: CandidateNumberLayout; label: string }> = [
  { value: 'fill', label: '填涂' },
  { value: 'barcode', label: '条形码' },
  { value: 'handwrite', label: '手写' },
]
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

export function AnswerSheetConfigPanel(props: AnswerSheetConfigPanelProps) {
  const { document } = props
  const { blocks, pageCount, settings } = document
  const selected = blocks.find((block) => block.id === props.selectedBlockId)
  const questionBlock = selected && isQuestionBlockKind(selected.kind)
  const blankCard = document.paper.sections.length === 0
  const [addKind, setAddKind] = useState<AnswerBlockKind>('short-answer')
  const [candidatePreset, setCandidatePreset] = useState<'quiz' | 'exam'>('quiz')

  const toggleIdentity = (field: IdentityField) => {
    const enabling = !settings.identityFields.includes(field)
    const next = settings.identityFields.includes(field)
      ? settings.identityFields.filter((item) => item !== field)
      : [...settings.identityFields, field]
    props.onSettingsChange({
      identityFields: next,
      ...(field === '准考证号'
        ? {
            candidateNumberType: enabling ? '准考证号' : '学号',
            candidateNumberLayouts: enabling
              ? settings.candidateNumberLayouts.length ? settings.candidateNumberLayouts : ['fill']
              : [],
          }
        : {}),
    })
  }

  const toggleCandidateLayout = (layout: CandidateNumberLayout) => {
    const current = settings.candidateNumberLayouts
    if (current.includes(layout) && current.length === 1) return
    props.onSettingsChange({
      candidateNumberLayouts: current.includes(layout)
        ? current.filter((item) => item !== layout)
        : [...current, layout],
    })
  }

  const applyCandidatePreset = (preset: 'quiz' | 'exam') => {
    setCandidatePreset(preset)
    props.onSettingsChange(preset === 'quiz'
      ? {
          paperSize: 'A4',
          frontColumns: 2,
          backColumns: 2,
          identityFields: ['学号', '姓名', '班级'],
          candidateNumberType: '学号',
          candidateNumberLayouts: [],
          showNotice: true,
          noticeStyle: 'daily',
        }
      : {
          paperSize: 'A4',
          frontColumns: 2,
          backColumns: 2,
          identityFields: ['学校', '姓名', '准考证号'],
          candidateNumberType: '准考证号',
          candidateNumberLayouts: ['fill', 'handwrite'],
          showNotice: true,
          noticeStyle: 'daily',
        })
  }

  return (
    <aside className="answer-sheet-config" data-sec="4">
      <div className="config-panel-head">
        <div><strong>答题卡配置</strong></div>
        <MetisTag preset="primary">{blocks.length} 个题块</MetisTag>
      </div>

      <div className="config-scroll">
        <section className="config-flat-section config-preset-section">
          <div className="config-flat-title">快捷设置</div>
          <MetisRadio.Group
            className="config-inline-options"
            value={candidatePreset}
            options={[{ value: 'quiz', label: '日常测验' }, { value: 'exam', label: '大型考试' }]}
            onChange={(event) => applyCandidatePreset(event.target.value as 'quiz' | 'exam')}
          />
        </section>

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

        <section className="config-flat-section candidate-info-section">
          <div className="candidate-info-row">
            <div className="config-flat-title">考生信息</div>
            <div className="candidate-field-options">{identityFields.map((field) => <MetisCheckbox key={field} checked={settings.identityFields.includes(field)} onChange={() => toggleIdentity(field)}>{field === '学校' ? '学校名称' : field}</MetisCheckbox>)}</div>
          </div>
          <div className="config-flat-body">
            {settings.identityFields.includes('准考证号') && <Field label="考号呈现">
              <div className="config-check-list">{candidateLayoutOptions.map((option) => (
                <MetisCheckbox key={option.value} checked={settings.candidateNumberLayouts.includes(option.value)} onChange={() => toggleCandidateLayout(option.value)}>{option.label}</MetisCheckbox>
              ))}</div>
            </Field>}
            {settings.identityFields.includes('准考证号') && <div className="config-grid-two">
              <Field label="考号位数">
                <MetisInputNumber className="config-number" value={settings.candidateNumberDigits} min={4} max={18} addonAfter="位" onChange={(value) => props.onSettingsChange({ candidateNumberDigits: Number(value ?? 10) })} />
              </Field>
            </div>}
          </div>
          <div className="candidate-info-row">
            <div className="config-flat-title">注意事项</div>
            <MetisRadio.Group
              className="config-inline-options"
              value={settings.showNotice ? 'show' : 'hide'}
              options={[{ value: 'show', label: '显示' }, { value: 'hide', label: '隐藏' }]}
              onChange={(event) => props.onSettingsChange({ showNotice: event.target.value === 'show' })}
            />
          </div>
          {settings.showNotice && <div className="candidate-info-row">
            <div className="config-flat-title">样式</div>
            <MetisSelect
              className="notice-style-select"
              value={settings.noticeStyle}
              options={[{ value: 'daily', label: '日常样式' }]}
              onChange={(value) => props.onSettingsChange({ noticeStyle: value as AnswerSheetSettings['noticeStyle'] })}
            />
          </div>}
        </section>

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
              {settings.subjectiveAnswerStyle === 'lines' && (
                <MetisInputNumber
                  className="subjective-line-height"
                  value={settings.subjectiveLineHeight}
                  min={12}
                  max={40}
                  addonAfter="px"
                  onChange={(value) => props.onSettingsChange({ subjectiveLineHeight: Number(value ?? 16) })}
                  aria-label="下划线行高"
                />
              )}
            </div>
          </div>
        </section>

        <section className="config-flat-section config-block-section">
          <div className="config-flat-title"><span>题目结构</span><small>{pageCount} 面 · {blocks.length} 个题块</small></div>
          <div className="config-flat-body">
            <div className="config-page-tabs">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" className={props.activePage === page ? 'active' : ''} onClick={() => props.onPageChange(page)}>第 {page} 面</button>
              ))}
            </div>
            <div className="config-block-list">
              {blocks.filter((block) => block.page === props.activePage).map((block) => (
                <div
                  key={block.id}
                  className={`config-block-row ${block.id === props.selectedBlockId ? 'selected' : ''}`}
                >
                  <button type="button" onClick={() => props.onSelect(block.id)}><b>{block.title}</b><small>{blockKindLabels[block.kind]}{block.range ? ` · ${block.range}` : ''}</small></button>
                </div>
              ))}
              {!blocks.some((block) => block.page === props.activePage) && <div className="config-empty-blocks">当前页暂无题块</div>}
            </div>
            {blankCard && <div className="config-add-row">
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
                  <Field label="选项数量"><MetisSelect value={selected.optionCount ?? 4} options={[{ value: 4, label: 'A–D' }, { value: 5, label: 'A–E' }]} onChange={(value) => props.onUpdateBlock({ optionCount: Number(value) as 4 | 5 })} /></Field>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}
