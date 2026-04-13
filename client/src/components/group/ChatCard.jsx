import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Button } from '../ui/Button.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { Input } from '../ui/Input.jsx'
import { cn } from '../../utils/classNames.js'
import { formatClockTime, isWorkFocusedMessage } from '../../utils/pomodoro.js'

export function ChatCard({ messages, currentUser, onSendMessage, connected }) {
  const [draft, setDraft] = useState('')
  const [warning, setWarning] = useState(false)
  const bottomRef = useRef(null)

  const draftIsWorkFocused = useMemo(() => isWorkFocusedMessage(draft), [draft])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedMessage = draft.trim()

    if (!trimmedMessage) {
      return
    }

    const workFocused = isWorkFocusedMessage(trimmedMessage)
    setWarning(!workFocused)

    onSendMessage?.({
      message: trimmedMessage,
      workFocused,
    })

    setDraft('')
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Realtime</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Chat</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>

      <div className="mt-5 flex min-h-[30rem] flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/45">
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 rounded-3xl px-3 py-3',
                  message.userId === currentUser?.id && 'border border-brand-400/20 bg-brand-400/10',
                  !message.workFocused && 'border border-amber-400/20 bg-amber-500/10',
                )}
              >
                <Avatar src={message.avatar} name={message.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{message.username}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatClockTime(message.timestamp)}</span>
                    {message.workFocused === false ? (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100">
                        Off topic
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{message.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500">
              Start a work-focused conversation to keep the room aligned.
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="shrink-0 border-t border-white/10 p-4" onSubmit={handleSubmit}>
          {warning ? (
            <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              ⚠️ Keep chat work-focused
            </div>
          ) : null}

          <div className="space-y-3">
            <Input
              multiline
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Share a blocker, update, or next step..."
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {draft ? (draftIsWorkFocused ? 'Looks on topic.' : 'Potentially off topic.') : 'Press Enter to send.'}
              </p>
              <Button type="submit" size="sm" disabled={!draft.trim()}>
                Send
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Card>
  )
}