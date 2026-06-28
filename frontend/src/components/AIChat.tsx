import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../api'
import { MessageSquare, X, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'Which products are selling slowest?',
  'What should I restock this week?',
  'How much profit did I make this month?',
  'Which items are almost out of stock?',
]

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, something went wrong. Make sure your API key is set.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-dot" />
            <span className="chat-title">AI Business Analyst</span>
            <button
              onClick={() => setOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Ask me anything about your inventory and sales. Try:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        background: 'var(--surface-raised)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--text-dim)',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}

            {loading && (
              <div className="chat-msg assistant loading">Analysing your data…</div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
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
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      <button className="chat-fab" onClick={() => setOpen(o => !o)} title="AI Business Analyst">
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  )
}
