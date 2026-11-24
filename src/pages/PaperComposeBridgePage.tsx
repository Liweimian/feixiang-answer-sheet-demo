import { useCallback } from 'react'

interface PaperComposeBridgePageProps {
  onGenerateAnswerSheet: () => void
}

export function PaperComposeBridgePage({ onGenerateAnswerSheet }: PaperComposeBridgePageProps) {
  const connectGenerateAction = useCallback((frame: HTMLIFrameElement) => {
    const frameDocument = frame.contentDocument
    if (!frameDocument) return
    const buttons = [...frameDocument.querySelectorAll<HTMLButtonElement>('button')]
    const generateButtons = buttons.filter((button) => button.textContent?.replace(/\s+/g, '').includes('生成答题卡'))
    generateButtons.forEach((button) => {
      button.disabled = false
      button.removeAttribute('disabled')
      button.setAttribute('aria-label', '生成答题卡并进入编辑器')
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        onGenerateAnswerSheet()
      }, { capture: true, once: true })
    })
  }, [onGenerateAnswerSheet])

  return <section className="paper-compose-bridge" aria-label="从试卷生成答题卡">
    <iframe title="飞象星球试卷编辑页" src="./飞象星球.html" sandbox="allow-same-origin" onLoad={(event) => connectGenerateAction(event.currentTarget)} />
  </section>
}
