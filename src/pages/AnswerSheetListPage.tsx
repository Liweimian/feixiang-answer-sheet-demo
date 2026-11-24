import { useCallback, useMemo, useRef, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisMessage, MetisSelect } from '@yuanfudao/metis-web-component'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Copy, Download, Edit3, Eye, FileCheck2, FilePlus2, Files, FileText, Link2, ListChecks, MoreHorizontal, Search, Upload } from 'lucide-react'
import { answerSheetTemplates, instantiateTemplate } from '../data/answerSheetTemplates'
import type { AnswerSheetDocument } from '../features/answer-sheet/types'
import { isAnswerableBlock } from '../features/answer-sheet/types'
import { questionNumbers } from '../features/answer-sheet/range'
import { importPaperAsAnswerSheet } from '../features/answer-sheet/importPaper'
import { SourcePaperPreviewDialog } from '../components/SourcePaperPreviewDialog'
import { ObjectiveAnswerDialog, type AnswerDialogValue } from '../components/ObjectiveAnswerDialog'

interface AnswerSheetListPageProps {
  onEdit: (document: AnswerSheetDocument, sourceFile: File | undefined, recordId: string) => void
  onExperienceFromPaper: () => void
  associatedFiles: Record<string, File>
  onAssociateFile: (recordId: string, file: File) => void
}

interface AnswerSheetRecord {
  id: string
  name: string
  subject: string
  templateId: string
  updatedAt: string
  pages: number
  status: 'draft' | 'downloaded' | 'linked'
  creator: string
  sourceFile?: File
}

const records: AnswerSheetRecord[] = [
  { id: 'card-1', name: '初三英语周测答题卡', subject: '英语', templateId: 'beijing-english-standard', updatedAt: '今天 15:26', pages: 3, status: 'draft', creator: '李老师' },
  { id: 'card-2', name: '九年级物理实验专题', subject: '物理', templateId: 'science-lab-school', updatedAt: '昨天 18:42', pages: 2, status: 'downloaded', creator: '李老师' },
  { id: 'card-3', name: '语文作文训练通用卡', subject: '语文', templateId: 'true-blank', updatedAt: '11-03 09:18', pages: 1, status: 'linked', creator: '备课组' },
]

function createDocument(name: string, subject: string, templateId: string) {
  const template = answerSheetTemplates.find((item) => item.id === templateId)
    ?? answerSheetTemplates.find((item) => item.id === 'true-blank')!
  const document = instantiateTemplate(template)
  const templateScore = document.blocks.reduce((total, block) => total + (block.score ?? 0), 0)
  return {
    ...document,
    paper: {
      ...document.paper,
      id: `blank-card-${Date.now()}`,
      title: name,
      subtitle: '答题卡工具 · 无关联试卷',
      subject,
      grade: document.paper.grade === '未设置' ? '自定义' : document.paper.grade,
      sourceLabel: '答题卡工具',
      disclaimer: '未关联试卷；题号、分值和作答区由老师在画布中配置。',
      sections: [],
      score: templateScore,
    },
    settings: {
      ...document.settings,
      linkedPaperId: '',
      subjectiveAnswerStyle: 'blank',
      ...(document.header.preset === 'quiz' ? {
        identityFields: ['学号', '姓名', '班级'] as const,
        candidateNumberType: '学号' as const,
        candidateNumberLayouts: [],
      } : {}),
    },
    blocks: document.blocks.map((block) => ({ ...block, sectionId: undefined, locked: false })),
  } satisfies AnswerSheetDocument
}

