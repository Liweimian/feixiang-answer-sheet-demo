import type { PropsWithChildren } from 'react'

interface AppShellProps extends PropsWithChildren {
  reviewMode: boolean
  onToggleReview: () => void
}

export function AppShell({ children, reviewMode, onToggleReview }: AppShellProps) {
  return (
    <div className={`fx-app answer-sheet-app ${reviewMode ? 'is-review' : ''}`}>
      <main className="fx-content">
        <div className="fx-zoom-area">{children}</div>
      </main>

      {reviewMode && (
        <aside className="review-stage-one" aria-label="过稿看板占位">
          <div>
            <span className="review-kicker">过稿模式</span>
            <h2>页面方案待确认</h2>
            <p>当前为阶段一可交互 Demo。确认页面后，将先核对 HANDOFF 与代码，再生成可编辑的完整产品稿。</p>
          </div>
          <button type="button" onClick={onToggleReview}>返回演示模式</button>
        </aside>
      )}

      {!reviewMode && (
        <button className="review-toggle" type="button" onClick={onToggleReview}>过稿</button>
      )}
    </div>
  )
}
