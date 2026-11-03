import { useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { applyFxZoom } from './design-system/fx-adapt'
import { AnswerSheetStudioPage } from './pages/AnswerSheetStudioPage'

export function App() {
  const params = new URLSearchParams(window.location.search)
  const reviewMode = params.get('mode') === 'review'

  useEffect(() => applyFxZoom(), [])

  const toggleReview = () => {
    const next = new URL(window.location.href)
    if (reviewMode) next.searchParams.delete('mode')
    else next.searchParams.set('mode', 'review')
    window.location.href = next.toString()
  }

  return (
    <AppShell reviewMode={reviewMode} onToggleReview={toggleReview}>
      <AnswerSheetStudioPage />
    </AppShell>
  )
}