export function AnswerSheetListPage({ onEdit, onExperienceFromPaper, associatedFiles, onAssociateFile }: AnswerSheetListPageProps) {
  const [toolOpen, setToolOpen] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const associateInputRef = useRef<HTMLInputElement>(null)
  const associateRecordIdRef = useRef('')
  const [importing, setImporting] = useState(false)
  const [items, setItems] = useState(records)
  const [localDocuments, setLocalDocuments] = useState<Record<string, AnswerSheetDocument>>({})
  const [keyword, setKeyword] = useState('')
  const [subject, setSubject] = useState('all')
  const [status, setStatus] = useState('all')
  const [created, setCreated] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'ai' | 'template'>('ai')
  const [name, setName] = useState('未命名答题卡')
  const [newSubject, setNewSubject] = useState('英语')
  const [templateId, setTemplateId] = useState('true-blank')
  const [createPrompt, setCreatePrompt] = useState('')
  const [createSuggestion, setCreateSuggestion] = useState('')
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | '8K'>('A4')
  const [columns, setColumns] = useState<1 | 2>(1)
  const [sourceFile, setSourceFile] = useState<File>()
  const [answerRecord, setAnswerRecord] = useState<AnswerSheetRecord>()

  const visibleRecords = useMemo(() => items.filter((record) => {
    const matchesKeyword = !keyword.trim() || record.name.includes(keyword.trim())
    return matchesKeyword && (subject === 'all' || record.subject === subject)
      && (status === 'all' || record.status === status)
      && (created === 'all' || (created === 'today' ? ['今天', '刚刚'].some((label) => record.updatedAt.includes(label)) : created === 'yesterday' ? record.updatedAt.includes('昨天') : !['今天', '刚刚', '昨天'].some((label) => record.updatedAt.includes(label))))
  }), [items, keyword, subject, status, created])

  const getRecordDocument = useCallback((record: AnswerSheetRecord): AnswerSheetDocument => {
    if (localDocuments[record.id]) return structuredClone(localDocuments[record.id])
    const template = answerSheetTemplates.find((item) => item.id === record.templateId) ?? answerSheetTemplates[0]
    const document = instantiateTemplate(template)
    return { ...document, paper: { ...document.paper, title: record.name, subject: record.subject, sourceLabel: '答题卡工具' }, settings: { ...document.settings, linkedPaperId: '' } }
  }, [localDocuments])

  const fileForRecord = (record: AnswerSheetRecord) => associatedFiles[record.id] ?? record.sourceFile
  const openRecord = (record: AnswerSheetRecord) => onEdit(getRecordDocument(record), fileForRecord(record), record.id)
  const answerDocument = useMemo(() => answerRecord ? getRecordDocument(answerRecord) : undefined, [answerRecord, getRecordDocument])
  const saveRecordAnswers = (answers: Record<string, AnswerDialogValue>) => {
    if (!answerRecord || !answerDocument) return
    setLocalDocuments((current) => ({ ...current, [answerRecord.id]: {
      ...answerDocument,
      blocks: answerDocument.blocks.map((block) => isAnswerableBlock(block) ? {
        ...block,
        objectiveAnswers: answers[block.id]?.objectiveAnswers ?? block.objectiveAnswers,
        referenceAnswers: answers[block.id]?.referenceAnswers ?? block.referenceAnswers,
      } : block),
    } }))
    setAnswerRecord(undefined)
    MetisMessage.success('答案已保存')
  }

  const createCard = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      MetisMessage.warning('请输入答题卡名称')
      return
    }
    setCreateOpen(false)
    const baseDocument = createDocument(trimmed, newSubject, templateId)
    const nextDocument = { ...baseDocument, settings: { ...baseDocument.settings, paperSize, frontColumns: columns, backColumns: columns } }
    setLocalDocuments((current) => ({ ...current, [nextDocument.paper.id]: nextDocument }))
    setItems((current) => [{ id: nextDocument.paper.id, name: trimmed, subject: newSubject, templateId, updatedAt: '刚刚', pages: nextDocument.pageCount, status: 'draft', creator: '李老师' }, ...current])
    onEdit(nextDocument, undefined, nextDocument.paper.id)
  }

  const createBlankCard = () => {
    const blankName = '未命名答题卡'
    const document = createDocument(blankName, newSubject, 'true-blank')
    setLocalDocuments((current) => ({ ...current, [document.paper.id]: document }))
    setItems((current) => [{ id: document.paper.id, name: blankName, subject: newSubject, templateId: 'true-blank', updatedAt: '刚刚', pages: document.pageCount, status: 'draft', creator: '李老师' }, ...current])
    onEdit(document, undefined, document.paper.id)
  }

  const openTemplateCreate = () => {
    setCreateMode('template')
    setTemplateId('beijing-english-standard')
    setNewSubject('英语')
    setCreateOpen(true)
  }

  const uploadPaper = async (file?: File) => {
    if (!file) return
    setImporting(true)
    try {
      const document = await importPaperAsAnswerSheet(file)
      setLocalDocuments((current) => ({ ...current, [document.paper.id]: document }))
      setItems((current) => [{ id: document.paper.id, name: document.paper.title, subject: document.paper.subject, templateId: 'true-blank', updatedAt: '刚刚', pages: document.pageCount, status: 'draft', creator: '李老师', sourceFile: file }, ...current])
      MetisMessage.success(document.paper.sourceLabel.includes('演示') ? '已带入示例题型和分值，可修改并继续插入题组' : '已生成答题卡，请核对题号、题型和分值')
      onEdit(document, file, document.paper.id)
    } catch (error) {
      MetisMessage.error(error instanceof Error ? error.message : '试卷解析失败，请更换文件后重试')
    } finally {
      setImporting(false)
    }
  }

  const footer = <div className="dialog-footer-actions"><MetisButton type="borderless" onClick={() => setCreateOpen(false)}>取消</MetisButton><MetisButton type="primary" onClick={createCard}>{createMode === 'template' ? '使用模板开始制卡' : '创建并开始制卡'}</MetisButton></div>

  const applyCreatePrompt = () => {
    const prompt = createPrompt.trim()
    if (!prompt) return
    const chosenSubject = ['语文', '数学', '英语', '物理', '化学'].find((item) => prompt.includes(item))
    if (chosenSubject) setNewSubject(chosenSubject)
    if (/空白|从零/.test(prompt)) setTemplateId('true-blank')
    else if (/物理|实验/.test(prompt)) setTemplateId('science-lab-school')
    else if (/英语|考试/.test(prompt)) setTemplateId('beijing-english-standard')
    if (/A3/i.test(prompt)) setPaperSize('A3')
    else if (/8K/i.test(prompt)) setPaperSize('8K')
    else if (/A4/i.test(prompt)) setPaperSize('A4')
    if (/双栏/.test(prompt)) setColumns(2)
    else if (/单栏/.test(prompt)) setColumns(1)
    setCreateSuggestion('已根据描述预选学科、模板和版面。请核对后创建，题目结构可在编辑页继续告诉助手。')
  }

  return <div className={`answer-sheet-library${toolOpen ? ' tool-library-open' : ''}`}>
    {toolOpen ? <header className="tool-library-breadcrumb">
      <button type="button" className="tool-library-back" aria-label="返回答题卡工具入口" onClick={() => setToolOpen(false)}><ChevronLeft size={22} /></button>
      <span>首页</span><ChevronRight size={16} /><span>考试管理</span><ChevronRight size={16} /><strong>制卡工具</strong>
    </header> : <header className="library-header">
      <div><span>题库卷库 / 答题卡工具</span><h1>答题卡工具</h1><p>已有题库试卷可从组卷流程生成；没有题库试卷可进入制卡工具。</p></div>
    </header>}

    {!toolOpen && <section className="answer-sheet-entry-grid" data-sec="1">
      <article className="answer-sheet-entry-card entry-from-paper active">
        <div className="entry-icon"><FileCheck2 size={24} /></div>
        <div className="entry-copy"><span>试卷在题库中</span><h2>组卷后生成</h2><p>先在题库完成组卷，再自动带入题型、题号和分值生成答题卡。</p></div>
        <div className="entry-steps"><span><b>1</b> 完成组卷</span><i /><span><b>2</b> 生成答题卡</span><i /><span><b>3</b> 调整并发布</span></div>
        <MetisButton className="entry-action-button" type="primary" minWidth={168} icon={<ArrowRight size={17} />} onClick={(event) => { event.stopPropagation(); onExperienceFromPaper() }}>体验从试卷生成</MetisButton>
      </article>
      <article className="answer-sheet-entry-card entry-blank-card" onClick={() => setToolOpen(true)}>
        <div className="entry-icon"><FilePlus2 size={24} /></div>
        <div className="entry-copy"><span>独立制卡</span><h2>制卡工具</h2><p>在同一页面新建空白答题卡，或上传本地试卷生成可编辑的答题卡。</p></div>
        <div className="entry-capabilities"><span>空白新建</span><span>上传试卷</span><span>继续编辑</span></div>
        <MetisButton className="entry-action-button" type="bordered" minWidth={168} icon={<ArrowRight size={17} />} onClick={(event) => { event.stopPropagation(); setToolOpen(true) }}>进入制卡工具</MetisButton>
      </article>
    </section>}

    {toolOpen && <div className="blank-card-library">
      <section className="tool-ai-hero" aria-label="AI 制卡入口">
        <div className="tool-ai-hero-heading"><h1>今天想制作什么答题卡？</h1></div>
        <div className="tool-ai-hero-body">
          <form className="tool-ai-composer" onSubmit={(event) => { event.preventDefault(); if (!createPrompt.trim()) { MetisMessage.warning('请先描述答题卡需求'); return } setCreateMode('ai'); applyCreatePrompt(); setCreateOpen(true) }}>
            <input aria-label="描述答题卡需求" value={createPrompt} onChange={(event) => setCreatePrompt(event.target.value)} placeholder="描述你要的答题卡，例如：七年级数学，满分 100 分" />
            <button type="submit">AI 生成答题卡 <ArrowRight size={16} /></button>
          </form>
        </div>
        <div className="tool-quick-entry" aria-label="其他制卡方式">
          <button type="button" onClick={createBlankCard}><span className="tool-quick-icon"><FilePlus2 size={23} /></span><span className="tool-quick-copy"><strong>空白答题卡</strong><small>从空白画布开始</small></span></button>
          <button type="button" onClick={openTemplateCreate}><span className="tool-quick-icon"><Files size={23} /></span><span className="tool-quick-copy"><strong>选模板制卡</strong><small>套用预设题型与版面</small></span></button>
          <button type="button" onClick={() => uploadInputRef.current?.click()}><span className="tool-quick-icon"><Upload size={23} /></span><span className="tool-quick-copy"><strong>上传试卷制卡</strong><small>{importing ? '正在识别试卷…' : '识别试卷，生成答题卡'}</small></span></button>
          <button type="button" onClick={onExperienceFromPaper}><span className="tool-quick-icon"><FileCheck2 size={23} /></span><span className="tool-quick-copy"><strong>从题库开始制卡</strong><small>带入题型、题号与分值</small></span></button>
        </div>
      </section>
      <div className="tool-library-section-heading"><h2>我的答题卡 <small>{items.length}</small></h2></div>
      <div className="library-tool-actions">
        <input ref={uploadInputRef} type="file" hidden onChange={(event) => { void uploadPaper(event.target.files?.[0]); event.currentTarget.value = '' }} />
        <input ref={associateInputRef} type="file" hidden onChange={(event) => {
          const file = event.target.files?.[0]
          if (file && associateRecordIdRef.current) onAssociateFile(associateRecordIdRef.current, file)
          event.currentTarget.value = ''
        }} />
        <div className="library-top-filters">
          <MetisSelect value={subject} onChange={(value) => setSubject(String(value))} options={['学科', '语文', '数学', '英语', '物理'].map((label, index) => ({ label, value: index === 0 ? 'all' : label }))} />
          <MetisSelect value={created} onChange={(value) => setCreated(String(value))} options={[{ label: '创建日期', value: 'all' }, { label: '今天', value: 'today' }, { label: '昨天', value: 'yesterday' }, { label: '更早', value: 'earlier' }]} />
          <MetisSelect value={status} onChange={(value) => setStatus(String(value))} options={[{ label: '使用状态', value: 'all' }, { label: '草稿', value: 'draft' }, { label: '已下载', value: 'downloaded' }, { label: '已关联作业', value: 'linked' }]} />
          <MetisInput prefix={<Search size={16} />} placeholder="搜索答题卡名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear />
        </div>
      </div>

    <section className="card-list-panel" aria-label="答题卡列表">
      {visibleRecords.length ? visibleRecords.map((record) => {
        const document = getRecordDocument(record)
        const questionCount = new Set(document.blocks.flatMap((block) => questionNumbers(block.range))).size
        const totalScore = document.blocks.reduce((sum, block) => sum + (block.score ?? 0), 0)
        const scoreLabel = Number(totalScore.toFixed(2)).toString()
        const paperLabel = `${document.settings.paperSize} ${document.settings.printSide === 'double' ? '双面' : '单面'}`
        return <article className="card-list-row" key={record.id} role="link" tabIndex={0} aria-label={`编辑${record.name}`} onClick={() => openRecord(record)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openRecord(record) } }}>
          <div className="record-main">
            <div className="record-name"><FileText size={22} /><strong>{record.name}</strong></div>
            <div className="record-summary"><span>共 {questionCount} 题</span><span>共 {scoreLabel} 分</span><span>{paperLabel}</span></div>
            <div className="record-meta">
              <span title="学科"><BookOpen size={15} />{record.subject}</span>
              <span title="页数"><Files size={15} />{record.pages} 页</span>
              <span title="更新时间"><Clock3 size={15} />{record.updatedAt}</span>
            </div>
          </div>
          <div className="record-actions" onClick={(event) => event.stopPropagation()}>
            <MetisButton className="card-action-button" type="borderless" size="s" icon={<Edit3 size={14} />} onClick={() => openRecord(record)}>编辑</MetisButton>
            <MetisButton className="card-action-button" type="borderless" size="s" icon={<Download size={14} />} onClick={() => MetisMessage.info('演示：下载最新版 PDF')}>下载</MetisButton>
            <details className="record-more" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false }}>
              <summary><MoreHorizontal size={14} />更多</summary>
              <div className="record-more-menu">
                {fileForRecord(record) ? <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setSourceFile(fileForRecord(record)) }}><Eye size={15} />查看原卷</button>
                  : <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); associateRecordIdRef.current = record.id; associateInputRef.current?.click() }}><Link2 size={15} />关联原卷</button>}
                <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setAnswerRecord(record) }}><ListChecks size={15} />设置答案</button>
                <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setItems((current) => [{ ...record, id: `${record.id}-copy-${Date.now()}`, name: `${record.name}（副本）`, updatedAt: '刚刚', status: 'draft', sourceFile: undefined }, ...current]); MetisMessage.success(`已复制“${record.name}”`) }}><Copy size={15} />复制</button>
              </div>
            </details>
          </div>
        </article>
      }) : <div className="library-empty"><FileText size={36} /><strong>没有找到答题卡</strong><span>调整筛选条件，或新建一张空白答题卡</span></div>}
    </section></div>}

    <MetisDialog open={createOpen} title={createMode === 'template' ? '选择模板制卡' : '新建答题卡'} width={520} footer={footer} onCancel={() => setCreateOpen(false)}>
      <div className="create-card-form">
        {createMode === 'ai' && <div className="create-ai-prompt"><strong>✦ 告诉 AI 想制作什么答题卡</strong><div><input value={createPrompt} onChange={(event) => setCreatePrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyCreatePrompt() } }} placeholder="如：初中英语小测，A4 单栏" /><button type="button" onClick={applyCreatePrompt}>生成建议</button></div>{createSuggestion && <p>{createSuggestion}</p>}</div>}
        <label><span>答题卡名称</span><MetisInput value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>学科</span><MetisSelect value={newSubject} onChange={(value) => setNewSubject(String(value))} options={['语文', '数学', '英语', '物理', '化学', '道德与法治'].map((value) => ({ label: value, value }))} /></label>
        <label><span>起始模板</span><MetisSelect value={templateId} onChange={(value) => { const nextId = String(value); setTemplateId(nextId); if (createMode === 'template') setNewSubject(nextId === 'science-lab-school' ? '物理' : '英语') }} options={answerSheetTemplates.filter((template) => template.id === 'science-lab-school' || template.id === 'beijing-english-standard' || createMode === 'ai' && template.id === 'true-blank').map((template) => ({ label: template.id === 'true-blank' ? '纯空白卡' : template.name, value: template.id }))} /></label>
        <label><span>纸张</span><MetisSelect value={paperSize} onChange={(value) => setPaperSize(value as 'A4' | 'A3' | '8K')} options={['A4', 'A3', '8K'].map((value) => ({ label: value, value }))} /></label>
        <label><span>分栏</span><MetisSelect value={columns} onChange={(value) => setColumns(Number(value) as 1 | 2)} options={[{ label: '单栏', value: 1 }, { label: '双栏', value: 2 }]} /></label>
      </div>
    </MetisDialog>
    <SourcePaperPreviewDialog file={sourceFile} onClose={() => setSourceFile(undefined)} />
    <ObjectiveAnswerDialog open={Boolean(answerRecord)} blocks={answerDocument?.blocks ?? []} onClose={() => setAnswerRecord(undefined)} onSave={saveRecordAnswers} />
  </div>
}
