import { useEffect, useRef, useState } from 'react'

export function InlineQuestionNumber({ value, label, unit, min, max, step, placeholder = '不统一', onCommit }: {
  value?: number
  label: string
  unit: string
  min: number
  max?: number
  step: number
  placeholder?: string
  onCommit: (value: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const displayValue = value === undefined ? undefined : Number(value.toFixed(2))
  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false
      trigger.current?.focus()
    }
  }, [editing])

  return <span className="question-structure-input">
    {editing ? <input
      type="number"
      min={min}
      max={max}
      step={step}
      defaultValue={displayValue}
      aria-label={label}
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => {
        const field = event.currentTarget
        if (field.validity.valid && Number.isFinite(field.valueAsNumber) && field.valueAsNumber !== displayValue) onCommit(field.valueAsNumber)
        setEditing(false)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        restoreFocus.current = true
        if (event.key === 'Escape') event.currentTarget.value = displayValue === undefined ? '' : String(displayValue)
        event.currentTarget.blur()
      }}
    /> : <button ref={trigger} type="button" className="question-inline-number" aria-label={`编辑${label}，当前 ${displayValue ?? placeholder}`} onClick={() => setEditing(true)}>{displayValue ?? placeholder}</button>}
    {(editing || displayValue !== undefined) && <span>{unit}</span>}
  </span>
}
