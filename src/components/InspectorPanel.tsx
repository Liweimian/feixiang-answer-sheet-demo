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
import type { AnswerBlock, AnswerBlockKind, CardMode, RulePack } from '../features/answer-sheet/types'

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
  { kind: 'forbidden', label: '禁答区' },
  { kind: 'drawing', label: '作图区' },
  { kind: 'table', label: '表格区' },
  { kind: 'notice', label: '说明文字' },
]

export function InspectorPanel(props: InspectorPanelProps) {
  const { block } = props
  const locked = props.mode === 'standard' && Boolean(block?.locked)

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
              disabled={locked || block.kind === 'objective'}
              options={Object.entries(blockKindLabels).map(([value, label]) => ({ value, label }))}
              onChange={(value) => props.onUpdate({ kind: value as AnswerBlockKind })}
            />
          </label>
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
            <MetisButton type="borderless" danger icon={<Trash2 size={14} />} disabled={locked || block.kind === 'objective'} onClick={props.onDelete}>删除</MetisButton>
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
