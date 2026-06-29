import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../api'
import { MessageSquare, X, Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'Which products are selling slowest?',
  'What should I restock this week?',
  'How much profit did I make this month?',
  'Which items will run out in 7 days?',
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function AIChat() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [messages, open])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const { answer } = await askQuestion(text)
      setMessages(m => [...m, { role: 'assistant', text: answer }])
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        text: 'Sorry, something went wrong. Make sure your ANTHROPIC_API_KEY is set correctly.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const handleOpen = () => {
    setOpen(o => !o)
  }

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div className="chat-panel">

          {/* Header */}
          <div className="chat-header">
            <div style={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, #4f8ef7, #7b5ea7)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sparkles size={14} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="chat-title">AI Business Analyst</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1, marginTop: 1 }}>
                <span className="chat-dot" style={{ display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }} />
                Powered by Claude
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', padding: 4,
                borderRadius: 6, transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-high)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.6 }}>
                  Ask me anything about your inventory and sales — I have access to your live data.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12.5,
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-body)',
                        transition: 'border-color 0.12s, background 0.12s, color 0.12s',
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--text)'
                        e.currentTarget.style.background = 'var(--accent-dim)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-dim)'
                        e.currentTarget.style.background = 'var(--surface-raised)'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="chat-msg assistant" style={{ padding: '8px 12px' }}>
                <TypingDots />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your shop…"
              disabled={loading}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{ flexShrink: 0, width: 36, height: 36, padding: 0 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className="chat-fab"
        onClick={handleOpen}
        title="AI Business Analyst"
        aria-label="Open AI chat"
      >
        {open
          ? <X size={20} />
          : <MessageSquare size={20} />}
      </button>
    </>
  )
}
