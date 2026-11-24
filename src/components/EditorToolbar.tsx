import { MetisButton, MetisTag } from '@yuanfudao/metis-web-component'
import { ChevronLeft, Download, Eye, ListChecks, Save } from 'lucide-react'
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
}

export function EditorToolbar(props: EditorToolbarProps) {
  const isPublishedCurrent = props.publishedVersion === props.draftVersion
  return (
    <section className="editor-toolbar editor-toolbar-compact" data-sec="3">
      <div className="editor-title-row">
        <MetisButton type="borderless" icon={<ChevronLeft size={17} />} onClick={props.onBack}>{props.backLabel ?? '返回首页'}</MetisButton>
        <div className="editor-paper-title">
          <strong>{props.paper.title}</strong>
          <span>{props.paper.subject} · {props.paper.score} 分</span>
        </div>
        <MetisTag preset={isPublishedCurrent ? 'success' : props.publishedVersion ? 'warning' : 'primary'}>
          {isPublishedCurrent ? `V${props.draftVersion} 已发布` : props.publishedVersion ? `V${props.draftVersion} 新草稿` : `V${props.draftVersion} 草稿`}
        </MetisTag>
        {props.publishedVersion && !isPublishedCurrent && <span className="published-chip">V{props.publishedVersion} 已发布且不可变</span>}
        <div className="toolbar-spacer" />
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
