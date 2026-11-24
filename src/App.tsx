import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { applyFxZoom } from './design-system/fx-adapt'
import { AnswerSheetStudioPage } from './pages/AnswerSheetStudioPage'
import { AnswerSheetListPage } from './pages/AnswerSheetListPage'
import { PaperComposeBridgePage } from './pages/PaperComposeBridgePage'
import { defaultAnswerSheetDocument } from './data/answerSheetTemplates'
import type { AnswerSheetDocument } from './features/answer-sheet/types'

export function App() {
  const params = new URLSearchParams(window.location.search)
  const reviewMode = params.get('mode') === 'review'
  const [route, setRoute] = useState(window.location.hash)
  const [toolDocument, setToolDocument] = useState<AnswerSheetDocument>()
  const [toolSourceFile, setToolSourceFile] = useState<File>()

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

  const goHome = () => {
    setToolDocument(undefined)
    setToolSourceFile(undefined)
    if (!window.location.hash.startsWith('#/homework/answer-sheet-list')) window.location.hash = '/homework/answer-sheet-list'
  }

  const openPaperCompose = () => {
    setToolDocument(undefined)
    setToolSourceFile(undefined)
    window.location.hash = '/homework/paper-compose'
  }

  const generateFromPaper = () => {
    const generated = structuredClone(defaultAnswerSheetDocument)
    setToolSourceFile(undefined)
    setToolDocument({
      ...generated,
      paper: { ...generated.paper, sourceLabel: '组卷 · 当前试卷' },
      settings: { ...generated.settings, linkedPaperId: generated.paper.id },
    })
    window.location.hash = '/homework/answer-sheet-list'
  }
  const generatedFromPaper = Boolean(toolDocument?.settings.linkedPaperId)

  return (
    <AppShell reviewMode={reviewMode} onToggleReview={toggleReview}>
      {route.startsWith('#/homework/paper-compose')
        ? <PaperComposeBridgePage onGenerateAnswerSheet={generateFromPaper} onBack={goHome} />
        : route.startsWith('#/homework/answer-sheet-list') ? <>
        <div hidden={Boolean(toolDocument)}><AnswerSheetListPage onEdit={(document, sourceFile) => { setToolSourceFile(sourceFile); setToolDocument(document) }} onExperienceFromPaper={openPaperCompose} /></div>
        {toolDocument && <AnswerSheetStudioPage initialDocument={toolDocument} uploadedSourceFile={toolSourceFile} onBack={generatedFromPaper ? openPaperCompose : goHome} backLabel={generatedFromPaper ? '返回试卷' : '返回制卡工具'} />}
      </> : <AnswerSheetStudioPage onBack={goHome} />}
    </AppShell>
  )
}
