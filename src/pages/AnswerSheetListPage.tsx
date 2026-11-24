import { useCallback, useMemo, useRef, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisMessage, MetisSelect } from '@yuanfudao/metis-web-component'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Copy, Download, Edit3, Eye, FileCheck2, FilePlus2, Files, FileText, Link2, ListChecks, MoreHorizontal, Search, Upload } from 'lucide-react'
import { answerSheetTemplates, instantiateTemplate } from '../data/answerSheetTemplates'
import type { AnswerSheetDocument } from '../features/answer-sheet/types'
import { isAnswerableBlock } from '../features/answer-sheet/types'
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
  const [name, setName] = useState('未命名答题卡')
  const [newSubject, setNewSubject] = useState('英语')
  const [templateId, setTemplateId] = useState('true-blank')
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
    const nextDocument = createDocument(trimmed, newSubject, templateId)
    setLocalDocuments((current) => ({ ...current, [nextDocument.paper.id]: nextDocument }))
    setItems((current) => [{ id: nextDocument.paper.id, name: trimmed, subject: newSubject, templateId, updatedAt: '刚刚', pages: nextDocument.pageCount, status: 'draft', creator: '李老师' }, ...current])
    onEdit(nextDocument, undefined, nextDocument.paper.id)
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

  const footer = <div className="dialog-footer-actions"><MetisButton type="borderless" onClick={() => setCreateOpen(false)}>取消</MetisButton><MetisButton type="primary" onClick={createCard}>创建并开始制卡</MetisButton></div>

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
      <div className="library-tool-actions">
        <div className="library-create-actions">
          <MetisButton type="primary" icon={<FilePlus2 size={16} />} onClick={() => setCreateOpen(true)}>新建空白答题卡</MetisButton>
          <MetisButton type="bordered" icon={<Upload size={16} />} loading={importing} onClick={() => uploadInputRef.current?.click()}>上传试卷生成答题卡</MetisButton>
        </div>
        <input ref={uploadInputRef} type="file" hidden onChange={(event) => { void uploadPaper(event.target.files?.[0]); event.currentTarget.value = '' }} />
        <input ref={associateInputRef} type="file" hidden onChange={(event) => {
          const file = event.target.files?.[0]
          if (file && associateRecordIdRef.current) onAssociateFile(associateRecordIdRef.current, file)
          event.currentTarget.value = ''
        }} />
        <div className="library-top-filters">
          <MetisSelect value={created} onChange={(value) => setCreated(String(value))} options={[{ label: '创建日期', value: 'all' }, { label: '今天', value: 'today' }, { label: '昨天', value: 'yesterday' }, { label: '更早', value: 'earlier' }]} />
          <MetisSelect value={status} onChange={(value) => setStatus(String(value))} options={[{ label: '使用状态', value: 'all' }, { label: '草稿', value: 'draft' }, { label: '已下载', value: 'downloaded' }, { label: '已关联作业', value: 'linked' }]} />
          <MetisSelect value={subject} onChange={(value) => setSubject(String(value))} options={['学科', '语文', '数学', '英语', '物理'].map((label, index) => ({ label, value: index === 0 ? 'all' : label }))} />
          <MetisInput prefix={<Search size={16} />} placeholder="搜索答题卡名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear />
        </div>
      </div>

    <section className="card-list-panel" aria-label="答题卡列表">
      {visibleRecords.length ? visibleRecords.map((record) => {
        return <article className="card-list-row" key={record.id}>
          <div className="record-main">
            <div className="record-name"><FileText size={22} /><strong>{record.name}</strong></div>
            <div className="record-meta">
              <span title="学科"><BookOpen size={15} />{record.subject}</span>
              <span title="页数"><Files size={15} />{record.pages} 页</span>
              <span title="更新时间"><Clock3 size={15} />{record.updatedAt}</span>
            </div>
          </div>
          <div className="record-actions">
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

    <MetisDialog open={createOpen} title="新建答题卡" width={520} footer={footer} onCancel={() => setCreateOpen(false)}>
      <div className="create-card-form">
        <label><span>答题卡名称</span><MetisInput value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>学科</span><MetisSelect value={newSubject} onChange={(value) => setNewSubject(String(value))} options={['语文', '数学', '英语', '物理', '化学', '道德与法治'].map((value) => ({ label: value, value }))} /></label>
        <label><span>起始模板</span><MetisSelect value={templateId} onChange={(value) => setTemplateId(String(value))} options={answerSheetTemplates.filter((template) => template.id === 'true-blank' || template.id === 'science-lab-school' || template.id === 'beijing-english-standard').map((template) => ({ label: template.id === 'true-blank' ? '纯空白卡' : template.name, value: template.id }))} /></label>
      </div>
    </MetisDialog>
    <SourcePaperPreviewDialog file={sourceFile} onClose={() => setSourceFile(undefined)} />
    <ObjectiveAnswerDialog open={Boolean(answerRecord)} blocks={answerDocument?.blocks ?? []} onClose={() => setAnswerRecord(undefined)} onSave={saveRecordAnswers} />
  </div>
}
