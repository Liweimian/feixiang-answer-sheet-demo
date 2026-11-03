import { useState } from 'react'
import {
  MetisAlert,
  MetisButton,
  MetisSelect,
  MetisTabs,
} from '@yuanfudao/metis-web-component'
import { Check, FileUp, Sparkles } from 'lucide-react'
import { beijingEnglishPaper, sourceOptions } from '../data/mockPaper'
import type { CardMode, SourceKind } from '../features/answer-sheet/types'

interface SourceSetupProps {
  mode: CardMode
  onModeChange: (mode: CardMode) => void
  onStart: (source: SourceKind) => void
}

export function SourceSetup({ mode, onModeChange, onStart }: SourceSetupProps) {
  const [source, setSource] = useState<SourceKind>('library')

  return (
    <section className="source-setup" data-sec="1">
      <div className="source-heading">
        <div>
          <span className="eyebrow"><Sparkles size={15} /> 智能制卡</span>
          <h2>你想怎样开始？</h2>
          <p>先识别试卷结构，再生成可打印答题卡；不需要重复录入题号和分值。</p>
        </div>
        <MetisTabs
          activeKey={mode}
          onChange={(key) => onModeChange(key as CardMode)}
          items={[
            { key: 'smart', label: '飞象模式' },
            { key: 'standard', label: '大考规范模式' },
          ]}
        />
      </div>

      <div className="source-grid">
        {sourceOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`source-option ${source === option.id ? 'active' : ''}`}
            onClick={() => setSource(option.id)}
          >
            <span className="source-option-badge">{option.badge}</span>
            <span className="source-option-icon">{option.id === 'upload' ? <FileUp size={20} /> : <Sparkles size={20} />}</span>
            <strong>{option.title}</strong>
            <p>{option.description}</p>
            {source === option.id && <span className="source-selected"><Check size={14} /> 已选择</span>}
          </button>
        ))}
      </div>

      <div className="source-preview-card">
        <div className="paper-source-meta">
          <span>本次演示试卷</span>
          <strong>{beijingEnglishPaper.title}</strong>
          <small>{beijingEnglishPaper.sourceLabel} · {beijingEnglishPaper.score} 分 · {beijingEnglishPaper.durationMinutes} 分钟</small>
        </div>
        <MetisSelect
          className="source-paper-select"
          value={beijingEnglishPaper.id}
          options={[
            { label: '2026 北京市初三英语一模模拟卷', value: beijingEnglishPaper.id },
          ]}
        />
      </div>

      {mode === 'standard' && (
        <MetisAlert
          type="info"
          showIcon
          message="已选择大考规范模式"
          description="关键身份区、条码区、定位点和禁答安全区将按规则包锁定；题号和作答空间仍可调整。"
        />
      )}

      <div className="source-footer">
        <span>{beijingEnglishPaper.disclaimer}</span>
        <MetisButton
          type="primary"
          size="l"
          onClick={() => onStart(source)}
          data-track="/click/answerSheetCreate/startParsing | 开始解析试卷 | sourceType"
        >
          解析并生成答题卡
        </MetisButton>
      </div>
    </section>
  )
}
