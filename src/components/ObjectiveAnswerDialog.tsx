import { useEffect, useMemo, useRef, useState } from 'react'
import { MetisButton, MetisCheckbox, MetisDialog, MetisInput } from '@yuanfudao/metis-web-component'
import { CheckCircle2, FileImage, FileText, ScanText, Upload } from 'lucide-react'
import type { AnswerBlock } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'

export interface AnswerDialogValue {
  objectiveAnswers: Record<string, string[]>
  referenceAnswers: Record<string, string>
}

interface ObjectiveAnswerDialogProps {
  open: boolean
  blocks: AnswerBlock[]
  onClose: () => void
  onSave: (answers: Record<string, AnswerDialogValue>) => void
}

export function ObjectiveAnswerDialog(props: ObjectiveAnswerDialogProps) {
  const answerBlocks = useMemo(() => props.blocks.filter((block) => block.questionGroupDraft && block.questionGroupDraft.type !== 'essay'), [props.blocks])
  const [answers, setAnswers] = useState<Record<string, AnswerDialogValue>>({})
  const [ocrState, setOcrState] = useState<'idle' | 'recognizing' | 'done'>('idle')
  const [ocrFile, setOcrFile] = useState<{ name: string; preview: string; image: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!props.open) return
    setAnswers(Object.fromEntries(answerBlocks.map((block) => [block.id, {
      objectiveAnswers: structuredClone(block.objectiveAnswers ?? {}),
      referenceAnswers: structuredClone(block.referenceAnswers ?? {}),
    }])))
    setOcrState('idle')
    setOcrFile((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview)
      return null
    })
  }, [answerBlocks, props.open])

  useEffect(() => () => {
    if (ocrFile?.preview) URL.revokeObjectURL(ocrFile.preview)
  }, [ocrFile])

  const toggle = (blockId: string, number: number, option: string, checked: boolean) => setAnswers((current) => {
    const blockValue = current[blockId] ?? { objectiveAnswers: {}, referenceAnswers: {} }
    const objectiveAnswers = { ...blockValue.objectiveAnswers }
    const selected = new Set(objectiveAnswers[String(number)] ?? [])
    if (checked) selected.add(option); else selected.delete(option)
    objectiveAnswers[String(number)] = [...selected].sort()
    return { ...current, [blockId]: { ...blockValue, objectiveAnswers } }
  })

  const updateReferenceAnswer = (blockId: string, key: string, value: string) => setAnswers((current) => {
    const blockValue = current[blockId] ?? { objectiveAnswers: {}, referenceAnswers: {} }
    return { ...current, [blockId]: { ...blockValue, referenceAnswers: { ...blockValue.referenceAnswers, [key]: value } } }
  })

  const fillOcrDemoResult = () => setAnswers((current) => Object.fromEntries(answerBlocks.map((block) => {
    const previous = current[block.id] ?? { objectiveAnswers: {}, referenceAnswers: {} }
    const numbers = questionNumbers(block.range)
    if (block.kind === 'objective') {
      const objectiveAnswers = { ...previous.objectiveAnswers }
      numbers.forEach((number, index) => {
        if (objectiveAnswers[String(number)]?.length) return
        if (block.objectiveMode === 'judge') objectiveAnswers[String(number)] = [index % 2 === 0 ? 'T' : 'F']
        else if (block.objectiveMode === 'multiple') objectiveAnswers[String(number)] = [index % 2 === 0 ? 'A' : 'B', index % 3 === 0 ? 'C' : 'D'].sort()
        else objectiveAnswers[String(number)] = [String.fromCharCode(65 + index % Math.max(1, block.optionCount ?? 4))]
      })
      return [block.id, { ...previous, objectiveAnswers }]
    }
    const referenceAnswers = { ...previous.referenceAnswers }
    numbers.forEach((number, questionIndex) => {
      const slotCount = block.answerSlotCounts?.[questionIndex] ?? 0
      const keys = slotCount ? Array.from({ length: slotCount }, (_, index) => `${number}.${index + 1}`) : [String(number)]
      keys.forEach((key) => {
        if (!referenceAnswers[key]) referenceAnswers[key] = block.answerVariant === 'fill' ? `OCR识别答案${key}` : `OCR识别的第${key}题参考答案，请核对后修改。`
      })
    })
    return [block.id, { ...previous, referenceAnswers }]
  })))

  const recognizeFile = (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    const supported = file.type.startsWith('image/') || file.type === 'application/pdf' || ['doc', 'docx'].includes(extension ?? '')
    if (!supported) return
    setOcrFile((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview)
      return { name: file.name || '粘贴的答案图片.png', preview: URL.createObjectURL(file), image: file.type.startsWith('image/') }
    })
    setOcrState('recognizing')
    window.setTimeout(() => {
      fillOcrDemoResult()
      setOcrState('done')
    }, 900)
  }

  useEffect(() => {
    if (!props.open) return
    const pasteAnswerFile = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      const file = [...(event.clipboardData?.files ?? [])][0]
        ?? [...(event.clipboardData?.items ?? [])].find((item) => item.kind === 'file')?.getAsFile()
      if (!file) return
      event.preventDefault()
      recognizeFile(file)
    }
    window.addEventListener('paste', pasteAnswerFile)
    return () => window.removeEventListener('paste', pasteAnswerFile)
  }, [props.open, answerBlocks])

  const footer = <div className="dialog-footer-actions">
    <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
    <MetisButton type="primary" disabled={!answerBlocks.length} onClick={() => props.onSave(answers)}>保存答案</MetisButton>
  </div>

  return <MetisDialog open={props.open} title="设置答案" width={900} footer={footer} onCancel={props.onClose}>
    <div className="objective-answer-dialog">
      {!!answerBlocks.length && <section className="answer-ocr-panel" tabIndex={0} aria-label="上传或粘贴答案文件">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => { recognizeFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
        <div className="answer-ocr-copy">
          <span className="answer-ocr-icon"><ScanText size={20} /></span>
          <div><strong>上传或粘贴答案，自动识别</strong><p>支持 JPG、PNG、Word、PDF；也可直接 Ctrl/Cmd+V 粘贴剪贴板图片。</p></div>
        </div>
        {ocrFile ? <div className="answer-ocr-file">
          {ocrFile.image ? <img src={ocrFile.preview} alt="待识别答案" /> : <span className="answer-ocr-document"><FileText size={20} /></span>}
          <span>{ocrFile.image ? <FileImage size={14} /> : <FileText size={14} />}{ocrFile.name}</span>
          <em className={`state-${ocrState}`}>{ocrState === 'recognizing' ? '正在OCR识别…' : <><CheckCircle2 size={13} />已识别，请核对</>}</em>
          <MetisButton size="s" type="borderless" onClick={() => fileInputRef.current?.click()}>重新上传</MetisButton>
        </div> : <MetisButton type="primary" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>上传文件识别</MetisButton>}
      </section>}
      {!answerBlocks.length && <div className="objective-answer-empty">当前答题卡还没有可设置答案的题组</div>}
      {answerBlocks.map((block) => {
        const objective = block.kind === 'objective'
        const numbers = questionNumbers(block.range)
        return <section key={block.id} className="objective-answer-group">
          <header><strong>{block.title}</strong><span>{block.range ? `题号 ${block.range}` : '未设置题号'}</span></header>
          {objective ? <div className="objective-answer-grid">
            {numbers.map((number) => <div key={number} className="objective-answer-row">
              <b>{number}</b>
              {(block.objectiveMode === 'judge' ? ['T', 'F'] : Array.from({ length: block.optionCount ?? 4 }, (_, index) => String.fromCharCode(65 + index))).map((option) => <MetisCheckbox key={option} checked={(answers[block.id]?.objectiveAnswers[String(number)] ?? []).includes(option)} onChange={(event) => toggle(block.id, number, option, event.target.checked)}>{option}</MetisCheckbox>)}
            </div>)}
          </div> : <div className="reference-answer-list">
            {numbers.flatMap((number, questionIndex) => {
              const slotCount = block.answerSlotCounts?.[questionIndex] ?? 0
              if (!slotCount) return [{ key: String(number), label: `${number}.` }]
              const labels = block.answerSlotLabels?.[questionIndex]
              return Array.from({ length: slotCount }, (_, slotIndex) => ({ key: `${number}.${slotIndex + 1}`, label: labels?.[slotIndex] || (block.answerVariant === 'fill' ? `${number}. 空${slotIndex + 1}` : `${number}.（${slotIndex + 1}）`) }))
            }).map((answer) => <label key={answer.key} className={block.answerVariant === 'fill' ? '' : 'long-reference-answer'}><span>{answer.label}</span>{block.answerVariant === 'fill'
              ? <MetisInput value={answers[block.id]?.referenceAnswers[answer.key] ?? ''} placeholder="请输入参考答案" onChange={(event) => updateReferenceAnswer(block.id, answer.key, event.target.value)} />
              : <textarea value={answers[block.id]?.referenceAnswers[answer.key] ?? ''} placeholder="请输入参考答案" onChange={(event) => updateReferenceAnswer(block.id, answer.key, event.target.value)} />}</label>)}
          </div>}
        </section>
      })}
    </div>
  </MetisDialog>
}
