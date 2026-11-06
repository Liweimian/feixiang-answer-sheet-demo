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

function initialScores(block: AnswerBlock): Record<string, number> {
  const numbers = questionNumbers(block.range)
  if (!numbers.length) return {}
  const total = block.score ?? 0
  const unitScore = Number((total / numbers.length).toFixed(2))
  const distributed = Object.fromEntries(numbers.map((number, index) => [String(number), index === numbers.length - 1 ? Number((total - unitScore * (numbers.length - 1)).toFixed(2)) : unitScore]))
  if (!block.questionScores) return distributed
  return Object.fromEntries(numbers.map((number) => [String(number), block.questionScores?.[String(number)] ?? distributed[String(number)]]))
}

export function ScoreSettingsDialog({ open, block, onClose, onSave }: ScoreSettingsDialogProps) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [batchScore, setBatchScore] = useState(0)
  const numbers = useMemo(() => questionNumbers(block?.range), [block?.range])

  useEffect(() => {
    if (!open || !block) return
    const next = initialScores(block)
    setScores(next)
    setBatchScore(numbers.length ? next[String(numbers[0])] ?? 0 : 0)
  }, [block, numbers, open])

  if (!block) return null
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const applyBatch = () => setScores(Object.fromEntries(numbers.map((number) => [String(number), batchScore])))
  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={onClose}>取消</MetisButton>
    <MetisButton type="primary" onClick={() => onSave(block.id, scores)}>保存分值</MetisButton>
  </div>

  return <MetisDialog open={open} title="分值设置" width={640} footer={footer} onCancel={onClose}>
    <div className="score-settings-dialog">
      <header>
        <div><strong>{block.title}</strong><span>共 {numbers.length} 小题，当前共 {Number(total.toFixed(2))} 分</span></div>
        <label><span>批量设为</span><MetisInputNumber value={batchScore} min={0} max={100} precision={2} controls={false} addonAfter="分" aria-label="批量分值" onChange={(value) => setBatchScore(Number(value ?? 0))} /><MetisButton type="bordered" onClick={applyBatch}>应用全部</MetisButton></label>
      </header>
      <div className="score-question-grid">
        {numbers.map((number) => <label key={number} className="score-question-item">
          <b>{number}.</b>
          <MetisInputNumber value={scores[String(number)] ?? 0} min={0} max={100} precision={2} controls={false} addonAfter="分" aria-label={`第${number}题分值`} onChange={(value) => setScores((current) => ({ ...current, [String(number)]: Number(value ?? 0) }))} />
        </label>)}
      </div>
    </div>
  </MetisDialog>
}
