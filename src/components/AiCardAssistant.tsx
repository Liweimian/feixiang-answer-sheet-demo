import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MetisMessage } from '@yuanfudao/metis-web-component'
import { ArrowUp, Check, ChevronDown, Copy, MessageSquarePlus, PanelLeftClose, Sparkles, X } from 'lucide-react'

interface AiCardAssistantProps {
  messages: string[]
  input: string
  scope: string
  hasSelection: boolean
  reviewCount: number
  reviews: ReactNode
  onInputChange: (value: string) => void
  onSend: () => void
  onNewConversation: () => void
  onClearScope: () => void
  onCollapse: () => void
}

export function AiCardAssistant(props: AiCardAssistantProps) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const hasMessages = props.messages.length > 0

  useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  }, [props.messages])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 72), 168)}px`
  }, [props.input])

  const useSuggestion = (text: string) => {
    props.onInputChange(text)
    inputRef.current?.focus()
  }

  const send = () => {
    if (!props.input.trim()) return
    props.onSend()
    inputRef.current?.focus()
  }

  const copyResponse = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
    } catch {
      MetisMessage.warning('复制失败，请选择回复文字复制')
    }
  }

  return <aside id="ai-card-assistant" className="ai-assistant-panel ai-chat-panel" aria-label="AI 制卡助手">
    <header className="ai-chat-header">
      <span className="ai-chat-logo"><Sparkles size={17} /></span>
      <strong>AI 制卡助手</strong>
      <div className="ai-chat-header-actions">
        <button type="button" title="新对话" aria-label="新对话" onClick={() => { props.onNewConversation(); setReviewsOpen(false); setCopiedIndex(null); inputRef.current?.focus() }}><MessageSquarePlus size={17} /></button>
        <button type="button" title="收起助手" aria-label="收起助手" onClick={props.onCollapse}><PanelLeftClose size={17} /></button>
      </div>
    </header>

    {props.reviewCount > 0 && <div className="ai-chat-review">
      <button type="button" className="ai-chat-review-toggle" aria-expanded={reviewsOpen} onClick={() => setReviewsOpen((open) => !open)}><span className="ai-chat-review-dot" />{props.reviewCount} 项待核对<ChevronDown size={13} /></button>
      {reviewsOpen && <div className="ai-chat-review-items">{props.reviews}</div>}
    </div>}

    <div className="ai-chat-transcript" ref={transcriptRef} role="log" aria-label="对话记录" aria-live="polite" aria-relevant="additions">
      {!hasMessages ? <div className="ai-chat-welcome">
        <span className="ai-chat-welcome-icon"><Sparkles size={26} strokeWidth={1.5} /></span>
        <h2>这张答题卡，<br />想怎么调整？</h2>
        <div className="ai-chat-starters">
          <button type="button" onClick={() => useSuggestion('添加单选题')}>添加一组选择题<span>↗</span></button>
          <button type="button" onClick={() => useSuggestion('检查总分')}>核对题目与总分<span>↗</span></button>
          {props.hasSelection && <button type="button" onClick={() => useSuggestion('每题改成 2 分')}>调整选中题组的分值<span>↗</span></button>}
        </div>
      </div> : props.messages.map((message, index) => {
        const isUser = message.startsWith('你：')
        const text = message.replace(/^(你|助手)：/, '')
        return <article key={index} className={`ai-chat-message ${isUser ? 'from-user' : 'from-assistant'}`}>
          {!isUser && <div className="ai-chat-message-author"><Sparkles size={13} />制卡助手</div>}
          <div className="ai-chat-message-content">{text}</div>
          {!isUser && <div className="ai-chat-message-actions"><button type="button" title="复制回复" aria-label="复制回复" onClick={() => void copyResponse(text, index)}>{copiedIndex === index ? <Check size={13} /> : <Copy size={13} />}</button>{copiedIndex === index && <span>已复制</span>}</div>}
        </article>
      })}
    </div>

    <div className="ai-chat-bottom">
      {hasMessages && <div className="ai-chat-followups">
        <button type="button" onClick={() => useSuggestion('检查总分')}>检查总分</button>
        <button type="button" onClick={() => useSuggestion('添加填空题')}>添加题组</button>
      </div>}
      <form className="ai-chat-composer" onSubmit={(event) => { event.preventDefault(); send() }}>
        <div className="ai-chat-context"><span className="ai-chat-context-dot" /><span title={props.scope}>{props.scope}</span>{props.hasSelection && <button type="button" title="切换为整张答题卡" aria-label="取消当前题组选区" onClick={props.onClearScope}><X size={12} /></button>}</div>
        <textarea ref={inputRef} aria-label="向 AI 制卡助手发送消息" placeholder={hasMessages ? '继续描述你的调整…' : '输入需求，开始一起制卡…'} value={props.input} onChange={(event) => props.onInputChange(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            send()
          }
        }} />
        <div className="ai-chat-composer-tools"><span>Enter 发送</span><button className="ai-chat-send" type="submit" disabled={!props.input.trim()} aria-label="发送消息" title="发送"><ArrowUp size={19} /></button></div>
      </form>
    </div>
  </aside>
}
