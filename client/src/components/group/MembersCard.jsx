import { Card } from '../ui/Card.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { cn } from '../../utils/classNames.js'

function getStatusLabel(status) {
  switch (status) {
    case 'away':
      return 'Away'
    case 'offline':
      return 'Disconnected'
    default:
      return 'Online'
  }
}

function getStatusTone(status) {
  switch (status) {
    case 'away':
      return 'bg-accent-400/15 text-accent-100'
    case 'offline':
      return 'bg-white/8 text-slate-300'
    default:
      return 'bg-emerald-400/15 text-emerald-100'
  }
}

export function MembersCard({ members, currentUserId, connected }) {
  const onlineCount = members.filter((member) => member.status !== 'offline').length

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Crew</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Members</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {onlineCount}/{members.length} online
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3',
                member.id === currentUserId && 'border-brand-400/30 bg-brand-400/10',
              )}
            >
              <Avatar src={member.avatar} name={member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{member.name}</p>
                  {member.role === 'creator' ? (
                    <span className="rounded-full bg-brand-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-100">
                      Creator
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-400">{member.email}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', getStatusTone(member.status))}>
                  {getStatusLabel(member.status)}
                </span>
                {member.id === currentUserId ? (
                  <span className="text-[11px] uppercase tracking-[0.22em] text-brand-200">You</span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-400">
            No members yet.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
        Realtime status: <span className={connected ? 'text-brand-200' : 'text-amber-200'}>{connected ? 'connected' : 'disconnected'}</span>
      </div>
    </Card>
  )
}