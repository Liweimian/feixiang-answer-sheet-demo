import { useEffect, useState } from 'react'
import {
  MetisButton,
  MetisDialog,
  MetisInput,
  MetisInputNumber,
  MetisSelect,
} from '@yuanfudao/metis-web-component'
import type { ExamPaper } from '../features/answer-sheet/types'

interface PaperSettingsDialogProps {
  open: boolean
  paper: ExamPaper
  pageCount: number
  onClose: () => void
  onSave: (paper: ExamPaper, pageCount: number) => void
}

export function PaperSettingsDialog(props: PaperSettingsDialogProps) {
  const [draft, setDraft] = useState(props.paper)
  const [pages, setPages] = useState(props.pageCount)

  useEffect(() => {
    if (!props.open) return
    setDraft({ ...props.paper, sections: props.paper.sections.map((section) => ({ ...section })) })
    setPages(props.pageCount)
  }, [props.open, props.pageCount, props.paper])

  const footer = (
    <div className="dialog-footer-actions">
      <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
      <MetisButton type="primary" disabled={!draft.title.trim() || draft.subject === '未设置'} onClick={() => props.onSave({ ...draft, title: draft.title.trim() }, pages)}>
        保存基础信息
      </MetisButton>
    </div>
  )

  return (
    <MetisDialog open={props.open} title="答题卡基础信息" width={560} footer={footer} onCancel={props.onClose}>
      <div className="paper-settings-form">
        <label className="paper-settings-wide">
          <span>试卷标题</span>
          <MetisInput maxLength={36} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label>
          <span>地区</span>
          <MetisSelect
            value={draft.region}
            options={['通用', '北京', '深圳'].map((value) => ({ value, label: value }))}
            onChange={(value) => setDraft((current) => ({ ...current, region: String(value) }))}
          />
        </label>
        <label>
          <span>学段 / 年级</span>
          <MetisSelect
            value={draft.grade}
            options={['未设置', '小学', '初中', '初一', '初二', '初三', '高中', '高一', '高二', '高三'].map((value) => ({ value, label: value }))}
            onChange={(value) => setDraft((current) => ({ ...current, grade: String(value) }))}
          />
        </label>
        <label>
          <span>学科</span>
          <MetisSelect
            value={draft.subject}
            options={['未设置', '语文', '数学', '英语', '物理', '化学', '物理+化学合卷', '道德与法治', '历史', '综合'].map((value) => ({ value, label: value }))}
            onChange={(value) => setDraft((current) => ({ ...current, subject: String(value) }))}
          />
        </label>
        <label>
          <span>考试类型</span>
          <MetisSelect
            value={draft.examType}
            options={['单元检测', '周测', '期中', '期末', '一模', '中考模拟', '自定义'].map((value) => ({ value, label: value }))}
            onChange={(value) => setDraft((current) => ({ ...current, examType: String(value) }))}
          />
        </label>
        <label>
          <span>考试时长</span>
          <MetisInputNumber
            className="paper-setting-number"
            value={draft.durationMinutes}
            min={0}
            max={300}
            addonAfter="分钟"
            onChange={(value) => setDraft((current) => ({ ...current, durationMinutes: Number(value ?? 0) }))}
          />
        </label>
        <label>
          <span>答题卡页数</span>
          <MetisInputNumber
            className="paper-setting-number"
            value={pages}
            min={1}
            max={4}
            step={1}
            precision={0}
            addonAfter="页"
            onChange={(value) => setPages(Math.round(Number(value ?? 1)))}
          />
        </label>
        <div className="paper-settings-score">
          <span>当前总分</span>
          <strong>{draft.score} 分</strong>
          <small>{draft.sections.length === 0 ? '真正空白卡会按题块分值自动汇总' : '来自试卷结构，题块总分需与此一致'}</small>
        </div>
      </div>
    </MetisDialog>
  )
}
