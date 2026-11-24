import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { MetisInput } from '@yuanfudao/metis-web-component'
import { EyeOff, GripVertical, LockKeyhole, Minus, Pencil, Plus, QrCode } from 'lucide-react'
import type { AnswerSheetSettings, ExamPaper, HeaderLayout, HeaderModule } from '../features/answer-sheet/types'
import { clampHeaderModule, headerModulesOverlap, isHeaderModuleVisible, updateHeaderModule } from '../features/answer-sheet/headerGeometry'

interface AnswerSheetHeaderProps {
  header: HeaderLayout
  paper: ExamPaper
  settings: AnswerSheetSettings
  page: number
  pageCount: number
  editable?: boolean
  onChange?: (header: HeaderLayout) => void
  onTitleCommit?: (title: string) => void
}

function HeaderTitle({ paper, editable, onCommit, generalReference = false, beijingReference = false, shenzhenReferenceA = false, shenzhenReferenceB = false, guangzhouReference = false }: { paper: ExamPaper; editable: boolean; onCommit?: (title: string) => void; generalReference?: boolean; beijingReference?: boolean; shenzhenReferenceA?: boolean; shenzhenReferenceB?: boolean; guangzhouReference?: boolean }) {
  const generatedBeijingTitle = `北京市初中学业水平考试 ${paper.subject}答题卡`
  const generatedShenzhenTitle = `深圳市初中学业水平考试 ${paper.subject}答题卡`
  const generatedGuangzhouTitle = `广州市初中学业水平考试 —— ${paper.subject}答题卡`
  const visibleTitle = guangzhouReference
    ? paper.title.includes('北京') || paper.title.includes('深圳') ? generatedGuangzhouTitle : paper.title
    : shenzhenReferenceA
    ? paper.title.includes('北京') ? generatedShenzhenTitle : paper.title
    : beijingReference && !paper.title.includes('初中学业水平考试') ? generatedBeijingTitle : paper.title
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(visibleTitle)
  const cancelling = useRef(false)

  useEffect(() => {
    if (!editing) setDraft(visibleTitle)
  }, [editing, visibleTitle])

  const commit = () => {
    if (!editing) return
    if (cancelling.current) {
      cancelling.current = false
      setDraft(visibleTitle)
      setEditing(false)
      return
    }
    const value = draft.trim() || visibleTitle
    setDraft(value)
    setEditing(false)
    if (value !== paper.title) onCommit?.(value)
  }

  if (editing && editable) {
    return (
      <MetisInput
        className="header-title-input"
        autoFocus
        maxLength={36}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            cancelling.current = true
            setDraft(visibleTitle)
            event.currentTarget.blur()
          }
        }}
        aria-label="编辑答题卡标题"
      />
    )
  }

  return (
    <button
      type="button"
      className="header-title-edit"
      disabled={!editable}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        if (!editable) return
        cancelling.current = false
        setEditing(true)
      }}
    >
      {generalReference ? (
        <>
          <strong className="general-reference-title">{paper.title}</strong>
          <span className="general-title-qr" aria-label="答题卡二维码"><QrCode size={24} strokeWidth={2.4} /></span>
        </>
      ) : beijingReference ? (
        <>
          <strong className="beijing-reference-title">{visibleTitle}</strong>
          <span className="beijing-title-qr" aria-label="答题卡二维码"><QrCode size={24} strokeWidth={2.4} /></span>
        </>
      ) : shenzhenReferenceA ? (
        <>
          <strong className="shenzhen-a-reference-title">{visibleTitle}</strong>
          <span className="shenzhen-title-qr" aria-label="答题卡二维码"><QrCode size={24} strokeWidth={2.4} /></span>
        </>
      ) : shenzhenReferenceB ? (
        <>
          <strong className="shenzhen-b-reference-title">深圳市初中学业水平考试　{paper.subject}答题卡</strong>
          <span className="shenzhen-b-title-qr" aria-label="答题卡二维码"><QrCode size={24} strokeWidth={2.4} /></span>
        </>
      ) : guangzhouReference ? (
        <>
          <strong className="guangzhou-reference-title">{visibleTitle}</strong>
          <span className="guangzhou-title-qr" aria-label="答题卡二维码"><QrCode size={24} strokeWidth={2.4} /></span>
        </>
      ) : (
        <><strong>{paper.title}</strong><span>{paper.subject}答题卡</span></>
      )}
      {editable && <Pencil size={10} />}
    </button>
  )
}

