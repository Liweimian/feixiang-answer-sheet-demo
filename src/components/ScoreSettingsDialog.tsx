import { useEffect, useMemo, useState } from 'react'
import { MetisButton, MetisDialog, MetisInputNumber } from '@yuanfudao/metis-web-component'
import type { AnswerBlock } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'

interface ScoreSettingsDialogProps {
  open: boolean
  block?: AnswerBlock
  onClose: () => void
  onSave: (blockId: string, scores: Record<string, number>) => void
}

interface ScoreItem { key: string; label: string; ariaLabel: string }
interface ScoreGroup { number: number; items: ScoreItem[]; nested: boolean }

function buildGroups(block?: AnswerBlock): ScoreGroup[] {
  if (!block) return []
  return questionNumbers(block.range).map((number, questionIndex) => {
    const explicitSlots = block.answerSlotNumbers?.[questionIndex]
    const configuredSlotCount = block.answerSlotCounts?.[questionIndex]
    const slotCount = Math.max(1, configuredSlotCount ?? 1)
    const slotNumbers = explicitSlots?.length ? explicitSlots : Array.from({ length: slotCount }, (_, index) => index + 1)
    const slotLabels = block.answerSlotLabels?.[questionIndex]
    const nested = Boolean(explicitSlots?.length || (configuredSlotCount != null && configuredSlotCount > 0))
    return {
      number,
      nested,
      items: nested
        ? slotNumbers.map((slotNumber, slotIndex) => ({ key: `${number}.${slotNumber}`, label: `题${slotLabels?.[slotIndex] ?? `(${slotNumber})`}`, ariaLabel: `第${number}题${slotLabels?.[slotIndex] ?? `第${slotNumber}小题`}分值` }))
        : [{ key: String(number), label: `题${number}`, ariaLabel: `第${number}题分值` }],
    }
  })
}

function initialScores(block: AnswerBlock, groups: ScoreGroup[]): Record<string, number> {
  const items = groups.flatMap((group) => group.items)
  if (!items.length) return {}
  const total = block.score ?? 0
  const unitScore = Number((total / items.length).toFixed(2))
  const distributed = Object.fromEntries(items.map((item, index) => [item.key, index === items.length - 1 ? Number((total - unitScore * (items.length - 1)).toFixed(2)) : unitScore]))
  if (!block.questionScores) return distributed
  return Object.fromEntries(items.map((item) => [item.key, block.questionScores?.[item.key] ?? distributed[item.key]]))
}

export function ScoreSettingsDialog({ open, block, onClose, onSave }: ScoreSettingsDialogProps) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [batchScore, setBatchScore] = useState(0)
  const [groupBatchScores, setGroupBatchScores] = useState<Record<string, number>>({})
  const groups = useMemo(() => buildGroups(block), [block])
  const items = useMemo(() => groups.flatMap((group) => group.items), [groups])
  const nested = groups.some((group) => group.nested)
  const nestedItemCount = groups.reduce((sum, group) => sum + (group.nested ? group.items.length : 0), 0)

  useEffect(() => {
    if (!open || !block) return
    const next = initialScores(block, groups)
    setScores(next)
    setBatchScore(items.length ? next[items[0].key] ?? 0 : 0)
    setGroupBatchScores(Object.fromEntries(groups.map((group) => [String(group.number), next[group.items[0]?.key] ?? 0])))
  }, [block, groups, items, open])

  if (!block) return null
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const setAllScores = (value: number) => {
    setBatchScore(value)
    setScores(Object.fromEntries(items.map((item) => [item.key, value])))
  }
  const setGroupScores = (group: ScoreGroup, value: number) => {
    setGroupBatchScores((current) => ({ ...current, [String(group.number)]: value }))
    setScores((current) => ({ ...current, ...Object.fromEntries(group.items.map((item) => [item.key, value])) }))
  }
  const scoreInput = (item: ScoreItem) => <label key={item.key} className="score-question-item">
    <b>{item.label}</b>
    <MetisInputNumber value={scores[item.key] ?? 0} min={0} max={100} precision={2} controls={false} addonAfter="分" aria-label={item.ariaLabel} onChange={(value) => setScores((current) => ({ ...current, [item.key]: Number(value ?? 0) }))} />
  </label>
  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={onClose}>取消</MetisButton>
    <MetisButton type="primary" onClick={() => onSave(block.id, scores)}>保存分值</MetisButton>
  </div>

  return <MetisDialog open={open} title="分值设置" width={680} footer={footer} onCancel={onClose}>
    <div className="score-settings-dialog">
      <header className="score-section-heading">
        <div><strong>{block.title}</strong><span>（共 {groups.length} 题{nested ? ` / ${nestedItemCount} 小题` : ''}）　|　共 {Number(total.toFixed(2))} 分</span></div>
        <span className="score-collapse-mark">▴</span>
      </header>
      <label className="score-batch-row"><span>每题</span><MetisInputNumber value={batchScore} min={0} max={100} precision={2} controls={false} placeholder="输入分数" addonAfter="分" aria-label="批量分值" onChange={(value) => setAllScores(Number(value ?? 0))} /></label>
      {nested ? <div className="score-major-list">
        {groups.map((group) => <section key={group.number} className="score-major-group">
          <header>
            <div><span className="score-group-arrow">▾</span><strong>题 {group.number}</strong><span>{group.nested ? `（共 ${group.items.length} 小题）　|　` : '|　'}共 {Number(group.items.reduce((sum, item) => sum + (scores[item.key] ?? 0), 0).toFixed(2))} 分</span></div>
            {group.nested && <label><span>每小题</span><MetisInputNumber value={groupBatchScores[String(group.number)] ?? 0} min={0} max={100} precision={2} controls={false} placeholder="输入分数" aria-label={`第${group.number}题批量分值`} onChange={(value) => setGroupScores(group, Number(value ?? 0))} /></label>}
          </header>
          <div className="score-question-grid">{group.items.map(scoreInput)}</div>
        </section>)}
      </div> : <div className="score-question-grid is-flat">{items.map(scoreInput)}</div>}
    </div>
  </MetisDialog>
}
