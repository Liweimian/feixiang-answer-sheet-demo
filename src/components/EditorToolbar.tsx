import { useEffect, useRef, useState } from 'react'
import { MetisButton } from '@yuanfudao/metis-web-component'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Eye, Link2, ListChecks, Save } from 'lucide-react'
import type { ExamPaper } from '../features/answer-sheet/types'

interface EditorToolbarProps {
  paper: ExamPaper
  draftVersion: number
  publishedVersion?: number
  saving: boolean
  savedAt: string
  backLabel?: string
  canUndo: boolean
  canRedo: boolean
  onBack: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onPreflight: () => void
  onPrint: () => void
  onDownloadAnnotated: () => void
  onAnswers: () => void
  hasAnswerBlocks: boolean
  fromPaper: boolean
  originalPaperOpen: boolean
  onOriginalPaper: () => void
  onUploadedOriginal?: () => void
  onLinkOriginal?: () => void
  onStageSubjectChange: (stage: string, subject: string) => void
}

export function EditorToolbar(props: EditorToolbarProps) {
  const currentStage = props.paper.grade.includes('高中') || props.paper.grade.startsWith('高') ? '高中' : props.paper.grade.includes('初中') || props.paper.grade.startsWith('初') ? '初中' : '小学'
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false)
  const [menuStage, setMenuStage] = useState(currentStage)
  const subjectMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!subjectMenuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!subjectMenuRef.current?.contains(event.target as Node)) setSubjectMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [subjectMenuOpen])
  const subjects = menuStage === '小学' ? ['语文', '数学', '英语', '科学', '道德与法治'] : ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治']
  return (
    <section className="editor-toolbar editor-toolbar-compact" data-sec="3">
      <div className="editor-title-row">
        <button type="button" className="editor-back-link" onClick={props.onBack}><ChevronLeft size={16} />{props.backLabel ?? '返回首页'}</button>
        <div className="editor-paper-title">
          <strong>{props.paper.title}</strong>
        </div>
        {!props.fromPaper && <div className="editor-stage-subject" ref={subjectMenuRef}>
          <button type="button" className="editor-stage-subject-trigger" aria-label="切换学段和学科" aria-expanded={subjectMenuOpen} onClick={() => { setMenuStage(currentStage); setSubjectMenuOpen((open) => !open) }}>{currentStage} / {props.paper.subject}<ChevronDown size={15} /></button>
          {subjectMenuOpen && <div className="editor-stage-subject-menu">
            <div className="editor-stage-options">{['小学', '初中', '高中'].map((stage) => <button type="button" key={stage} className={menuStage === stage ? 'active' : ''} onClick={() => setMenuStage(stage)}>{stage}<ChevronRight size={15} /></button>)}</div>
            <div className="editor-subject-options">{subjects.map((subject) => <button type="button" key={subject} className={menuStage === currentStage && props.paper.subject === subject ? 'active' : ''} onClick={() => { props.onStageSubjectChange(menuStage, subject); setSubjectMenuOpen(false) }}>{subject}</button>)}</div>
          </div>}
        </div>}
        <div className="toolbar-spacer" />
        {props.onUploadedOriginal && <MetisButton type="bordered" icon={<Eye size={16} />} onClick={props.onUploadedOriginal}>查看原卷</MetisButton>}
        {props.onLinkOriginal && <MetisButton type="bordered" icon={<Link2 size={16} />} onClick={props.onLinkOriginal}>关联原卷</MetisButton>}
        {!props.fromPaper && <MetisButton type="bordered" icon={<ListChecks size={16} />} disabled={!props.hasAnswerBlocks} onClick={props.onAnswers}>设置答案</MetisButton>}
        {!props.fromPaper && <MetisButton type="bordered" icon={<Save size={16} />} loading={props.saving} onClick={props.onSave}>保存</MetisButton>}
        {!props.fromPaper && <MetisButton type="bordered" icon={<Download size={16} />} onClick={props.onPrint}>下载</MetisButton>}
        {props.fromPaper && <MetisButton type={props.originalPaperOpen ? 'primary' : 'bordered'} icon={<Eye size={16} />} onClick={props.onOriginalPaper}>查看原卷</MetisButton>}
        {props.fromPaper && <MetisButton type="bordered" icon={<Save size={16} />} loading={props.saving} onClick={props.onSave}>保存</MetisButton>}
        {props.fromPaper && <MetisButton type="bordered" icon={<Download size={16} />} onClick={props.onPrint}>下载</MetisButton>}
      </div>
    </section>
  )
}