function EditableHeaderLabel({ value, editable, onCommit }: { value: string; editable: boolean; onCommit: (value: string) => void }) {
  const [editing, setEditing] = useState(false)
  const labelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!editing) return
    labelRef.current?.focus()
    const selection = window.getSelection()
    const range = document.createRange()
    if (selection && labelRef.current) {
      range.selectNodeContents(labelRef.current)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }, [editing])

  return <b
    ref={labelRef}
    className={editable ? 'header-editable-label' : ''}
    contentEditable={editable && editing}
    suppressContentEditableWarning
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => {
      if (!editable) return
      event.stopPropagation()
      setEditing(true)
    }}
    onBlur={(event) => {
      const next = event.currentTarget.textContent?.trim()
      if (next && next !== value) onCommit(next)
      else event.currentTarget.textContent = value
      setEditing(false)
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        event.currentTarget.blur()
      }
      if (event.key === 'Escape') {
        event.currentTarget.textContent = value
        event.currentTarget.blur()
      }
    }}
  >{value}</b>
}

function HeaderModuleContent({ module, paper, settings, editable, onTitleCommit, onModuleChange }: {
  module: HeaderModule
  paper: ExamPaper
  settings: AnswerSheetSettings
  editable: boolean
  onTitleCommit?: (title: string) => void
  onModuleChange?: (patch: Partial<HeaderModule>) => void
}) {
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null)
  const [fieldMenu, setFieldMenu] = useState<{ index: number; x: number; y: number } | null>(null)
  const beijingReference = module.id.startsWith('bj-')
  const generalReference = module.id.startsWith('general-')
  const shenzhenReferenceA = module.id.startsWith('sza-')
  const shenzhenReferenceB = module.id.startsWith('szb-')
  const guangzhouReference = module.id.startsWith('gz-')
  const editableModuleLabel = <EditableHeaderLabel value={module.label} editable={editable} onCommit={(label) => onModuleChange?.({ label })} />
  if (module.kind === 'title') return <HeaderTitle paper={paper} editable={editable} onCommit={onTitleCommit} generalReference={generalReference} beijingReference={beijingReference} shenzhenReferenceA={shenzhenReferenceA} shenzhenReferenceB={shenzhenReferenceB} guangzhouReference={guangzhouReference} />
  if (module.kind === 'identity') {
    const fields = module.fields ?? settings.identityFields
    const updateField = (index: number, value: string) => onModuleChange?.({ fields: fields.map((field, fieldIndex) => fieldIndex === index ? value : field) })
    const insertField = (index: number) => onModuleChange?.({ fields: [...fields.slice(0, index), '新字段', ...fields.slice(index)] })
    const deleteField = (index: number) => {
      if (fields.length <= 1) return
      onModuleChange?.({ fields: fields.filter((_, fieldIndex) => fieldIndex !== index) })
    }
    const runFieldAction = (action: 'before' | 'after' | 'delete') => {
      if (!fieldMenu) return
      if (action === 'before') insertField(fieldMenu.index)
      if (action === 'after') insertField(fieldMenu.index + 1)
      if (action === 'delete') deleteField(fieldMenu.index)
      setFieldMenu(null)
    }
    const verticalFields = module.variant === 'general-identity' || module.variant === 'guangzhou-identity' || module.variant === 'shenzhen-b'
    return <div className={`header-identity-fields ${module.variant === 'shenzhen-a-boxes' ? 'is-shenzhen-a-boxes' : ''}`} style={{ gridTemplateRows: verticalFields ? `repeat(${fields.length}, minmax(0, 1fr))` : '1fr' }} onPointerDown={() => setFieldMenu(null)}>{fields.map((field, index) => <span
      className={`header-identity-row ${selectedFieldIndex === index ? 'is-cell-selected' : ''}`}
      key={`${field}-${index}`}
      onPointerDown={(event) => { event.stopPropagation(); setSelectedFieldIndex(index) }}
      onContextMenu={(event) => {
        if (!editable) return
        event.preventDefault()
        event.stopPropagation()
        const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
        setSelectedFieldIndex(index)
        setFieldMenu({ index, x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) })
      }}
    ><EditableHeaderLabel value={field} editable={editable} onCommit={(value) => updateField(index, value)} />{module.variant === 'shenzhen-a-boxes' ? <span className="header-mini-boxes">{Array.from({ length: field.includes('考场') ? 3 : 2 }, (_, boxIndex) => <i key={boxIndex} />)}</span> : <i />}</span>)}{editable && fieldMenu && <div className="header-cell-menu" style={{ left: fieldMenu.x, top: fieldMenu.y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => runFieldAction('before')}>在上方插入一行</button>
      <button type="button" role="menuitem" onClick={() => runFieldAction('after')}>在下方插入一行</button>
      <button type="button" role="menuitem" className="danger" disabled={fields.length <= 1} onClick={() => runFieldAction('delete')}>删除此行</button>
    </div>}</div>
  }
  if (module.kind === 'candidate-number') {
    if (module.variant === 'general-omr') {
      const digits = module.digitCount ?? settings.candidateNumberDigits
      const field = module.fields?.[0] ?? '准考证号'
      return <div className="general-candidate-omr"><div className="general-candidate-write-boxes">{Array.from({ length: digits }, (_, index) => <i key={index} />)}</div><EditableHeaderLabel value={field} editable={editable} onCommit={(value) => onModuleChange?.({ fields: [value] })} />{editable && <span className="header-digit-control"><button type="button" aria-label="减少一位" disabled={digits <= 4} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onModuleChange?.({ digitCount: Math.max(4, digits - 1) }) }}><Minus size={9} /></button><em>{digits}位</em><button type="button" aria-label="增加一位" disabled={digits >= 18} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onModuleChange?.({ digitCount: Math.min(18, digits + 1) }) }}><Plus size={9} /></button></span>}<div className="general-candidate-omr-grid">{Array.from({ length: digits }, (_, column) => <span key={column}>{Array.from({ length: 10 }, (_, digit) => <i key={digit}>（{digit}）</i>)}</span>)}</div></div>
    }
    if (module.variant === 'guangzhou-room' || module.variant === 'guangzhou-seat') {
      const digits = module.variant === 'guangzhou-room' ? 5 : 2
      const field = module.fields?.[0] ?? module.label
      return <div className="guangzhou-omr"><div className="guangzhou-write-boxes">{Array.from({ length: digits }, (_, index) => <i key={index} />)}</div><EditableHeaderLabel value={field} editable={editable} onCommit={(value) => onModuleChange?.({ fields: [value] })} /><div className="guangzhou-omr-grid">{Array.from({ length: digits }, (_, column) => <span key={column}>{Array.from({ length: 10 }, (_, digit) => <i key={digit}>〔{digit}〕</i>)}</span>)}</div></div>
    }
    const modes = settings.candidateNumberLayouts
      .filter((layout) => layout !== 'barcode')
      .map((layout) => layout === 'fill' ? '填涂' : '手写')
      .join(' + ')
    const digits = module.digitCount ?? settings.candidateNumberDigits
    const field = module.fields?.[0] ?? '准考证号'
    return <div className="header-number-module"><span className="header-number-label"><EditableHeaderLabel value={field} editable={editable} onCommit={(value) => onModuleChange?.({ fields: [value] })} /><small>{modes}</small></span><span className="header-number-boxes" style={{ gridTemplateColumns: `repeat(${digits}, minmax(0, 1fr))`, ...(shenzhenReferenceA ? { width: `min(100%, calc(${digits} * var(--sza-number-cell)))` } : {}) }}>{Array.from({ length: digits }, (_, index) => <i key={index} />)}</span>{editable && <span className="header-number-digit-control"><button type="button" aria-label="减少一位" disabled={digits <= 4} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onModuleChange?.({ digitCount: Math.max(4, digits - 1) }) }}><Minus size={9} /></button><em>{digits}位</em><button type="button" aria-label="增加一位" disabled={digits >= 18} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onModuleChange?.({ digitCount: Math.min(18, digits + 1) }) }}><Plus size={9} /></button></span>}</div>
  }
  if (module.kind === 'barcode') {
    return <div className="header-barcode-module"><span className="header-barcode-lines" />{editableModuleLabel}{shenzhenReferenceB && <small>请核对条形码上的准考证号和姓名</small>}</div>
  }
  if (module.kind === 'notice') {
    if (generalReference) {
      return <div className="header-notice-module is-general-compact">{editableModuleLabel}<ol><li>请使用 2B 铅笔规范填涂选择题，信息点须涂满、涂黑，修改时用橡皮擦干净。</li><li>非选择题须使用黑色字迹的钢笔或签字笔在规定答题区域内作答，超出区域的答案无效。</li><li>保持答题卡平整、清洁，不折叠、不破损，不使用涂改液或修正带。</li></ol></div>
    }
    const variant = beijingReference ? module.variant ?? 'detailed' : shenzhenReferenceA ? 'shenzhen-a' : settings.noticeStyle === 'daily' ? 'compact' : module.variant ?? 'detailed'
    return <div className={`header-notice-module is-${variant}`}>{editableModuleLabel}<ol>{beijingReference ? <><li>答题前考生务必将答题卡上的姓名、准考证号用黑色字迹的签字笔填写，请认真核对条形码上的姓名、准考证号，确认无误后粘贴在条形码框内。</li><li>答题卡上选择题必须用 2B 铅笔作答，将选中项涂满涂黑；非选择题必须用黑色字迹的签字笔按题号顺序在各题目的答题区域内作答。</li><li>保持答题卡整洁，不要折叠、折皱、破损，不得在答题卡上做任何标记。</li><li>缺考考生的姓名、准考证号、缺考标记由监考员负责填写和填涂。</li></> : shenzhenReferenceA ? <><li>答题前，考生务必认真核对条形码上的姓名、准考证号和座位号，然后将本人条码横向粘贴在指定位置。</li><li>选择题必须用 2B 铅笔填涂；非选择题必须用黑色字迹的签字笔在对应答题区域内作答。</li><li>严禁在答题区域以外书写，答案超出黑色矩形边框限定区域无效。</li><li>保持卡面清洁，不要折叠、不要弄破。</li></> : shenzhenReferenceB ? <><li>在“条形码粘贴处”粘贴条形码，注意不要超出边框。</li><li>答题前考生务必用黑色字迹的钢笔或签字笔填写姓名、准考证号和学校。</li><li>选择题部分必须使用 2B 铅笔填涂信息点，信息点框内必须涂满、涂黑；修改时须用橡皮擦干净。</li><li>非选择题部分必须使用黑色字迹的钢笔或签字笔书写，并按照题号在相应答题区域内作答，不得使用涂改液、胶带纸等修改。</li><li>超出各题答题区域的答案无效，在试卷、草稿纸上作答无效。</li><li>请勿折叠答题卡，保持字迹工整、笔迹清晰、卡面清洁。</li></> : guangzhouReference ? <><li>答题前，请先将姓名、考生号用黑色字迹签字笔填写在答题卡指定位置，并核对条形码信息。</li><li>保持卡面清洁，不要折叠、不要弄破。</li><li>请注意题号顺序，不得超出规定区域作答。</li></> : <><li>核对姓名和考号，按要求粘贴条形码。</li><li>客观题使用 2B 铅笔规范填涂。</li><li>主观题使用黑色字迹签字笔作答。</li><li>答案须写在对应答题区域内。</li></>}</ol></div>
  }
  if (module.kind === 'fill-sample') {
    if (generalReference) {
      return <div className="header-fill-module is-general-compact">{editableModuleLabel}<span>正确填涂 <i className="fill-correct" /></span><span className="general-fill-errors">错误填涂　▱　☒　▣　▬</span></div>
    }
    if (shenzhenReferenceA) {
      return <div className="header-fill-module is-shenzhen-a">{editableModuleLabel}<span className="shenzhen-a-fill-correct">正确填涂 <i className="fill-correct" /></span><span className="shenzhen-a-fill-errors">错误填涂 <i>▱</i><i>☒</i><i>▣</i><i>▬</i></span></div>
    }
    return <div className={`header-fill-module is-${module.variant ?? 'detailed'}`}>{editableModuleLabel}<span>正确填涂 <i className="fill-correct" /></span>{module.variant !== 'beijing-footer' && <span>错误填涂　●　×　—　✓</span>}</div>
  }
  if (shenzhenReferenceA) {
    return <div className="header-absence-module is-shenzhen-a">{editableModuleLabel}<small>缺考考生，由监考员用 2B 铅笔填涂左方标记。</small><span className="shenzhen-a-student-mark">考生禁填 <i className="header-absence-box" aria-hidden="true" /></span></div>
  }
  if (generalReference) {
    return <div className="header-absence-module is-general-compact">{editableModuleLabel}<span className="header-absence-box" aria-hidden="true" /><small>缺考考生由监考员用 2B 铅笔填涂，其他考生禁止填涂。</small></div>
  }
  return <div className={`header-absence-module is-${module.variant ?? 'detailed'}`}>{editableModuleLabel}<span className="header-absence-box" aria-hidden="true" /><small>{shenzhenReferenceB ? <>对缺考考生，由监考员用 2B 铅笔填涂此信息点。其他考生禁止填涂。</> : '由监考员填涂'}</small></div>
}

