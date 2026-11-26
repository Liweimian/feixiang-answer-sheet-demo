import { useCallback, useMemo, useRef, useState } from 'react'
import { MetisButton, MetisDialog, MetisInput, MetisMessage, MetisSelect } from '@yuanfudao/metis-web-component'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Copy, Download, Edit3, Eye, FileCheck2, FilePlus2, Files, FileText, Link2, ListChecks, MoreHorizontal, Search, Upload } from 'lucide-react'
import { answerSheetTemplates, instantiateTemplate } from '../data/answerSheetTemplates'
import type { AnswerBlock, AnswerSheetDocument } from '../features/answer-sheet/types'
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

const examTypes = ['随堂测验', '单元练习', '期中期末', '中考模拟', '高考模拟'] as const
const templateSubjects = ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'] as const
type ExamType = typeof examTypes[number]
type TemplatePreset = { id: string; examType: ExamType; subject: string; grade: string; name: string; structure: string; baseId: string; variant?: 'objective' | 'subjective' }
const templatePresets: TemplatePreset[] = [
  { id: 'quiz-math', examType: '随堂测验', subject: '数学', grade: '小学', name: '数学随堂测验', structure: '选择题 · 解答题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'quiz-english', examType: '随堂测验', subject: '英语', grade: '初中', name: '英语随堂测验', structure: '选择题 · 填空题 · 作文题', baseId: 'beijing-english-standard' },
  { id: 'quiz-physics', examType: '随堂测验', subject: '物理', grade: '初中', name: '物理随堂测验', structure: '选择题 · 实验计算 · 作图题', baseId: 'science-lab-school' },
  { id: 'quiz-math-objective', examType: '随堂测验', subject: '数学', grade: '小学', name: '数学选择专项', structure: '选择题', baseId: 'general-a4-smart', variant: 'objective' },
  { id: 'quiz-physics-lab', examType: '随堂测验', subject: '物理', grade: '初中', name: '物理实验专项', structure: '实验计算 · 作图题 · 数据分析', baseId: 'science-lab-school', variant: 'subjective' },
  { id: 'unit-physics', examType: '单元练习', subject: '物理', grade: '初中', name: '物理单元练习', structure: '选择题 · 实验计算 · 作图题', baseId: 'science-lab-school' },
  { id: 'unit-math', examType: '单元练习', subject: '数学', grade: '初中', name: '数学单元练习', structure: '选择题 · 解答题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'unit-english', examType: '单元练习', subject: '英语', grade: '初中', name: '英语单元练习', structure: '客观题 · 阅读理解 · 作文题', baseId: 'beijing-english-standard' },
  { id: 'unit-math-objective', examType: '单元练习', subject: '数学', grade: '初中', name: '数学选择专项', structure: '选择题', baseId: 'general-a4-smart', variant: 'objective' },
  { id: 'unit-physics-lab', examType: '单元练习', subject: '物理', grade: '初中', name: '物理实验专项', structure: '实验计算 · 作图题 · 数据分析', baseId: 'science-lab-school', variant: 'subjective' },
  { id: 'term-english', examType: '期中期末', subject: '英语', grade: '初中', name: '英语期中期末', structure: '客观题 · 阅读理解 · 作文题', baseId: 'beijing-english-standard' },
  { id: 'term-physics', examType: '期中期末', subject: '物理', grade: '初中', name: '物理期中期末', structure: '选择题 · 实验计算 · 作图题', baseId: 'science-lab-school' },
  { id: 'term-math', examType: '期中期末', subject: '数学', grade: '初中', name: '数学期中期末', structure: '选择题 · 解答题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'term-english-objective', examType: '期中期末', subject: '英语', grade: '初中', name: '英语客观题专项', structure: '单项填空 · 完形填空 · 阅读理解', baseId: 'beijing-english-standard', variant: 'objective' },
  { id: 'term-physics-lab', examType: '期中期末', subject: '物理', grade: '初中', name: '物理实验专题', structure: '实验计算 · 作图题 · 数据分析', baseId: 'science-lab-school', variant: 'subjective' },
  { id: 'middle-english', examType: '中考模拟', subject: '英语', grade: '初三', name: '英语中考模拟', structure: '客观题 · 阅读理解 · 作文题', baseId: 'beijing-english-standard' },
  { id: 'middle-science', examType: '中考模拟', subject: '物理', grade: '初三', name: '物理中考模拟', structure: '客观题 · 实验计算 · 作图题', baseId: 'science-lab-school' },
  { id: 'middle-math', examType: '中考模拟', subject: '数学', grade: '初三', name: '数学中考模拟', structure: '选择题 · 解答题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'middle-english-objective', examType: '中考模拟', subject: '英语', grade: '初三', name: '英语客观题模拟', structure: '单项填空 · 完形填空 · 阅读理解', baseId: 'beijing-english-standard', variant: 'objective' },
  { id: 'middle-physics-lab', examType: '中考模拟', subject: '物理', grade: '初三', name: '物理实验模拟', structure: '实验计算 · 作图题 · 数据分析', baseId: 'science-lab-school', variant: 'subjective' },
  { id: 'high-math', examType: '高考模拟', subject: '数学', grade: '高中', name: '数学高考模拟', structure: '选择题 · 解答题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'high-english', examType: '高考模拟', subject: '英语', grade: '高中', name: '英语高考模拟', structure: '客观题 · 阅读理解 · 作文题', baseId: 'beijing-english-standard' },
  { id: 'high-physics', examType: '高考模拟', subject: '物理', grade: '高中', name: '物理高考模拟', structure: '选择题 · 实验计算 · 作图题', baseId: 'science-lab-school' },
  { id: 'high-math-objective', examType: '高考模拟', subject: '数学', grade: '高中', name: '数学选择专项', structure: '选择题', baseId: 'general-a4-smart', variant: 'objective' },
  { id: 'high-physics-lab', examType: '高考模拟', subject: '物理', grade: '高中', name: '物理实验专题', structure: '实验计算 · 作图题 · 数据分析', baseId: 'science-lab-school', variant: 'subjective' },
  { id: 'quiz-chinese', examType: '随堂测验', subject: '语文', grade: '初中', name: '语文随堂测验', structure: '选择题 · 阅读理解 · 作文题', baseId: 'beijing-english-standard' },
  { id: 'unit-chemistry', examType: '单元练习', subject: '化学', grade: '初中', name: '化学单元练习', structure: '选择题 · 填空题 · 实验题', baseId: 'science-lab-school' },
  { id: 'term-biology', examType: '期中期末', subject: '生物', grade: '初中', name: '生物期中期末', structure: '选择题 · 填空题 · 综合题', baseId: 'science-lab-school' },
  { id: 'middle-history', examType: '中考模拟', subject: '历史', grade: '初三', name: '历史中考模拟', structure: '选择题 · 材料题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'high-geography', examType: '高考模拟', subject: '地理', grade: '高中', name: '地理高考模拟', structure: '选择题 · 填空题 · 综合题', baseId: 'general-a4-smart' },
  { id: 'high-politics', examType: '高考模拟', subject: '政治', grade: '高中', name: '政治高考模拟', structure: '选择题 · 材料题 · 综合题', baseId: 'general-a4-smart' },
]

function blocksForPreset(blocks: AnswerBlock[], preset: TemplatePreset): AnswerBlock[] {
  if (preset.variant === 'objective') return blocks.filter((block) => block.kind === 'objective')
  if (preset.variant === 'subjective') return blocks.filter((block) => isAnswerableBlock(block) && block.kind !== 'objective')
  return blocks
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

export function AnswerSheetListPage({ onEdit, onExperienceFromPaper, associatedFiles, onAssociateFile }: AnswerSheetListPageProps) {
  const [toolOpen, setToolOpen] = useState(false)
  const recommendedSubject = '数学'
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
  const [templateBrowseOpen, setTemplateBrowseOpen] = useState(false)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'ai' | 'template'>('ai')
  const [name, setName] = useState('未命名答题卡')
  const [newSubject, setNewSubject] = useState('英语')
  const [templateId, setTemplateId] = useState('true-blank')
  const [templateCategory, setTemplateCategory] = useState<ExamType | '全部'>('全部')
  const [selectedPresetId, setSelectedPresetId] = useState('quiz-math')
  const [templateSubjectFilter, setTemplateSubjectFilter] = useState('全部')
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
    setTemplateBrowseOpen(false)
    setTemplatePreviewOpen(false)
    const baseDocument = createDocument(trimmed, newSubject, templateId)
    const selectedPreset = createMode === 'template' ? templatePresets.find((preset) => preset.id === selectedPresetId) : undefined
    const presetBlocks = selectedPreset ? blocksForPreset(baseDocument.blocks, selectedPreset) : baseDocument.blocks
    const presetPageCount = selectedPreset?.variant ? Math.max(1, ...presetBlocks.map((block) => block.page)) : baseDocument.pageCount
    const nextDocument = { ...baseDocument, blocks: presetBlocks, pageCount: presetPageCount, paper: { ...baseDocument.paper, grade: selectedPreset?.grade ?? baseDocument.paper.grade, examType: selectedPreset?.examType ?? baseDocument.paper.examType, score: presetBlocks.reduce((sum, block) => sum + (block.score ?? 0), 0) }, settings: { ...baseDocument.settings, paperSize, frontColumns: columns, backColumns: columns } }
    setLocalDocuments((current) => ({ ...current, [nextDocument.paper.id]: nextDocument }))
    setItems((current) => [{ id: nextDocument.paper.id, name: trimmed, subject: newSubject, templateId, updatedAt: '刚刚', pages: nextDocument.pageCount, status: 'draft', creator: '李老师' }, ...current])
    onEdit(nextDocument, undefined, nextDocument.paper.id)
  }

  const createBlankCard = () => {
    setTemplateBrowseOpen(false)
    setTemplatePreviewOpen(false)
    const blankName = '未命名答题卡'
    const document = createDocument(blankName, newSubject, 'true-blank')
    setLocalDocuments((current) => ({ ...current, [document.paper.id]: document }))
    setItems((current) => [{ id: document.paper.id, name: blankName, subject: newSubject, templateId: 'true-blank', updatedAt: '刚刚', pages: document.pageCount, status: 'draft', creator: '李老师' }, ...current])
    onEdit(document, undefined, document.paper.id)
  }

  const openTemplateCreate = () => {
    setCreateMode('template')
    setTemplateCategory('全部')
    setTemplateSubjectFilter('全部')
    setSelectedPresetId('quiz-math')
    setTemplateId('general-a4-smart')
    setNewSubject('数学')
    setName('数学随堂测验答题卡')
    setPaperSize('A4')
    setColumns(2)
    setTemplateBrowseOpen(true)
    setTemplatePreviewOpen(false)
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

  if (templateBrowseOpen) {
    const selectedPreset = templatePresets.find((preset) => preset.id === selectedPresetId) ?? templatePresets[0]
    const selectedBase = answerSheetTemplates.find((template) => template.id === selectedPreset.baseId)!
    const visiblePresets = templatePresets.filter((preset) => (templateCategory === '全部' || preset.examType === templateCategory) && (templateSubjectFilter === '全部' || preset.subject === templateSubjectFilter))
    const selectedPreviewBlocks = blocksForPreset(selectedBase.document.blocks, selectedPreset)
    const templateBlocks = selectedPreviewBlocks.filter(isAnswerableBlock)
    const templatePageCount = selectedPreset.variant ? Math.max(1, ...selectedPreviewBlocks.map((block) => block.page)) : selectedBase.document.pageCount
    const templateQuestionCount = new Set(templateBlocks.flatMap((block) => questionNumbers(block.range))).size
    const templateScore = templateBlocks.reduce((sum, block) => sum + (block.score ?? 0), 0)
    const templateTypeRows = Array.from(templateBlocks.reduce((groups, block) => {
      const title = block.title.replace(/^[一二三四五六七八九十]+[、.．]\s*/, '').replace(/\s*\d+(?:[–—-]\d+)?$/, '').trim()
      const current = groups.get(title) ?? { title, numbers: new Set<number>(), score: 0 }
      questionNumbers(block.range).forEach((number) => current.numbers.add(number))
      current.score += block.score ?? 0
      groups.set(title, current)
      return groups
    }, new Map<string, { title: string; numbers: Set<number>; score: number }>() ).values())
    return <div className="template-browser-page">
      <header className="template-browser-header"><button type="button" onClick={() => setTemplateBrowseOpen(false)}><ChevronLeft size={18} />返回制卡工具</button><strong>选模板制卡</strong></header>
      <div className="template-browser-layout">
        <main className="template-browser-main">
          <div className="template-browser-intro"><h1>选择答题卡模板</h1></div>
          <div className="template-browser-filter-row"><span>学科：</span><div className="template-browser-subjects" aria-label="学科">{templateSubjects.map((item) => <button type="button" key={item} className={templateSubjectFilter === item ? 'is-selected' : ''} onClick={() => setTemplateSubjectFilter(item)}>{item}</button>)}</div></div>
          <div className="template-browser-filter-row"><span>场景：</span><nav className="template-browser-categories" aria-label="场景">{(['全部', ...examTypes] as const).map((examType) => <button type="button" key={examType} className={templateCategory === examType ? 'is-selected' : ''} onClick={() => { setTemplateCategory(examType); setTemplateSubjectFilter('全部'); const first = templatePresets.find((preset) => examType === '全部' || preset.examType === examType)!; setSelectedPresetId(first.id); setTemplateId(first.baseId); setNewSubject(first.subject); setName(`${first.name}答题卡`); const base = answerSheetTemplates.find((template) => template.id === first.baseId)!; setPaperSize(base.paperSize === '16K' ? 'A4' : base.paperSize); setColumns(base.columns === 2 ? 2 : 1) }}>{examType}</button>)}</nav></div>
          <div className="template-browser-grid">{visiblePresets.length ? visiblePresets.map((preset) => {
            const base = answerSheetTemplates.find((template) => template.id === preset.baseId)!
            const blocks = blocksForPreset(base.document.blocks, preset).filter(isAnswerableBlock)
            const count = new Set(blocks.flatMap((block) => questionNumbers(block.range))).size
            const score = blocks.reduce((sum, block) => sum + (block.score ?? 0), 0)
            return <button type="button" key={preset.id} className="template-browser-card" onClick={() => { setSelectedPresetId(preset.id); setTemplateId(preset.baseId); setNewSubject(preset.subject); setName(`${preset.name}答题卡`); setPaperSize(base.paperSize === '16K' ? 'A4' : base.paperSize); setColumns(base.columns === 2 ? 2 : 1); setTemplatePreviewOpen(true) }}>
              <span className="template-browser-preview"><span className="template-preview-paper"><b>答题卡</b><em>姓名 ______　班级 ______</em>{blocks.slice(0, 4).map((block) => <span key={block.id}><strong>{block.title}</strong><i /><i /></span>)}</span></span>
              <span className="template-browser-card-copy"><strong>{preset.name}</strong><small>{preset.subject} · {count} 题 · {score} 分 · {base.paperSize}</small></span>
            </button>
          }) : <div className="template-browser-empty">该考试类型暂没有{templateSubjectFilter}模板，请选择其他学科。</div>}</div>
        </main>
      </div>
      {templatePreviewOpen && <div className="template-preview-backdrop" role="presentation" onClick={() => setTemplatePreviewOpen(false)}><div className="template-preview-dialog" role="dialog" aria-modal="true" aria-label={`${selectedPreset.name}模板预览`} onClick={(event) => event.stopPropagation()}>
        <div className="template-preview-content"><div className="template-preview-title"><strong>{selectedPreset.name} · 完整预览</strong><span className="template-detail-paper">{selectedBase.paperSize} · {selectedBase.columns === 2 ? '双栏' : '单栏'} · {templatePageCount} 页</span><button type="button" aria-label="关闭预览" onClick={() => setTemplatePreviewOpen(false)}>×</button></div><div className="template-preview-body"><aside className="template-preview-info"><div className="template-preview-info-scroll"><div className="template-detail-score"><strong>共 {templateQuestionCount} 道</strong><strong>共 {templateScore} 分</strong></div><div className="template-detail-blocks">{templateTypeRows.map((row) => <div key={row.title}><span>{row.title}</span><span>{row.numbers.size} 题 · {row.score} 分</span></div>)}</div></div></aside><div className="template-preview-pages">{Array.from({ length: templatePageCount }, (_, pageIndex) => <section className="template-preview-page" key={pageIndex}><h3>{selectedPreset.name}答题卡</h3><div className="template-preview-identity">学校 __________　姓名 __________　班级 ______　学号 __________</div>{selectedPreviewBlocks.filter((block) => block.page === pageIndex + 1).map((block) => <div className="template-preview-block" key={block.id}><strong>{block.title}{block.range ? `　${block.range}` : ''}</strong>{block.kind === 'objective' ? <div className="template-preview-options">{questionNumbers(block.range).map((number) => <span key={number}>{number}.　[A]　[B]　[C]　[D]</span>)}</div> : block.kind === 'forbidden' ? <p>请勿在此区域作答</p> : <div className="template-preview-lines">{Array.from({ length: Math.min(Math.max(block.lineCount ?? 4, 4), 12) }, (_, line) => <i key={line} />)}</div>}</div>)}<footer>第 {pageIndex + 1} 页 / 共 {templatePageCount} 页</footer></section>)}</div></div><div className="template-preview-actions"><button type="button" className="template-detail-primary" onClick={createCard}>直接使用 <ArrowRight size={17} /></button></div></div>
      </div></div>}
    </div>
  }

  return <div className={`answer-sheet-library${toolOpen ? ' tool-library-open' : ''}${toolOpen ? ' tool-library-alternative' : ''}`}>
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
      <section className="home-template-section" aria-label="答题卡模板">
        <header className="home-template-heading"><h1>模板</h1><button type="button" className="home-template-more" onClick={() => { openTemplateCreate(); setTemplateSubjectFilter(recommendedSubject) }}>查看更多<ChevronRight size={16} /></button></header>
        <div className="home-template-shelf">
          <button type="button" className="home-template-tile" onClick={createBlankCard}><span className="home-template-sheet home-template-empty"><FilePlus2 size={32} /></span><strong>空白答题卡</strong></button>
          <button type="button" className="home-template-tile" disabled={importing} onClick={() => uploadInputRef.current?.click()}><span className="home-template-sheet home-template-upload"><Upload size={30} /><span>{importing ? '正在识别…' : '上传试卷'}</span></span><strong>上传试卷制卡</strong></button>
          {templatePresets.filter((preset) => preset.subject === recommendedSubject).slice(0, 5).map((preset) => {
            const base = answerSheetTemplates.find((template) => template.id === preset.baseId)!
            const previewBlocks = blocksForPreset(base.document.blocks, preset).filter(isAnswerableBlock)
            return <button type="button" className="home-template-tile" key={preset.id} onClick={() => {
              openTemplateCreate(); setTemplateSubjectFilter(recommendedSubject); setSelectedPresetId(preset.id); setTemplateId(preset.baseId); setNewSubject(preset.subject); setName(`${preset.name}答题卡`); setPaperSize(base.paperSize === '16K' ? 'A4' : base.paperSize); setColumns(base.columns === 2 ? 2 : 1); setTemplatePreviewOpen(true)
            }}><span className="home-template-sheet home-template-miniature"><b>{preset.name}答题卡</b><em>姓名 ______　班级 ______</em>{previewBlocks.slice(0, 4).map((block) => <span key={block.id}><strong>{block.title}</strong><i /><i /><i /></span>)}</span><strong>{preset.name}</strong></button>
          })}
        </div>
      </section>
      <div className="tool-library-section-heading"><h2>我的答题卡</h2></div>
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
            <div className="record-name"><span className="record-subject" title="学科"><BookOpen size={14} />{record.subject}</span><strong>{record.name}</strong></div>
            <div className="record-summary"><span>共 {questionCount} 题</span><span>共 {scoreLabel} 分</span><span>{paperLabel}</span></div>
          </div>
          <time className="record-updated" title="更新时间"><Clock3 size={14} />{record.updatedAt}</time>
          <div className="record-actions" onClick={(event) => event.stopPropagation()}>
            <MetisButton className="card-action-button" type="borderless" size="s" icon={<Edit3 size={14} />} onClick={() => openRecord(record)}>编辑</MetisButton>
            <MetisButton className="card-action-button" type="borderless" size="s" icon={<Download size={14} />} onClick={() => MetisMessage.info('演示：下载最新版 PDF')}>下载</MetisButton>
            <MetisButton className="card-action-button" type="borderless" size="s" icon={<Copy size={14} />} onClick={() => { setItems((current) => [{ ...record, id: `${record.id}-copy-${Date.now()}`, name: `${record.name}（副本）`, updatedAt: '刚刚', status: 'draft', sourceFile: undefined }, ...current]); MetisMessage.success(`已复制“${record.name}”`) }}>复制</MetisButton>
            <details className="record-more" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false }}>
              <summary><MoreHorizontal size={14} />更多</summary>
              <div className="record-more-menu">
                {fileForRecord(record) ? <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setSourceFile(fileForRecord(record)) }}><Eye size={15} />查看原卷</button>
                  : <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); associateRecordIdRef.current = record.id; associateInputRef.current?.click() }}><Link2 size={15} />关联原卷</button>}
                <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setAnswerRecord(record) }}><ListChecks size={15} />设置答案</button>
              </div>
            </details>
          </div>
        </article>
      }) : <div className="library-empty"><FileText size={36} /><strong>没有找到答题卡</strong><span>调整筛选条件，或新建一张空白答题卡</span></div>}
    </section></div>}

    <MetisDialog open={createOpen} title={createMode === 'template' ? '选择模板制卡' : '新建答题卡'} width={createMode === 'template' ? 760 : 520} footer={footer} onCancel={() => setCreateOpen(false)}>
      <div className="create-card-form">
        {createMode === 'ai' && <div className="create-ai-prompt"><strong>✦ 告诉 AI 想制作什么答题卡</strong><div><input value={createPrompt} onChange={(event) => setCreatePrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyCreatePrompt() } }} placeholder="如：初中英语小测，A4 单栏" /><button type="button" onClick={applyCreatePrompt}>生成建议</button></div>{createSuggestion && <p>{createSuggestion}</p>}</div>}
        {createMode === 'template' && <div className="template-library-picker">
          <div className="template-exam-types" aria-label="考试类型">{examTypes.map((examType) => <button key={examType} type="button" className={templateCategory === examType ? 'is-selected' : ''} onClick={() => { const first = templatePresets.find((preset) => preset.examType === examType)!; setTemplateCategory(examType); setSelectedPresetId(first.id); setTemplateId(first.baseId); setNewSubject(first.subject); setName(`${first.name}答题卡`); const base = answerSheetTemplates.find((template) => template.id === first.baseId)!; setPaperSize(base.paperSize === '16K' ? 'A4' : base.paperSize); setColumns(base.columns === 2 ? 2 : 1) }}>{examType}</button>)}</div>
          <div className="template-preset-grid">{templatePresets.filter((preset) => preset.examType === templateCategory).map((preset) => {
            const base = answerSheetTemplates.find((template) => template.id === preset.baseId)!
            return <button type="button" key={preset.id} className={`template-preset-card${selectedPresetId === preset.id ? ' is-selected' : ''}`} onClick={() => { setSelectedPresetId(preset.id); setTemplateId(preset.baseId); setNewSubject(preset.subject); setName(`${preset.name}答题卡`); setPaperSize(base.paperSize === '16K' ? 'A4' : base.paperSize); setColumns(base.columns === 2 ? 2 : 1) }}>
              <span className="template-preset-preview"><span /><i /><i /><i /></span>
              <span className="template-preset-info"><strong>{preset.name}</strong><small>{preset.grade} · {preset.subject} · {base.paperSize} {base.columns === 2 ? '双栏' : '单栏'}</small><small>{preset.structure}</small></span>
              <span className="template-preset-check">{selectedPresetId === preset.id ? '已选' : '选择'}</span>
            </button>
          })}</div>
        </div>}
        <label><span>答题卡名称</span><MetisInput value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>学科</span><MetisSelect value={newSubject} onChange={(value) => setNewSubject(String(value))} options={['语文', '数学', '英语', '物理', '化学', '道德与法治'].map((value) => ({ label: value, value }))} /></label>
        {createMode === 'ai' && <label><span>起始模板</span><MetisSelect value={templateId} onChange={(value) => setTemplateId(String(value))} options={answerSheetTemplates.filter((template) => ['science-lab-school', 'beijing-english-standard', 'true-blank'].includes(template.id)).map((template) => ({ label: template.id === 'true-blank' ? '纯空白卡' : template.name, value: template.id }))} /></label>}
        <label><span>纸张</span><MetisSelect value={paperSize} onChange={(value) => setPaperSize(value as 'A4' | 'A3' | '8K')} options={['A4', 'A3', '8K'].map((value) => ({ label: value, value }))} /></label>
        <label><span>分栏</span><MetisSelect value={columns} onChange={(value) => setColumns(Number(value) as 1 | 2)} options={[{ label: '单栏', value: 1 }, { label: '双栏', value: 2 }]} /></label>
      </div>
    </MetisDialog>
    <SourcePaperPreviewDialog file={sourceFile} onClose={() => setSourceFile(undefined)} />
    <ObjectiveAnswerDialog open={Boolean(answerRecord)} blocks={answerDocument?.blocks ?? []} onClose={() => setAnswerRecord(undefined)} onSave={saveRecordAnswers} />
  </div>
}
