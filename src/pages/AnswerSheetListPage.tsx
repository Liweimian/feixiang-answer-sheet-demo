import { useEffect, useMemo, useRef, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisMessage, MetisSelect } from '@yuanfudao/metis-web-component'
import { ArrowRight, ChevronLeft, ChevronRight, Copy, Download, Edit3, FileCheck2, FilePlus2, FileText, Search, Upload } from 'lucide-react'
import { answerSheetTemplates, instantiateTemplate } from '../data/answerSheetTemplates'
import type { AnswerSheetDocument } from '../features/answer-sheet/types'
import { importPaperAsAnswerSheet } from '../features/answer-sheet/importPaper'

interface AnswerSheetListPageProps {
  onEdit: (document: AnswerSheetDocument) => void
  onExperienceFromPaper: () => void
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

export function AnswerSheetListPage({ onEdit, onExperienceFromPaper }: AnswerSheetListPageProps) {
  const [toolOpen, setToolOpen] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
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
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceText, setSourceText] = useState('')

  useEffect(() => {
    if (!sourceFile) return
    const url = URL.createObjectURL(sourceFile)
    setSourceUrl(url)
    setSourceText('')
    let active = true
    const lowerName = sourceFile.name.toLowerCase()
    if (lowerName.endsWith('.docx')) {
      void sourceFile.arrayBuffer().then(async (arrayBuffer) => {
        const mammoth = await import('mammoth')
        return mammoth.extractRawText({ arrayBuffer })
      }).then((result) => { if (active) setSourceText(result.value) }).catch(() => { if (active) setSourceText('原卷文字读取失败，请下载文件查看。') })
    } else if (sourceFile.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(lowerName)) {
      void sourceFile.text().then((value) => { if (active) setSourceText(value) })
    }
    return () => { active = false; URL.revokeObjectURL(url); setSourceUrl('') }
  }, [sourceFile])

  const visibleRecords = useMemo(() => items.filter((record) => {
    const matchesKeyword = !keyword.trim() || record.name.includes(keyword.trim())
    return matchesKeyword && (subject === 'all' || record.subject === subject)
      && (status === 'all' || record.status === status)
      && (created === 'all' || (created === 'today' ? ['今天', '刚刚'].some((label) => record.updatedAt.includes(label)) : created === 'yesterday' ? record.updatedAt.includes('昨天') : !['今天', '刚刚', '昨天'].some((label) => record.updatedAt.includes(label))))
  }), [items, keyword, subject, status, created])

  const openRecord = (record: AnswerSheetRecord) => {
    if (localDocuments[record.id]) { onEdit(structuredClone(localDocuments[record.id])); return }
    const template = answerSheetTemplates.find((item) => item.id === record.templateId) ?? answerSheetTemplates[0]
    const document = instantiateTemplate(template)
    onEdit({ ...document, paper: { ...document.paper, title: record.name, subject: record.subject, sourceLabel: '答题卡工具' }, settings: { ...document.settings, linkedPaperId: '' } })
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
    onEdit(nextDocument)
  }