export function AnswerSheetHeader({ header, paper, settings, page, pageCount, editable = false, onChange, onTitleCommit }: AnswerSheetHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState('')
  const [preview, setPreview] = useState<HeaderModule>()
  const [invalid, setInvalid] = useState(false)
  const hideableKinds = new Set(['candidate-number', 'barcode', 'notice', 'fill-sample', 'absence-mark'])

  useEffect(() => {
    if (selectedId && !header.modules.some((item) => item.id === selectedId)) setSelectedId('')
  }, [header.modules, selectedId])

  if (page > 1) {
    return null
  }

  const beginTransform = (event: ReactPointerEvent, module: HeaderModule, action: 'move' | 'resize') => {
    if (!editable || !onChange || action === 'move' && (event.target as HTMLElement).closest('button,input')) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(module.id)
    const container = containerRef.current
    if (!container) return
    const bounds = container.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const start = { ...module }
    let latest = start

    const move = (pointerEvent: PointerEvent) => {
      const dx = (pointerEvent.clientX - startX) / bounds.width * 100
      const dy = (pointerEvent.clientY - startY) / bounds.height * 100
      latest = clampHeaderModule(action === 'move'
        ? { ...start, x: start.x + dx, y: start.y + dy }
        : { ...start, width: start.width + dx, height: start.height + dy })
      const collision = header.modules.some((item) => item.id !== module.id && isHeaderModuleVisible(item, settings, header.hiddenItemIds) && headerModulesOverlap(latest, item))
      setInvalid(collision)
      setPreview(latest)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      const next = updateHeaderModule(header, module.id, latest, settings)
      setPreview(undefined)
      setInvalid(false)
      if (next !== header) onChange(next)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end, { once: true })
  }

  return (
    <header className="exam-header-shell">
      <div
        ref={containerRef}
        className={`header-layout-canvas ${header.templateId === 'exam-general' ? 'is-general-reference' : ''} ${header.templateId === 'beijing-exam-reference' ? 'is-beijing-reference' : ''} ${header.templateId === 'shenzhen-exam-reference-a' ? 'is-shenzhen-reference-a' : ''} ${header.templateId === 'shenzhen-exam-reference-b' ? 'is-shenzhen-reference-b' : ''} ${header.templateId === 'guangzhou-exam-reference' ? 'is-guangzhou-reference' : ''}`}
        style={{ height: header.height }}
        onPointerDown={() => setSelectedId('')}
      >
        {header.modules.filter((item) => isHeaderModuleVisible(item, settings, header.hiddenItemIds)).map((item) => {
          const module = preview?.id === item.id ? preview : item
          const selected = editable && selectedId === item.id
          const style = {
            left: `${module.x}%`,
            top: `${module.y}%`,
            width: `${module.width}%`,
            height: `${module.height}%`,
          } as CSSProperties
          return (
            <section
              key={item.id}
              className={`header-module kind-${item.kind} ${selected ? 'selected' : ''} ${preview?.id === item.id && invalid ? 'invalid' : ''}`}
              style={style}
              onPointerDown={(event) => beginTransform(event, item, 'move')}
              onClick={(event) => {
                event.stopPropagation()
                if (editable) setSelectedId(item.id)
              }}
              aria-label={`${item.label}${item.protected ? '，扫描关键区' : ''}`}
            >
              <HeaderModuleContent
                module={item}
                paper={paper}
                settings={settings}
                editable={editable}
                onTitleCommit={onTitleCommit}
                onModuleChange={(patch) => onChange?.({
                  ...header,
                  customized: true,
                  modules: header.modules.map((headerModule) => headerModule.id === item.id ? { ...headerModule, ...patch } : headerModule),
                })}
              />
              {editable && hideableKinds.has(item.kind) && <button
                type="button"
                className="header-hide-action"
                aria-label={`隐藏${item.label}`}
                title={`隐藏${item.label}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onChange?.({ ...header, customized: true, hiddenItemIds: [...(header.hiddenItemIds ?? []), item.id] })
                  setSelectedId('')
                }}
              ><EyeOff size={10} /> 隐藏</button>}
              {selected && <>
                <span className="header-module-label"><GripVertical size={10} />{item.label}{item.protected && <LockKeyhole size={9} />}</span>
                <button type="button" className="header-resize-handle" aria-label={`调整${item.label}大小`} onPointerDown={(event) => beginTransform(event, item, 'resize')} />
              </>}
            </section>
          )
        })}
      </div>
    </header>
  )
}
