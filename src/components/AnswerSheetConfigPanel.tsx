import { useState } from 'react'
import {
  MetisButton,
  MetisInput,
  MetisInputNumber,
  MetisSelect,
  MetisSwitch,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import {
  ArrowDown,
  ArrowUp,
  Combine,
  GripVertical,
  ListRestart,
  Plus,
  Scissors,
  Trash2,
} from 'lucide-react'
import { blockKindLabels } from '../data/mockPaper'
import {
  isQuestionBlockKind,
  type AnswerBlock,
  type AnswerBlockKind,
  type AnswerSheetDocument,
  type AnswerSheetSettings,
  type ContentElement,
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
  onMove: (direction: -1 | 1) => void
  onReorder: (dragId: string, targetId: string) => void
  onDelete: () => void
  onAdd: (kind: AnswerBlockKind) => void
  onRenumber: (start: number) => void
  onSplit: () => void
  onMerge: () => void
  onConsolidate: (kind: 'objective' | 'subjective') => void
  onMergeObjectiveModules: () => void
}

const identityFields: IdentityField[] = ['学校', '姓名', '班级', '学号', '准考证号', '考场号', '座位号']
const addableKinds: AnswerBlockKind[] = ['objective', 'short-answer', 'essay', 'mixed', 'drawing', 'table', 'forbidden', 'notice']
const contentElements: Array<{ value: ContentElement; label: string }> = [
  { value: 'table', label: '表格' },
  { value: 'formula', label: '公式' },
  { value: 'image', label: '图片' },
]

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
  const locked = document.mode === 'standard' && Boolean(selected?.locked)
  const questionBlock = selected && isQuestionBlockKind(selected.kind)
  const [addKind, setAddKind] = useState<AnswerBlockKind>('short-answer')
  const [renumberStart, setRenumberStart] = useState(1)
  const [draggingId, setDraggingId] = useState('')

  const toggleIdentity = (field: IdentityField) => {
    const next = settings.identityFields.includes(field)
      ? settings.identityFields.filter((item) => item !== field)
      : [...settings.identityFields, field]
    props.onSettingsChange({ identityFields: next })
  }

  const toggleContentElement = (element: ContentElement) => {
    if (!selected) return
    const current = selected.contentElements ?? []
    props.onUpdateBlock({
      contentElements: current.includes(element)
        ? current.filter((item) => item !== element)
        : [...current, element],
    })
  }

  return (
    <aside className="answer-sheet-config" data-sec="4">
      <div className="config-panel-head">
        <div><strong>答题卡配置</strong></div>
        <MetisTag preset="primary">{blocks.length} 个题块</MetisTag>
      </div>

      <div className="config-scroll">
        <details className="config-section" open>
          <summary><span>页面布局</span></summary>
          <div className="config-section-body config-grid-two">
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
        </details>

        <details className="config-section">
          <summary><span>考生信息</span></summary>
          <div className="config-section-body">
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
        </details>

        <details className="config-section" open>
          <summary><span>显示设置</span></summary>
          <div className="config-section-body display-settings-row">
            <ToggleField title="注意事项" checked={settings.showNotice} onChange={(checked) => props.onSettingsChange({ showNotice: checked })} />
            <ToggleField title="分值展示" checked={blocks.filter((block) => isQuestionBlockKind(block.kind)).every((block) => block.showScore)} onChange={props.onScoreVisibilityChange} />
          </div>
        </details>

        <details className="config-section config-block-section" open>
          <summary><span>题目结构</span></summary>
          <div className="config-section-body">
            <div className="config-page-tabs">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" className={props.activePage === page ? 'active' : ''} onClick={() => props.onPageChange(page)}>第 {page} 面</button>
              ))}
            </div>
            <div className="structure-tools">
              <div><MetisInputNumber value={renumberStart} min={1} max={999} onChange={(value) => setRenumberStart(Number(value ?? 1))} /><MetisButton type="bordered" size="s" icon={<ListRestart size={13} />} onClick={() => props.onRenumber(renumberStart)}>连续编号</MetisButton></div>
              <div><MetisButton type="borderless" size="s" onClick={() => props.onConsolidate('objective')}>集中客观题</MetisButton><MetisButton type="borderless" size="s" onClick={() => props.onConsolidate('subjective')}>集中主观题</MetisButton></div>
              <MetisButton type="bordered" size="s" icon={<Combine size={13} />} onClick={props.onMergeObjectiveModules}>合并客观题模块</MetisButton>
            </div>
            <div className="config-block-list">
              {blocks.filter((block) => block.page === props.activePage).map((block) => (
                <div
                  key={block.id}
                  className={`config-block-row ${block.id === props.selectedBlockId ? 'selected' : ''}`}
                  draggable={!block.locked}
                  onDragStart={() => setDraggingId(block.id)}
                  onDragEnd={() => setDraggingId('')}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingId) props.onReorder(draggingId, block.id)
                    setDraggingId('')
                  }}
                >
                  <GripVertical size={14} />
                  <button type="button" onClick={() => props.onSelect(block.id)}><b>{block.title}</b><small>{blockKindLabels[block.kind]}{block.range ? ` · ${block.range}` : ''}</small></button>
                </div>
              ))}
              {!blocks.some((block) => block.page === props.activePage) && <div className="config-empty-blocks">当前页暂无题块</div>}
            </div>
            <div className="config-add-row">
              <MetisSelect value={addKind} options={addableKinds.map((kind) => ({ value: kind, label: blockKindLabels[kind] }))} onChange={(value) => setAddKind(value as AnswerBlockKind)} />
              <MetisButton type="primary" size="s" icon={<Plus size={13} />} onClick={() => props.onAdd(addKind)}>添加到本页</MetisButton>
            </div>
          </div>
        </details>

        {selected && (
          <details className="config-section config-selected-section" open>
            <summary><span>所选题块</span></summary>
            <div className="config-section-body">
              {locked && <div className="config-lock-tip">大考规范锁定区域不可修改</div>}
              <Field label="模块标题"><MetisInput value={selected.title} disabled={locked} onChange={(event) => props.onUpdateBlock({ title: event.target.value })} /></Field>
              <div className="config-grid-two">
                <Field label="题块类型">
                  <MetisSelect value={selected.kind} disabled={locked} options={addableKinds.map((kind) => ({ value: kind, label: blockKindLabels[kind] }))} onChange={(value) => props.onUpdateBlock({ kind: value as AnswerBlockKind })} />
                </Field>
                <Field label="所在页面">
                  <MetisSelect value={selected.page} disabled={locked} options={Array.from({ length: pageCount }, (_, index) => ({ value: index + 1, label: `第 ${index + 1} 面` }))} onChange={(value) => props.onUpdateBlock({ page: Number(value) })} />
                </Field>
                {questionBlock && <Field label="题号范围" hint="支持 1–10，12–20 跳号"><MetisInput value={selected.range ?? ''} disabled={locked} placeholder="如 1–20" onChange={(event) => props.onUpdateBlock({ range: event.target.value })} /></Field>}
                {questionBlock && <Field label="区域分值"><MetisInputNumber className="config-number" value={selected.score} min={0} max={300} disabled={locked} addonAfter="分" onChange={(value) => props.onUpdateBlock({ score: Number(value ?? 0) })} /></Field>}
                <Field label="区域高度"><MetisInputNumber className="config-number" value={selected.height} min={48} max={620} step={8} disabled={locked} addonAfter="px" onChange={(value) => props.onUpdateBlock({ height: Number(value ?? selected.height) })} /></Field>
                {(selected.kind === 'short-answer' || selected.kind === 'essay' || selected.kind === 'mixed') && <Field label="作答行数"><MetisInputNumber className="config-number" value={selected.lineCount ?? 4} min={1} max={30} disabled={locked} onChange={(value) => props.onUpdateBlock({ lineCount: Number(value ?? 4) })} /></Field>}
              </div>

              {(selected.kind === 'objective' || selected.kind === 'mixed') && (
                <div className="config-grid-two">
                  <Field label="客观题布局"><MetisSelect value={selected.objectiveLayout ?? 'horizontal'} disabled={locked} options={[{ value: 'horizontal', label: '横向排列' }, { value: 'vertical', label: '竖向排列' }, { value: 'merged', label: '合并排列' }]} onChange={(value) => props.onUpdateBlock({ objectiveLayout: value as AnswerBlock['objectiveLayout'] })} /></Field>
                  <Field label="选项数量"><MetisSelect value={selected.optionCount ?? 4} disabled={locked} options={[{ value: 4, label: 'A–D' }, { value: 5, label: 'A–E' }]} onChange={(value) => props.onUpdateBlock({ optionCount: Number(value) as 4 | 5 })} /></Field>
                  <Field label="每栏题数"><MetisInputNumber className="config-number" value={selected.itemsPerColumn ?? 11} min={4} max={30} disabled={locked} onChange={(value) => props.onUpdateBlock({ itemsPerColumn: Number(value ?? 11) })} /></Field>
                </div>
              )}

              {(selected.kind === 'short-answer' || selected.kind === 'essay' || selected.kind === 'mixed') && (
                <div className="config-grid-two">
                  <Field label="作答样式"><MetisSelect value={selected.responseStyle ?? 'lines'} disabled={locked} options={[{ value: 'lines', label: '横线' }, { value: 'grid', label: '作文方格' }, { value: 'bracket', label: '括号' }, { value: 'square', label: '方块' }, { value: 'blank', label: '留白' }]} onChange={(value) => props.onUpdateBlock({ responseStyle: value as AnswerBlock['responseStyle'] })} /></Field>
                  <Field label="线条样式"><MetisSelect value={selected.lineStyle ?? 'solid'} disabled={locked || selected.responseStyle !== 'lines'} options={[{ value: 'solid', label: '实线' }, { value: 'dashed', label: '虚线' }]} onChange={(value) => props.onUpdateBlock({ lineStyle: value as AnswerBlock['lineStyle'] })} /></Field>
                </div>
              )}

              <ToggleField title="标题显示分值" description="关闭后不会残留题数文字" checked={selected.showScore} disabled={locked} onChange={(checked) => props.onUpdateBlock({ showScore: checked, showQuestionCount: checked ? selected.showQuestionCount : false })} />
              {questionBlock && <ToggleField title="显示题数" description="例如“共 20 题”；关闭分值后一并隐藏" checked={Boolean(selected.showScore && selected.showQuestionCount)} disabled={locked || !selected.showScore} onChange={(checked) => props.onUpdateBlock({ showQuestionCount: checked })} />}
              {questionBlock && <ToggleField title="评分栏 / 打分框" checked={Boolean(selected.showScoreBox)} disabled={locked} onChange={(checked) => props.onUpdateBlock({ showScoreBox: checked })} />}
              {selected.showScoreBox && <Field label="评分步长"><MetisInputNumber className="config-number" value={selected.scoreStep ?? 1} min={0.5} max={10} step={0.5} disabled={locked} addonAfter="分" onChange={(value) => props.onUpdateBlock({ scoreStep: Number(value ?? 1) })} /></Field>}
              <Field label="自定义文字"><textarea rows={2} value={selected.contentText ?? ''} disabled={locked} placeholder="可加入作答说明或题内文字" onChange={(event) => props.onUpdateBlock({ contentText: event.target.value })} /></Field>
              <Field label="插入内容">
                <div className="config-chip-list">
                  {contentElements.map((element) => <button key={element.value} type="button" disabled={locked} aria-pressed={selected.contentElements?.includes(element.value)} onClick={() => toggleContentElement(element.value)}>{element.label}</button>)}
                </div>
              </Field>
              <div className="selected-block-actions">
                <MetisButton type="bordered" size="s" icon={<ArrowUp size={13} />} disabled={locked} onClick={() => props.onMove(-1)}>上移</MetisButton>
                <MetisButton type="bordered" size="s" icon={<ArrowDown size={13} />} disabled={locked} onClick={() => props.onMove(1)}>下移</MetisButton>
                <MetisButton type="bordered" size="s" icon={<Scissors size={13} />} disabled={locked || !questionBlock} onClick={props.onSplit}>分割</MetisButton>
                <MetisButton type="bordered" size="s" icon={<Combine size={13} />} disabled={locked || !questionBlock} onClick={props.onMerge}>合并</MetisButton>
                <MetisButton type="borderless" size="s" danger icon={<Trash2 size={13} />} disabled={locked} onClick={props.onDelete}>删除</MetisButton>
              </div>
            </div>
          </details>
        )}
      </div>
    </aside>
  )
}