  const uploadPaper = async (file?: File) => {
    if (!file) return
    setImporting(true)
    try {
      const document = await importPaperAsAnswerSheet(file)
      setLocalDocuments((current) => ({ ...current, [document.paper.id]: document }))
      setItems((current) => [{ id: document.paper.id, name: document.paper.title, subject: document.paper.subject, templateId: 'true-blank', updatedAt: '刚刚', pages: document.pageCount, status: 'draft', creator: '李老师', sourceFile: file }, ...current])
      MetisMessage.success(document.paper.sourceLabel.includes('演示') ? '已带入示例题型和分值，可修改并继续插入题组' : '已生成答题卡，请核对题号、题型和分值')
      onEdit(document)
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
        <div className="library-top-filters">
          <MetisSelect value={created} onChange={(value) => setCreated(String(value))} options={[{ label: '创建日期', value: 'all' }, { label: '今天', value: 'today' }, { label: '昨天', value: 'yesterday' }, { label: '更早', value: 'earlier' }]} />
          <MetisSelect value={status} onChange={(value) => setStatus(String(value))} options={[{ label: '使用状态', value: 'all' }, { label: '草稿', value: 'draft' }, { label: '已下载', value: 'downloaded' }, { label: '已关联作业', value: 'linked' }]} />
          <MetisSelect value={subject} onChange={(value) => setSubject(String(value))} options={['学科', '语文', '数学', '英语', '物理'].map((label, index) => ({ label, value: index === 0 ? 'all' : label }))} />
          <MetisInput prefix={<Search size={16} />} placeholder="搜索答题卡名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear />
        </div>
      </div>

    <section className="card-list-panel">
      <div className="card-list-head"><span>答题卡名称</span><span>原卷</span><span>学科</span><span>页数</span><span>更新时间</span><span>操作</span></div>
      {visibleRecords.length ? visibleRecords.map((record) => {
        return <div className="card-list-row" key={record.id}>
          <div className="record-name"><FileText size={18} /><strong>{record.name}</strong></div>
          <div className="record-source-cell">{record.sourceFile && <button type="button" className="record-source-link" title={record.sourceFile.name} onClick={() => setSourceFile(record.sourceFile)}>{record.sourceFile.name}</button>}</div>
          <span>{record.subject}</span><span>{record.pages} 页</span><span>{record.updatedAt}</span>
          <div className="record-actions">
            <MetisButton type="borderless" size="s" icon={<Edit3 size={14} />} onClick={() => openRecord(record)}>编辑</MetisButton>
            <MetisButton type="borderless" size="s" icon={<Copy size={14} />} onClick={() => { setItems((current) => [{ ...record, id: `${record.id}-copy-${Date.now()}`, name: `${record.name}（副本）`, updatedAt: '刚刚', status: 'draft', sourceFile: undefined }, ...current]); MetisMessage.success(`已复制“${record.name}”`) }}>复制</MetisButton>
            <MetisButton type="borderless" size="s" icon={<Download size={14} />} onClick={() => MetisMessage.info('演示：下载最新版 PDF')}>下载</MetisButton>
          </div>
        </div>
      }) : <div className="library-empty"><FileText size={36} /><strong>没有找到答题卡</strong><span>调整筛选条件，或新建一张空白答题卡</span></div>}
    </section></div>}

    <MetisDialog open={createOpen} title="新建答题卡" width={520} footer={footer} onCancel={() => setCreateOpen(false)}>
      <div className="create-card-form">
        <label><span>答题卡名称</span><MetisInput value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>学科</span><MetisSelect value={newSubject} onChange={(value) => setNewSubject(String(value))} options={['语文', '数学', '英语', '物理', '化学', '道德与法治'].map((value) => ({ label: value, value }))} /></label>
        <label><span>起始模板</span><MetisSelect value={templateId} onChange={(value) => setTemplateId(String(value))} options={answerSheetTemplates.filter((template) => template.id === 'true-blank' || template.id === 'science-lab-school' || template.id === 'beijing-english-standard').map((template) => ({ label: template.id === 'true-blank' ? '纯空白卡' : template.name, value: template.id }))} /></label>
      </div>
    </MetisDialog>
    <MetisDialog open={Boolean(sourceFile)} title={sourceFile?.name ?? '原卷'} width={900} footer={<MetisButton type="bordered" icon={<Download size={15} />} onClick={() => {
      if (!sourceUrl || !sourceFile) return
      const link = document.createElement('a')
      link.href = sourceUrl
      link.download = sourceFile.name
      link.click()
    }}>下载原卷</MetisButton>} onCancel={() => setSourceFile(undefined)}>
      <div className="record-source-preview">
        {sourceUrl && sourceFile?.type.startsWith('image/') ? <img src={sourceUrl} alt={sourceFile.name} />
          : sourceUrl && (sourceFile?.type === 'application/pdf' || sourceFile?.name.toLowerCase().endsWith('.pdf')) ? <iframe src={sourceUrl} title={sourceFile.name} />
            : sourceText ? <pre>{sourceText}</pre>
              : <div className="record-source-fallback">{sourceFile?.name.toLowerCase().endsWith('.docx') ? '正在读取原卷内容…' : '此格式暂不支持在线预览，请下载原卷查看。'}</div>}
      </div>
    </MetisDialog>
  </div>
}
