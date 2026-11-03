import { useState } from 'react'
import { MetisButton, MetisSelect, MetisTag } from '@yuanfudao/metis-web-component'
import { CheckCircle2, LoaderCircle, ScanSearch, TriangleAlert } from 'lucide-react'
import { beijingEnglishPaper } from '../data/mockPaper'
import type { ParseResult } from '../features/answer-sheet/types'

interface ParsingStageProps {
  result?: ParseResult
  onBack: () => void
  onConfirm: () => void
}

export function ParsingStage({ result, onBack, onConfirm }: ParsingStageProps) {
  const [writingLayout, setWritingLayout] = useState<'choose-one' | 'separate'>('choose-one')
  return (
    <section className="parsing-stage" data-sec="2">
      <div className="parsing-summary">
        <div className="parsing-illustration">
          {result ? <CheckCircle2 size={38} /> : <LoaderCircle className="spin" size={38} />}
        </div>
        <div>
          <span className="eyebrow"><ScanSearch size={15} /> 试卷结构解析</span>
          <h2>{result ? '试卷结构已识别' : '正在理解试卷…'}</h2>
          <p>{result ? '大部分内容已自动确认，只需处理 1 处低置信结果。' : '正在提取题号、题型、分值和建议作答空间。'}</p>
        </div>
        {result && <MetisTag preset="success">总分校验通过</MetisTag>}
      </div>

      <div className="parse-progress">
        {['读取试卷与题目顺序', '识别题型、题号和分值', '匹配学科作答区', '生成初始答题卡'].map((label, index) => (
          <div key={label} className={!result && index === 3 ? 'working' : 'done'}>
            <span>{result || index < 3 ? <CheckCircle2 size={16} /> : <LoaderCircle className="spin" size={16} />}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <div className="parse-workbench">
        <div className="paper-structure">
          <div className="panel-title"><strong>识别到的试卷结构</strong><span>{beijingEnglishPaper.sections.length} 个大题</span></div>
          {beijingEnglishPaper.sections.map((section) => (
            <div className="section-row" key={section.id}>
              <div><strong>{section.title}</strong><span>题号 {section.range} · {section.questionCount} 题</span></div>
              <span>{section.score} 分</span>
              <MetisTag preset={section.confidence < 90 ? 'warning' : 'success'}>{section.confidence}%</MetisTag>
            </div>
          ))}
        </div>

        <aside className="parse-review">
          <div className="panel-title"><strong>需要确认</strong><span>{result ? '1 项' : '分析中'}</span></div>
          {result ? (
            <div className="review-item">
              <TriangleAlert size={19} />
              <div><strong>第 48 题命题形式</strong><p>检测到两个写作提示，请确认共用一个作答区。</p></div>
              <MetisSelect
                value={writingLayout}
                onChange={(value) => setWritingLayout(value as 'choose-one' | 'separate')}
                options={[
                  { label: '二选一，共用作答区', value: 'choose-one' },
                  { label: '两个独立作答区', value: 'separate' },
                ]}
              />
            </div>
          ) : <div className="parse-skeleton" />}
          <div className="parse-facts">
            <span><b>{result?.objectiveCount ?? '—'}</b>客观题</span>
            <span><b>{result?.subjectiveCount ?? '—'}</b>主观题</span>
            <span><b>{result?.totalScore ?? '—'}</b>总分</span>
          </div>
        </aside>
      </div>

      <footer className="stage-footer">
        <MetisButton type="bordered" onClick={onBack}>返回选择</MetisButton>
        <MetisButton type="primary" disabled={!result} onClick={onConfirm}>确认结构并生成答题卡</MetisButton>
      </footer>
    </section>
  )
}
