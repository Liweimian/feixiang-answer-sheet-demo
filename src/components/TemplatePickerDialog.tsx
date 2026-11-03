import { useEffect, useMemo, useState } from 'react'
import {
  MetisAlert,
  MetisButton,
  MetisDialog,
  MetisInput,
  MetisTabs,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import { Building2, Check, FileStack, Search, Sparkles, UserRound } from 'lucide-react'
import { answerSheetTemplates } from '../data/answerSheetTemplates'
import type { AnswerSheetTemplate, TemplateCategory } from '../features/answer-sheet/types'

type TemplateFilter = 'all' | TemplateCategory

interface TemplatePickerDialogProps {
  open: boolean
  context: 'create' | 'replace'
  currentTemplateId?: string
  initialFilter?: TemplateFilter
  onClose: () => void
  onApply: (template: AnswerSheetTemplate) => void
}

const originMeta = {
  system: { label: '系统模板', icon: Sparkles },
  school: { label: '学校模板', icon: Building2 },
  personal: { label: '我的模板', icon: UserRound },
}

export function TemplatePickerDialog(props: TemplatePickerDialogProps) {
  const [filter, setFilter] = useState<TemplateFilter>(props.initialFilter ?? 'all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(props.currentTemplateId ?? answerSheetTemplates[0].id)

  useEffect(() => {
    if (!props.open) return
    setFilter(props.initialFilter ?? 'all')
    setQuery('')
    setSelectedId(props.currentTemplateId ?? (props.initialFilter === 'blank' ? 'true-blank' : answerSheetTemplates[0].id))
  }, [props.currentTemplateId, props.initialFilter, props.open])

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return answerSheetTemplates.filter((template) => {
      const matchesFilter = filter === 'all' || template.category === filter
      const haystack = [template.name, template.description, ...template.tags].join(' ').toLowerCase()
      return matchesFilter && (!keyword || haystack.includes(keyword))
    })
  }, [filter, query])

  useEffect(() => {
    if (!props.open) return
    if (filteredTemplates.some((template) => template.id === selectedId)) return
    setSelectedId(filteredTemplates[0]?.id ?? '')
  }, [filteredTemplates, props.open, selectedId])

  const selected = filteredTemplates.find((template) => template.id === selectedId)
    ?? filteredTemplates[0]
  const pageOneBlocks = selected?.document.blocks.filter((block) => block.page === 1) ?? []
  const OriginIcon = selected ? originMeta[selected.origin].icon : FileStack

  const footer = (
    <div className="dialog-footer-actions template-dialog-footer">
      <span>{props.context === 'replace' ? '套用后可立即撤销，不会覆盖已发布版本' : '模板只是起点，进入画布后均可继续调整'}</span>
      <MetisButton type="borderless" onClick={props.onClose}>取消</MetisButton>
      <MetisButton type="primary" disabled={!selected} onClick={() => selected && props.onApply(selected)}>
        {props.context === 'replace' ? '套用此版式' : '使用此模板并开始编辑'}
      </MetisButton>
    </div>
  )

  return (
    <MetisDialog
      open={props.open}
      title={props.context === 'replace' ? '更换答题卡模板' : '选择空卡模板'}
      width={1040}
      footer={footer}
      onCancel={props.onClose}
    >
      <div className="template-picker">
        <div className="template-picker-head">
          <MetisTabs
            activeKey={filter}
            onChange={(key) => setFilter(key as TemplateFilter)}
            items={[
              { key: 'all', label: '全部模板' },
              { key: 'recommended', label: '智能推荐' },
              { key: 'standard', label: '大考规范' },
              { key: 'subject', label: '学科特色' },
              { key: 'blank', label: '纯空白' },
            ]}
          />
          <MetisInput
            className="template-search"
            prefix={<Search size={15} />}
            placeholder="搜索模板名称、学科"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="template-picker-body">
          <div className="template-gallery" aria-label="答题卡模板列表">
            {filteredTemplates.map((template) => {
              const meta = originMeta[template.origin]
              const Icon = meta.icon
              const active = selected?.id === template.id
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card ${active ? 'active' : ''}`}
                  onClick={() => setSelectedId(template.id)}
                >
                  <span className="template-card-preview" aria-hidden="true">
                    <i className="mini-title" />
                    <i className="mini-identity" />
                    {template.document.blocks.slice(0, 4).map((block) => (
                      <i key={block.id} className={`mini-block kind-${block.kind}`} />
                    ))}
                    {template.document.blocks.length === 0 && <i className="mini-empty">空白</i>}
                  </span>
                  <span className="template-card-copy">
                    <span><Icon size={13} /> {meta.label}{template.featured && <em>推荐</em>}</span>
                    <strong>{template.name}</strong>
                    <small>{template.document.settings.paperSize} · {template.document.pageCount} 面 · {template.document.settings.frontColumns} 栏</small>
                  </span>
                  {active && <span className="template-card-check"><Check size={13} /></span>}
                </button>
              )
            })}
            {filteredTemplates.length === 0 && <div className="template-empty-result">没有匹配模板，换个关键词试试。</div>}
          </div>

          {selected ? <aside className="template-detail">
            <div className="template-detail-heading">
              <span><OriginIcon size={14} /> {originMeta[selected.origin].label}</span>
              {selected.featured && <MetisTag preset="primary">推荐</MetisTag>}
            </div>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>

            {props.context === 'replace' && (
              <>
                <MetisAlert
                  type="warning"
                  showIcon
                  message="将套用纸张、栏数与考生信息版式"
                  description="当前试卷的标题、学科、题号、分值和题块保持不变；本次套用可撤销。"
                />
              </>
            )}

            <div className="template-live-preview">
              <div className="template-preview-paper">
                <strong>{selected.document.paper.title}</strong>
                <span className="preview-identity" />
                {pageOneBlocks.map((block) => (
                  <span
                    key={block.id}
                    className={`preview-block kind-${block.kind}`}
                    style={{ height: `${Math.max(16, Math.min(52, block.height / 5))}px` }}
                  >
                    {block.title}
                  </span>
                ))}
                {pageOneBlocks.length === 0 && <span className="preview-blank-copy"><FileStack size={22} /> 从第一个题块开始</span>}
              </div>
              <span>第 1 页实时结构预览</span>
            </div>

            <div className="template-facts">
              <span><small>纸张与面数</small><strong>{selected.document.settings.paperSize} · {selected.document.pageCount} 面</strong></span>
              <span><small>考号方式</small><strong>{selected.document.settings.candidateNumberLayout === 'fill' ? '填涂' : selected.document.settings.candidateNumberLayout === 'barcode' ? '条形码' : '手写'}{selected.document.settings.showBarcode ? ' + 条码区' : ''}</strong></span>
              <span><small>默认模式</small><strong>{selected.document.mode === 'standard' ? '大考规范' : '飞象模式'}</strong></span>
              <span><small>参考结构</small><strong>{selected.document.blocks.length ? `${selected.document.blocks.length} 个题块` : '纯空白'}</strong></span>
            </div>
            <div className="template-highlights">
              {selected.highlights.map((highlight) => <span key={highlight}><Check size={12} /> {highlight}</span>)}
            </div>

          </aside> : (
            <aside className="template-detail template-detail-empty">
              <FileStack size={30} />
              <strong>没有匹配模板</strong>
              <span>清除搜索词或切换分类后再试。</span>
            </aside>
          )}
        </div>
      </div>
    </MetisDialog>
  )
}
