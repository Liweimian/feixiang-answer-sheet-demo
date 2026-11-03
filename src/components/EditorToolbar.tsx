import {
  MetisButton,
  MetisSelect,
  MetisTabs,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import { ChevronLeft, LayoutTemplate, Printer, Redo2, Save, Settings2, ShieldCheck, Undo2 } from 'lucide-react'
import type { CardMode, ExamPaper, RulePack } from '../features/answer-sheet/types'

interface EditorToolbarProps {
  paper: ExamPaper
  mode: CardMode
  rulePacks: RulePack[]
  rulePackId: string
  templateName: string
  draftVersion: number
  publishedVersion?: number
  saving: boolean
  savedAt: string
  canUndo: boolean
  canRedo: boolean
  onBack: () => void
  onModeChange: (mode: CardMode) => void
  onRulePackChange: (id: string) => void
  onOpenTemplates: () => void
  onOpenPaperSettings: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onPreflight: () => void
  onPrint: () => void
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    paper,
    mode,
    rulePacks,
    rulePackId,
    draftVersion,
    publishedVersion,
    saving,
    savedAt,
  } = props
  const isPublishedCurrent = publishedVersion === draftVersion

  return (
    <section className="editor-toolbar" data-sec="3">
      <div className="editor-title-row">
        <MetisButton type="borderless" icon={<ChevronLeft size={17} />} onClick={props.onBack}>返回</MetisButton>
        <div className="editor-paper-title">
          <strong>{paper.title}</strong>
          <span>{paper.subject} · {paper.score} 分 · {paper.durationMinutes} 分钟 · {props.templateName}</span>
        </div>
        <MetisTag preset={isPublishedCurrent ? 'success' : publishedVersion ? 'warning' : 'primary'}>
          {isPublishedCurrent ? `V${draftVersion} 已发布` : publishedVersion ? `V${draftVersion} 新草稿` : `V${draftVersion} 草稿`}
        </MetisTag>
        {publishedVersion && !isPublishedCurrent && <span className="published-chip">V{publishedVersion} 已发布且不可变</span>}
      </div>

      <div className="editor-control-row">
        <MetisTabs
          activeKey={mode}
          onChange={(key) => props.onModeChange(key as CardMode)}
          items={[
            { key: 'smart', label: '飞象模式' },
            { key: 'standard', label: '大考规范模式' },
          ]}
        />
        {mode === 'standard' && (
          <MetisSelect
            className="rule-pack-select"
            value={rulePackId}
            options={rulePacks.map((pack) => ({ label: pack.shortName, value: pack.id }))}
            onChange={(value) => props.onRulePackChange(String(value))}
          />
        )}
        <MetisButton type="bordered" icon={<LayoutTemplate size={15} />} onClick={props.onOpenTemplates}>更换模板</MetisButton>
        <MetisButton type="bordered" icon={<Settings2 size={15} />} onClick={props.onOpenPaperSettings}>基础信息</MetisButton>
        <div className="toolbar-spacer" />
        <span className="autosave-status">{saving ? '正在保存…' : `已自动保存 ${savedAt}`}</span>
        <MetisButton type="borderless" icon={<Undo2 size={16} />} disabled={!props.canUndo} onClick={props.onUndo} aria-label="撤销" />
        <MetisButton type="borderless" icon={<Redo2 size={16} />} disabled={!props.canRedo} onClick={props.onRedo} aria-label="重做" />
        <MetisButton type="bordered" icon={<Save size={16} />} loading={saving} onClick={props.onSave}>立即保存</MetisButton>
        <MetisButton type="bordered" icon={<Printer size={16} />} onClick={props.onPrint}>打印预览</MetisButton>
        <MetisButton
          type="primary"
          icon={<ShieldCheck size={16} />}
          onClick={props.onPreflight}
          data-track="/click/answerSheetEditor/preflight | 打开印前校验 | mode,rulePack"
        >
          {isPublishedCurrent ? `查看 / 下载 V${draftVersion}` : '校验并发布'}
        </MetisButton>
      </div>
    </section>
  )
}
