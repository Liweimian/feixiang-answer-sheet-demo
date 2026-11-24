import { useCallback } from 'react'

interface PaperComposeBridgePageProps {
  onGenerateAnswerSheet: () => void
  onBack: () => void
}

export function PaperComposeBridgePage({ onGenerateAnswerSheet, onBack }: PaperComposeBridgePageProps) {
  const connectGenerateAction = useCallback((frame: HTMLIFrameElement) => {
    const frameDocument = frame.contentDocument
    if (!frameDocument) return
    const layoutStyleId = 'codex-paper-compose-safe-columns'
    if (!frameDocument.getElementById(layoutStyleId)) {
      const layoutStyle = frameDocument.createElement('style')
      layoutStyle.id = layoutStyleId
      layoutStyle.textContent = `
        noscript { display: none !important; }
        .metis-document-layout__content-box {
          box-sizing: border-box !important;
          padding-left: 16px !important;
          padding-right: 16px !important;
          overflow-x: auto !important;
        }
        .metis-document-layout__content-box > div[style*="display: inline-flex"] {
          width: 1304px !important;
          min-width: 1304px !important;
          display: flex !important;
          margin: 0 auto !important;
        }
        .metis-document-layout__sort-box {
          width: 232px !important;
          min-width: 232px !important;
          flex: 0 0 232px !important;
        }
        .metis-document-layout__document-box {
          width: 818px !important;
          min-width: 818px !important;
          flex: 0 0 818px !important;
          box-sizing: border-box !important;
        }
        .metis-document-layout__question-detail-info-wrapper {
          width: 254px !important;
          min-width: 254px !important;
          flex: 0 0 254px !important;
        }
        .question-sort-wrapper {
          left: max(16px, calc((100vw - 1304px) / 2)) !important;
          width: 216px !important;
          box-sizing: border-box !important;
        }
        .metis-document__question-detail-info-container {
          left: auto !important;
          right: max(16px, calc((100vw - 1304px) / 2)) !important;
          width: 254px !important;
          box-sizing: border-box !important;
        }
      `
      frameDocument.head.appendChild(layoutStyle)
    }
    frameDocument.querySelectorAll('noscript').forEach((notice) => notice.remove())
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
    const returnTargets = [
      frameDocument.querySelector<HTMLElement>('.md-page-header-back'),
      ...[...frameDocument.querySelectorAll<HTMLElement>('.index_custom-breadcrumb-link__FstEZ')].filter((element) => ['首页', '题库'].includes(element.textContent?.trim() ?? '')),
    ].filter((element): element is HTMLElement => Boolean(element))
    returnTargets.forEach((element) => {
      if (element.dataset.answerSheetBackBound) return
      element.dataset.answerSheetBackBound = 'true'
      element.setAttribute('role', 'button')
      element.setAttribute('tabindex', '0')
      element.setAttribute('aria-label', '返回答题卡工具入口')
      element.style.cursor = 'pointer'
      element.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); onBack() })
      element.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onBack()
      })
    })
  }, [onBack, onGenerateAnswerSheet])

  return <section className="paper-compose-bridge" aria-label="从试卷生成答题卡">
    <iframe title="飞象星球试卷编辑页" src="./飞象星球.html?v=2" sandbox="allow-same-origin" onLoad={(event) => connectGenerateAction(event.currentTarget)} />
  </section>
}
