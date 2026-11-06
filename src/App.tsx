import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { applyFxZoom } from './design-system/fx-adapt'
import { AnswerSheetStudioPage } from './pages/AnswerSheetStudioPage'
import { AnswerSheetListPage } from './pages/AnswerSheetListPage'
import type { AnswerSheetDocument } from './features/answer-sheet/types'

export function App() {
  const params = new URLSearchParams(window.location.search)
  const reviewMode = params.get('mode') === 'review'
  const [route, setRoute] = useState(window.location.hash)
  const [toolDocument, setToolDocument] = useState<AnswerSheetDocument>()

  useEffect(() => {
    applyFxZoom()
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const toggleReview = () => {
    const next = new URL(window.location.href)
    if (reviewMode) next.searchParams.delete('mode')
    else next.searchParams.set('mode', 'review')
    window.location.href = next.toString()
  }

  return (
    <AppShell reviewMode={reviewMode} onToggleReview={toggleReview}>
      {route.startsWith('#/homework/answer-sheet-list') ? <>
        <div hidden={Boolean(toolDocument)}><AnswerSheetListPage onEdit={setToolDocument} /></div>
        {toolDocument && <AnswerSheetStudioPage initialDocument={toolDocument} entry="tool" onBack={() => setToolDocument(undefined)} />}
      </> : <AnswerSheetStudioPage />}
    </AppShell>
  )
}
