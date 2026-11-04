import { useState } from 'react'
import {
  MetisButton,
  MetisInput,
  MetisInputNumber,
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
  type IdentityField,
} from '../features/answer-sheet/types'

interface AnswerSheetConfigPanelProps {
  document: AnswerSheetDocument
  activePage: number
  selectedBlockId: string
  onSettingsChange: (patch: Partial<AnswerSheetSettings>) => void
  onScoreVisibilityChange: (visible: boolean) => void
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onUpdateBlock: (patch: Partial<AnswerBlock>) => void
  onAdd: (kind: AnswerBlockKind) => void
}

const identityFields: IdentityField[] = ['学校', '姓名', '班级', '学号', '准考证号', '考场号', '座位号']
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
    <label className={`config-toggle ${disabled ? 'disabled' : ''}`}>
      <span><b>{title}</b>{description && <small>{description}</small>}</span>
      <MetisSwitch checked={checked} disabled={disabled} onChange={onChange} />
    </label>
  )
}

export function AnswerSheetConfigPanel(props: AnswerSheetConfigPanelProps) {
  const { document } = props
  const { blocks, pageCount, settings } = document
  const selected = blocks.find((block) => block.id === props.selectedBlockId)
  const questionBlock = selected && isQuestionBlockKind(selected.kind)
  const blankCard = document.paper.sections.length === 0
  const [addKind, setAddKind] = useState<AnswerBlockKind>('short-answer')

  const toggleIdentity = (field: IdentityField) => {
    const next = settings.identityFields.includes(field)
      ? settings.identityFields.filter((item) => item !== field)
      : [...settings.identityFields, field]
    props.onSettingsChange({ identityFields: next })
  }

  return (
    <aside className="answer-sheet-config" data-sec="4">
      <div className="config-panel-head">
        <div><strong>答题卡配置</strong></div>
        <MetisTag preset="primary">{blocks.length} 个题块</MetisTag>
      </div>

      <div className="config-scroll">
        <section className="config-flat-section">
          <div className="config-flat-title">版面设置</div>
          <div className="layout-setting-row">
            <Field label="纸张">
              <MetisSelect
                value={settings.paperSize}
                options={['A4', 'A3', '8K', '16K'].map((value) => ({ value, label: value }))}
                onChange={(value) => props.onSettingsChange({ paperSize: value as AnswerSheetSettings['paperSize'] })}
              />
            </Field>
            <Field label="栏数">
              <MetisSelect
                value={settings.frontColumns}
                options={[1, 2, 3].map((value) => ({ value, label: `${value} 栏` }))}
                onChange={(value) => {
                  const columns = Number(value) as 1 | 2 | 3
                  props.onSettingsChange({ frontColumns: columns, backColumns: columns })
                }}
              />
            </Field>
          </div>
        </section>

        <section className="config-flat-section">
          <div className="config-flat-title">考生信息</div>
          <div className="config-flat-body">
            <Field label="身份字段">
              <div className="config-chip-list">
                {identityFields.map((field) => (
                  <button key={field} type="button" aria-pressed={settings.identityFields.includes(field)} onClick={() => toggleIdentity(field)}>{field}</button>
                ))}
              </div>
            </Field>
            <div className="config-grid-two">
              <Field label="考号版式">
                <MetisSelect
                  value={settings.candidateNumberLayout}
                  options={[{ value: 'fill', label: '填涂' }, { value: 'barcode', label: '条形码' }, { value: 'handwrite', label: '手写' }]}
                  onChange={(value) => props.onSettingsChange({ candidateNumberLayout: value as AnswerSheetSettings['candidateNumberLayout'], ...(value === 'barcode' ? { showBarcode: false } : {}) })}
                />
              </Field>
              <Field label="考号类型">
                <MetisSelect
                  value={settings.candidateNumberType}
                  options={['准考证号', '学籍号', '学号', '考号'].map((value) => ({ value, label: value }))}
                  onChange={(value) => props.onSettingsChange({ candidateNumberType: value as AnswerSheetSettings['candidateNumberType'] })}
                />
              </Field>
              <Field label="考号位数">
                <MetisInputNumber className="config-number" value={settings.candidateNumberDigits} min={4} max={18} addonAfter="位" onChange={(value) => props.onSettingsChange({ candidateNumberDigits: Number(value ?? 10) })} />
              </Field>
            </div>
            <ToggleField
              title="附加条形码粘贴区"
              description={settings.candidateNumberLayout === 'barcode' ? '条形码版式已自带粘贴区' : '可与填涂或手写考号并存'}
              checked={settings.showBarcode || settings.candidateNumberLayout === 'barcode'}
              disabled={settings.candidateNumberLayout === 'barcode'}
              onChange={(checked) => props.onSettingsChange({ showBarcode: checked })}
            />
          </div>
        </section>

        <section className="config-flat-section">
          <div className="config-flat-title">显示设置</div>
          <div className="display-settings-row">
            <ToggleField title="注意事项" checked={settings.showNotice} onChange={(checked) => props.onSettingsChange({ showNotice: checked })} />
            <ToggleField title="分值展示" checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showScore)} onChange={props.onScoreVisibilityChange} />
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
