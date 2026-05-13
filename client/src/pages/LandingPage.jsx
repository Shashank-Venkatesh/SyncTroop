import { Card } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { BrandMark } from '../components/ui/BrandMark.jsx'
import { useApp } from '../context/AppContext.jsx'
import { cn } from '../utils/classNames.js'

const modeCards = [
  {
    key: 'solo',
    label: 'Solo Mode',
    title: 'Personal focus, no noise.',
    description: 'Run a classic Pomodoro loop with custom durations, optional white noise, and clean browser notifications.',
    gradient: 'from-brand-400/35 via-brand-300/20 to-transparent',
    accent: 'Focus locally',
    bullets: ['Classic reverse countdown', 'Custom break durations', 'Quick settings access'],
  },
  {
    key: 'group',
    label: 'Group Mode',
    title: 'One room. One clock. Real-time accountability.',
    description: 'Create a live room with synced timers, shared tasks, online presence, and chat that keeps everyone aligned.',
    gradient: 'from-accent-400/35 via-brand-300/20 to-transparent',
    accent: 'Sync the room',
    bullets: ['Socket.io room sync', 'Task assignment board', 'Live members + chat'],
  },
]

function ModeCard({ mode, onOpenAuth }) {
  return (
    <Card
      as="button"
      type="button"
      className={cn(
        'group h-full text-left transition duration-300 hover:-translate-y-1 hover:border-brand-300/30 hover:bg-white/8',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70',
      )}
      onClick={() => onOpenAuth(mode.key)}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-70 transition duration-300 group-hover:opacity-100', mode.gradient)} />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-brand-200">{mode.label}</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{mode.title}</h2>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
            {mode.accent}
          </span>
        </div>

        <p className="max-w-xl text-sm leading-7 text-slate-300">{mode.description}</p>

        <div className="grid gap-2 sm:grid-cols-3">
          {mode.bullets.map((bullet) => (
            <div key={bullet} className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3 text-center text-sm text-slate-200">
              {bullet}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 text-center text-sm text-slate-400 transition group-hover:text-slate-200">
          Click anywhere to continue
        </div>
      </div>
    </Card>
  )
}

export function LandingPage() {
  const { actions } = useApp()

  const handleOpenAuth = (mode) => {
    actions.setSelectedMode(mode)
    actions.openAuthModal(mode, 'login')
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(47,212,172,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,159,45,0.15),transparent_26%),linear-gradient(180deg,rgba(7,17,31,0.95),rgba(5,11,20,1))]" />
      <div className="absolute left-[-6rem] top-24 h-72 w-72 rounded-full bg-brand-400/15 blur-3xl animate-drift" />
      <div className="absolute right-[-4rem] top-20 h-64 w-64 rounded-full bg-accent-400/15 blur-3xl animate-drift" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between gap-4">
        <BrandMark />
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
            Pomodoro + realtime sync
          </span>
        </div>
      </header>

      <main className="relative mx-auto mt-16 max-w-7xl">
        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/20 bg-brand-400/10 px-4 py-2 text-sm text-brand-100">
              <span className="h-2 w-2 rounded-full bg-brand-300 animate-glow" />
              Productive focus for solo and team rooms
            </div>

            <div className="space-y-6">
              <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
                Keep the clock honest.
                <span className="block bg-gradient-to-r from-brand-200 via-white to-accent-100 bg-clip-text text-transparent">
                  Sync every session.
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                SyncTroop blends a polished Pomodoro workflow with live rooms, task ownership, and work-focused chat so the team sees the same timer, the same priorities, and the same progress.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => handleOpenAuth('solo')}>
                Start Solo Mode
              </Button>
              <Button size="lg" variant="secondary" onClick={() => handleOpenAuth('group')}>
                Start Group Mode
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                'Editable focus, short break, and long break durations',
                'Socket.io room sync for timers, tasks, and chat',
                'Reusable UI, routing, context state, and Axios APIs',
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden border-white/10 bg-slate-950/80 p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,212,172,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,159,45,0.15),transparent_26%)]" />
            <div className="relative space-y-6 p-6 sm:p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Live preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">A room that feels coordinated</h2>
                </div>
                <span className="rounded-full border border-brand-300/20 bg-brand-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-brand-100">
                  Sync on
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Timer</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-4xl font-semibold text-white font-mono">24:58</p>
                      <p className="mt-2 text-sm text-slate-400">Focus session active</p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-brand-300 via-brand-400 to-accent-300" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Chat</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl bg-white/5 px-3 py-2">Live room messages appear here in real time.</div>
                    <div className="rounded-2xl bg-brand-400/10 px-3 py-2 text-brand-50">No seeded chat history is shown.</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Live room', '1 clock for everyone'],
                  ['Task board', 'Creator assigns and tracks'],
                  ['Members', 'Join/leave updates in real time'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          {modeCards.map((mode) => (
            <ModeCard key={mode.key} mode={mode} onOpenAuth={handleOpenAuth} />
          ))}
        </section>
      </main>
    </div>
  )
}