import { useEffect, useMemo, useState } from 'react'
import { MetisButton, MetisCheckbox, MetisDialog } from '@yuanfudao/metis-web-component'
import type { AnswerBlock } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'

interface ObjectiveAnswerDialogProps {
  open: boolean
  blocks: AnswerBlock[]
  onClose: () => void
  onSave: (answers: Record<string, Record<string, string[]>>) => void
}

export function ObjectiveAnswerDialog(props: ObjectiveAnswerDialogProps) {
  const objectiveBlocks = useMemo(() => props.blocks.filter((block) => block.kind === 'objective'), [props.blocks])
  const [answers, setAnswers] = useState<Record<string, Record<string, string[]>>>({})

  useEffect(() => {
    if (!props.open) return
    setAnswers(Object.fromEntries(objectiveBlocks.map((block) => [block.id, structuredClone(block.objectiveAnswers ?? {})])))
  }, [objectiveBlocks, props.open])

  const toggle = (blockId: string, number: number, option: string, checked: boolean) => setAnswers((current) => {
    const blockAnswers = { ...(current[blockId] ?? {}) }
    const selected = new Set(blockAnswers[String(number)] ?? [])
    if (checked) selected.add(option); else selected.delete(option)
    blockAnswers[String(number)] = [...selected].sort()
    return { ...current, [blockId]: blockAnswers }
  })

  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
    <MetisButton type="primary" disabled={!objectiveBlocks.length} onClick={() => props.onSave(answers)}>保存答案</MetisButton>
  </div>

  return <MetisDialog open={props.open} title="设置客观题答案" width={720} footer={footer} onCancel={props.onClose}>
    <div className="objective-answer-dialog">
      {!objectiveBlocks.length && <div className="objective-answer-empty">当前答题卡没有客观题题组</div>}
      {objectiveBlocks.map((block) => <section key={block.id} className="objective-answer-group">
        <header><strong>{block.title}</strong><span>{block.range ? `题号 ${block.range}` : '未设置题号'}</span></header>
        <div className="objective-answer-grid">
          {questionNumbers(block.range).map((number) => <div key={number} className="objective-answer-row">
            <b>{number}</b>
            {(block.objectiveMode === 'judge' ? ['T', 'F'] : Array.from({ length: block.optionCount ?? 4 }, (_, index) => String.fromCharCode(65 + index))).map((option) => <MetisCheckbox key={option} checked={(answers[block.id]?.[String(number)] ?? []).includes(option)} onChange={(event) => toggle(block.id, number, option, event.target.checked)}>{option}</MetisCheckbox>)}
          </div>)}
        </div>
      </section>)}
    </div>
  </MetisDialog>
}
