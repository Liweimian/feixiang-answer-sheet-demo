import { useMemo, useRef, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisMessage, MetisSelect, MetisTag } from '@yuanfudao/metis-web-component'
import { ArrowRight, Copy, Download, Edit3, FileCheck2, FilePlus2, FileText, Search, Upload } from 'lucide-react'
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
}

const records: AnswerSheetRecord[] = [
  { id: 'card-1', name: '初三英语周测答题卡', subject: '英语', templateId: 'beijing-english-standard', updatedAt: '今天 15:26', pages: 3, status: 'draft', creator: '李老师' },
  { id: 'card-2', name: '九年级物理实验专题', subject: '物理', templateId: 'science-lab-school', updatedAt: '昨天 18:42', pages: 2, status: 'downloaded', creator: '李老师' },
  { id: 'card-3', name: '语文作文训练通用卡', subject: '语文', templateId: 'true-blank', updatedAt: '11-03 09:18', pages: 1, status: 'linked', creator: '备课组' },
]

const statusMeta = {
  draft: { label: '草稿', preset: 'primary' as const },
  downloaded: { label: '已下载', preset: 'primary' as const },
  linked: { label: '已关联作业', preset: 'success' as const },
}

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
  const [entryMode, setEntryMode] = useState<'paper' | 'upload' | 'blank'>('paper')
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [items, setItems] = useState(records)
  const [localDocuments, setLocalDocuments] = useState<Record<string, AnswerSheetDocument>>({})
  const [keyword, setKeyword] = useState('')
  const [subject, setSubject] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('未命名答题卡')
  const [newSubject, setNewSubject] = useState('英语')
  const [templateId, setTemplateId] = useState('true-blank')

  const visibleRecords = useMemo(() => items.filter((record) => {
    const matchesKeyword = !keyword.trim() || record.name.includes(keyword.trim())
    return matchesKeyword && (subject === 'all' || record.subject === subject)
  }), [items, keyword, subject])

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
      setItems((current) => [{ id: document.paper.id, name: document.paper.title, subject: document.paper.subject, templateId: 'true-blank', updatedAt: '刚刚', pages: document.pageCount, status: 'draft', creator: '李老师' }, ...current])
      MetisMessage.success('已识别题号和题型，请核对分值并继续配置答题卡')
      onEdit(document)
    } catch (error) {
      MetisMessage.error(error instanceof Error ? error.message : '试卷解析失败，请更换文件后重试')
    } finally {
      setImporting(false)
    }
  }

  const footer = <div className="dialog-footer-actions"><MetisButton type="borderless" onClick={() => setCreateOpen(false)}>取消</MetisButton><MetisButton type="primary" onClick={createCard}>创建并开始制卡</MetisButton></div>

  return <div className="answer-sheet-library">
    <header className="library-header">
      <div><span>题库卷库 / 答题卡工具</span><h1>答题卡工具</h1><p>可从已组好的试卷生成、上传本地试卷生成，或从空白卡开始；进入编辑器后都能调整题目与卡面。</p></div>
    </header>

    <section className="answer-sheet-entry-grid" data-sec="1">
      <article className={`answer-sheet-entry-card entry-from-paper ${entryMode === 'paper' ? 'active' : ''}`} onClick={() => setEntryMode('paper')}>
        <div className="entry-icon"><FileCheck2 size={24} /></div>
        <div className="entry-copy"><span>试卷在题库中</span><h2>组卷后生成</h2><p>先在题库完成组卷，再自动带入题型、题号和分值生成答题卡。</p></div>
        <div className="entry-steps"><span><b>1</b> 完成组卷</span><i /><span><b>2</b> 生成答题卡</span><i /><span><b>3</b> 调整并发布</span></div>
        <MetisButton className="entry-action-button" type="primary" minWidth={168} icon={<ArrowRight size={17} />} onClick={(event) => { event.stopPropagation(); onExperienceFromPaper() }}>体验从试卷生成</MetisButton>
      </article>
      <article className={`answer-sheet-entry-card entry-upload-paper ${entryMode === 'upload' ? 'active' : ''}`} onClick={() => setEntryMode('upload')}>
        <div className="entry-icon"><Upload size={24} /></div>
        <div className="entry-copy"><span>试卷在本地</span><h2>上传试卷生成答题卡</h2><p>上传 PDF、DOCX 或 TXT 文字版试卷，识别题号、题型与已标注分值；生成后可继续修改题组和卡面。</p></div>
        <div className="entry-capabilities"><span>识别试卷</span><span>核对题目与分值</span><span>继续配置</span></div>
        <MetisButton className="entry-action-button" type={entryMode === 'upload' ? 'primary' : 'bordered'} minWidth={168} icon={<Upload size={17} />} loading={importing} onClick={(event) => { event.stopPropagation(); setEntryMode('upload'); uploadInputRef.current?.click() }}>上传试卷</MetisButton>
        <input ref={uploadInputRef} type="file" hidden accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => { void uploadPaper(event.target.files?.[0]); event.currentTarget.value = '' }} />
      </article>
      <article className={`answer-sheet-entry-card entry-blank-card ${entryMode === 'blank' ? 'active' : ''}`} onClick={() => setEntryMode('blank')}>
        <div className="entry-icon"><FilePlus2 size={24} /></div>
        <div className="entry-copy"><span>暂时没有试卷</span><h2>空白新建答题卡</h2><p>从空白卡或模板开始，手动添加题组，设置题号、分值、答案和作答区域。</p></div>
        <div className="entry-capabilities"><span>添加题组</span><span>设置答案</span><span>自由排版</span></div>
        <MetisButton className="entry-action-button" type={entryMode === 'blank' ? 'primary' : 'bordered'} minWidth={168} icon={<FilePlus2 size={17} />} onClick={(event) => { event.stopPropagation(); setEntryMode('blank'); setCreateOpen(true) }}>新建答题卡</MetisButton>
      </article>
    </section>

    {entryMode === 'blank' && <div className="blank-card-library"><div className="library-section-title"><div><h2>我的答题卡</h2><p>继续编辑、复制或下载已创建的答题卡。</p></div></div>

    <section className="library-toolbar">
      <MetisInput prefix={<Search size={15} />} placeholder="搜索答题卡名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear />
      <MetisSelect value={subject} onChange={(value) => setSubject(String(value))} options={['全部学科', '语文', '数学', '英语', '物理'].map((label, index) => ({ label, value: index === 0 ? 'all' : label }))} />
      <span>{visibleRecords.length} 张答题卡</span>
    </section>

    <section className="card-list-panel">
      <div className="card-list-head"><span>答题卡名称</span><span>学科</span><span>页数</span><span>创建人</span><span>更新时间</span><span>状态</span><span>操作</span></div>
      {visibleRecords.length ? visibleRecords.map((record) => {
        const meta = statusMeta[record.status]
        return <div className="card-list-row" key={record.id}>
          <div className="record-name"><FileText size={18} /><div><strong>{record.name}</strong><small>无关联试卷 · 可继续编辑题号与版式</small></div></div>
          <span>{record.subject}</span><span>{record.pages} 页</span><span>{record.creator}</span><span>{record.updatedAt}</span><MetisTag preset={meta.preset}>{meta.label}</MetisTag>
          <div className="record-actions">
            <MetisButton type="borderless" size="s" icon={<Edit3 size={14} />} onClick={() => openRecord(record)}>编辑</MetisButton>
            <MetisButton type="borderless" size="s" icon={<Copy size={14} />} onClick={() => { setItems((current) => [{ ...record, id: `${record.id}-copy-${Date.now()}`, name: `${record.name}（副本）`, updatedAt: '刚刚', status: 'draft' }, ...current]); MetisMessage.success(`已复制“${record.name}”`) }}>复制</MetisButton>
            <MetisButton type="borderless" size="s" icon={record.status === 'draft' ? <Upload size={14} /> : <Download size={14} />} onClick={() => MetisMessage.info(record.status === 'draft' ? '演示：上传配套原题' : '演示：下载最新版 PDF')}>{record.status === 'draft' ? '上传原题' : '下载'}</MetisButton>
          </div>
        </div>
      }) : <div className="library-empty"><FileText size={36} /><strong>没有找到答题卡</strong><span>调整筛选条件，或新建一张空白答题卡</span></div>}
    </section></div>}

    <MetisDialog open={createOpen} title="新建答题卡" width={520} footer={footer} onCancel={() => setCreateOpen(false)}>
      <div className="create-card-form">
        <label><span>答题卡名称</span><MetisInput value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>学科</span><MetisSelect value={newSubject} onChange={(value) => setNewSubject(String(value))} options={['语文', '数学', '英语', '物理', '化学', '道德与法治'].map((value) => ({ label: value, value }))} /></label>
        <label><span>起始模板</span><MetisSelect value={templateId} onChange={(value) => setTemplateId(String(value))} options={answerSheetTemplates.filter((template) => template.id === 'true-blank' || template.id === 'science-lab-school' || template.id === 'beijing-english-standard').map((template) => ({ label: template.id === 'true-blank' ? '纯空白卡' : template.name, value: template.id }))} /></label>
        <p>模板只作为起点。进入编辑器后可添加题块、拖动、合并、分割，并可删除或隐藏老师插入内容的边框。</p>
      </div>
    </MetisDialog>
  </div>
}
