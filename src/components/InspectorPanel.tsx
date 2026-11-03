import {
  MetisAlert,
  MetisButton,
  MetisInput,
  MetisInputNumber,
  MetisSelect,
  MetisSwitch,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import { ArrowDown, ArrowUp, LockKeyhole, Plus, Trash2 } from 'lucide-react'
import { blockKindLabels } from '../data/mockPaper'
import { isQuestionBlockKind, type AnswerBlock, type AnswerBlockKind, type CardMode, type RulePack } from '../features/answer-sheet/types'

interface InspectorPanelProps {
  block?: AnswerBlock
  mode: CardMode
  rulePack: RulePack
  onUpdate: (patch: Partial<AnswerBlock>) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onAdd: (kind: AnswerBlockKind) => void
}

const addableKinds: Array<{ kind: AnswerBlockKind; label: string }> = [
  { kind: 'objective', label: '客观题' },
  { kind: 'short-answer', label: '短答题' },
  { kind: 'essay', label: '作文题' },
  { kind: 'forbidden', label: '禁答区' },
  { kind: 'drawing', label: '作图区' },
  { kind: 'table', label: '表格区' },
  { kind: 'notice', label: '说明文字' },
]

export function InspectorPanel(props: InspectorPanelProps) {
  const { block } = props
  const locked = props.mode === 'standard' && Boolean(block?.locked)
  const questionBlock = block && isQuestionBlockKind(block.kind)

  return (
    <aside className="inspector-panel" data-sec="6">
      <div className="inspector-heading">
        <div><strong>区域设置</strong><span>{block ? blockKindLabels[block.kind] : '请选择题块'}</span></div>
        {locked && <MetisTag preset="warning"><LockKeyhole size={11} /> 锁定</MetisTag>}
      </div>

      {block ? (
        <div className="inspector-fields">
          {locked && (
            <MetisAlert type="info" showIcon message="规范区域不可自由修改" description="为保证扫描安全，只能移动或复制普通题目作答区。" />
          )}
          <label>
            <span>区域标题</span>
            <MetisInput value={block.title} disabled={locked} onChange={(event) => props.onUpdate({ title: event.target.value })} />
          </label>
          <label>
            <span>作答区类型</span>
            <MetisSelect
              value={block.kind}
              disabled={locked}
              options={Object.entries(blockKindLabels).map(([value, label]) => ({ value, label }))}
              onChange={(value) => props.onUpdate({ kind: value as AnswerBlockKind })}
            />
          </label>
          {questionBlock && (
            <div className="inspector-field-grid inspector-question-fields">
              <label>
                <span>题号范围</span>
                <MetisInput
                  value={block.range ?? ''}
                  placeholder="如 1–20"
                  disabled={locked}
                  onChange={(event) => props.onUpdate({ range: event.target.value })}
                />
              </label>
              <label>
                <span>区域分值</span>
                <MetisInputNumber
                  className="inspector-number-input"
                  value={block.score}
                  min={0}
                  max={300}
                  disabled={locked}
                  addonAfter="分"
                  onChange={(value) => props.onUpdate({ score: Number(value ?? 0) })}
                />
              </label>
            </div>
          )}
          {block.kind === 'objective' && (
            <div className="inspector-field-grid inspector-question-fields">
              <label>
                <span>选项数量</span>
                <MetisSelect
                  value={block.optionCount ?? 4}
                  disabled={locked}
                  options={[
                    { value: 4, label: 'A–D（4 个）' },
                    { value: 5, label: 'A–E（5 个）' },
                  ]}
                  onChange={(value) => props.onUpdate({ optionCount: Number(value) as 4 | 5 })}
                />
              </label>
              <label>
                <span>每栏建议题数</span>
                <MetisInputNumber
                  className="inspector-number-input"
                  value={block.itemsPerColumn ?? 11}
                  min={4}
                  max={20}
                  disabled={locked}
                  addonAfter="题"
                  onChange={(value) => props.onUpdate({ itemsPerColumn: Number(value ?? 11) })}
                />
              </label>
            </div>
          )}
          <div className="inspector-field-grid">
            <label>
              <span>区域高度</span>
              <MetisInputNumber
                className="inspector-number-input"
                value={block.height}
                min={48}
                max={360}
                step={8}
                disabled={locked}
                addonAfter="px"
                onChange={(value) => props.onUpdate({ height: Number(value ?? block.height) })}
              />
            </label>
            {(block.kind === 'short-answer' || block.kind === 'essay') && (
              <label>
                <span>书写行数</span>
                <MetisInputNumber
                  className="inspector-number-input"
                  value={block.lineCount ?? 4}
                  min={1}
                  max={20}
                  disabled={locked}
                  onChange={(value) => props.onUpdate({ lineCount: Number(value ?? 4) })}
                />
              </label>
            )}
          </div>
          <label className="switch-field">
            <span><b>展示分值</b><small>在题目标题后显示本题分值</small></span>
            <MetisSwitch checked={block.showScore} disabled={locked} onChange={(checked) => props.onUpdate({ showScore: checked })} />
          </label>
          {block.hint && <div className="block-hint">{block.hint}</div>}
          <div className="block-actions">
            <MetisButton type="bordered" icon={<ArrowUp size={14} />} disabled={locked} onClick={() => props.onMove(-1)}>上移</MetisButton>
            <MetisButton type="bordered" icon={<ArrowDown size={14} />} disabled={locked} onClick={() => props.onMove(1)}>下移</MetisButton>
            <MetisButton type="borderless" danger icon={<Trash2 size={14} />} disabled={locked} onClick={props.onDelete}>删除</MetisButton>
          </div>
        </div>
      ) : <div className="inspector-empty">在画布或左侧题目树中选择一个区域。</div>}

      <section className="quick-add">
        <div><strong>插入区域</strong><span>添加到当前页底部</span></div>
        <div>
          {addableKinds.map((item) => (
            <MetisButton key={item.kind} type="bordered" size="s" icon={<Plus size={13} />} onClick={() => props.onAdd(item.kind)}>
              {item.label}
            </MetisButton>
          ))}
        </div>
      </section>

      {props.mode === 'standard' && (
        <section className="rule-pack-card">
          <span>当前规则包</span>
          <strong>{props.rulePack.name}</strong>
          <p>{props.rulePack.description}</p>
          <small>{props.rulePack.evidenceLabel} · {props.rulePack.paperSize} · {props.rulePack.pageCount} 面</small>
        </section>
      )}
    </aside>
  )
}
