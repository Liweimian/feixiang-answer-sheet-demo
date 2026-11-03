import type { PropsWithChildren } from 'react'
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  Home,
  UserCircle,
} from 'lucide-react'

const navItems = [
  { label: '首页', icon: Home },
  { label: '题库', icon: BookOpen },
  { label: '组卷', icon: FileText, active: true },
  { label: '作业', icon: ClipboardCheck },
  { label: '学情', icon: BarChart3 },
]

interface AppShellProps extends PropsWithChildren {
  reviewMode: boolean
  onToggleReview: () => void
}

export function AppShell({ children, reviewMode, onToggleReview }: AppShellProps) {
  return (
    <div className={`fx-app answer-sheet-app ${reviewMode ? 'is-review' : ''}`}>
      <aside className="fx-sider app-sider" aria-label="飞象星球主导航">
        <div className="sider-logo" aria-label="飞象星球">象</div>
        <nav>
          {navItems.map(({ label, icon: Icon, active }) => (
            <button key={label} className={active ? 'active' : ''} type="button" aria-label={label}>
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="sider-user" type="button" aria-label="用户中心">
          <UserCircle size={22} strokeWidth={1.8} />
        </button>
      </aside>

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
