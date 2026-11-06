import { MetisButton, MetisTag } from '@yuanfudao/metis-web-component'
import { ChevronLeft, Download, FileCheck2, Printer, Redo2, Save, ShieldCheck, Undo2 } from 'lucide-react'
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
        <span className="autosave-status">{props.saving ? '正在保存…' : `已自动保存 ${props.savedAt}`}</span>
        <MetisButton type="borderless" icon={<Undo2 size={16} />} disabled={!props.canUndo} onClick={props.onUndo} aria-label="撤销" />
        <MetisButton type="borderless" icon={<Redo2 size={16} />} disabled={!props.canRedo} onClick={props.onRedo} aria-label="重做" />
        <MetisButton type="bordered" icon={<Save size={16} />} loading={props.saving} onClick={props.onSave}>立即保存</MetisButton>
        <MetisButton type="bordered" icon={<Printer size={16} />} onClick={props.onPrint}>PDF / 打印</MetisButton>
        <MetisButton type="bordered" icon={<FileCheck2 size={16} />} onClick={props.onDownloadAnnotated}>带批改痕迹</MetisButton>
        <MetisButton
          type="primary"
          icon={isPublishedCurrent ? <Download size={16} /> : <ShieldCheck size={16} />}
          onClick={props.onPreflight}
          data-track="/click/answerSheetEditor/preflight | 打开印前校验 | version"
        >
          {isPublishedCurrent ? `查看 / 下载 V${props.draftVersion}` : '校验并发布'}
        </MetisButton>
      </div>
    </section>
  )
}
