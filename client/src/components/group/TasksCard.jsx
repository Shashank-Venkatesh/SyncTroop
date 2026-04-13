import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { Tooltip } from '../ui/Tooltip.jsx'
import { cn } from '../../utils/classNames.js'
import { formatClockTime } from '../../utils/pomodoro.js'

const emptyDraft = {
  title: '',
  assignedToId: '',
}

export function TasksCard({ tasks, members, isCreator, currentUser, onCreateTask, onToggleTask }) {
  const [draft, setDraft] = useState(emptyDraft)
  const completedTaskCount = tasks.filter((task) => task.completed).length
  const openTaskCount = tasks.length - completedTaskCount
  const assignedToCurrentUserCount = currentUser ? tasks.filter((task) => task.assignedToId === currentUser.id).length : 0

  const handleChange = (event) => {
    const { name, value } = event.target

    setDraft((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const assignedToId = draft.assignedToId || members[0]?.id || ''

    if (!draft.title.trim() || !assignedToId) {
      return
    }

    onCreateTask?.({
      title: draft.title.trim(),
      assignedToId,
    })

    setDraft(emptyDraft)
  }

  return (
    <Card className="h-full overflow-visible">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Work plan</p>
            <Tooltip
              label="Work plan help"
              content="The room creator assigns tasks. Everyone can mark their own work complete."
            />
          </div>
          <h3 className="mt-2 text-xl font-semibold text-white">Tasks</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {tasks.length} active
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-float">
          <p className="text-[11px] uppercase tracking-[0.28em] text-brand-200">Open</p>
          <p className="mt-2 text-2xl font-semibold text-white">{openTaskCount}</p>
          <p className="mt-1 text-sm text-slate-400">Tasks still in motion.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-float">
          <p className="text-[11px] uppercase tracking-[0.28em] text-brand-200">Done</p>
          <p className="mt-2 text-2xl font-semibold text-white">{completedTaskCount}</p>
          <p className="mt-1 text-sm text-slate-400">Completed items in the room.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-float">
          <p className="text-[11px] uppercase tracking-[0.28em] text-brand-200">Yours</p>
          <p className="mt-2 text-2xl font-semibold text-white">{assignedToCurrentUserCount}</p>
          <p className="mt-1 text-sm text-slate-400">Tasks assigned to you.</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        {isCreator
          ? 'Use this board to assign the next task before the room drifts.'
          : 'Keep your assigned work moving and mark it complete when done.'}
      </p>

      {isCreator ? (
        <form className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4" onSubmit={handleSubmit}>
          <Input
            label="Task title"
            name="title"
            value={draft.title}
            onChange={handleChange}
            placeholder="Prepare sprint recap"
          />

          <Input
            as="select"
            label="Assign to"
            name="assignedToId"
            value={draft.assignedToId || members[0]?.id || ''}
            onChange={handleChange}
            className="pr-10"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Input>

          <Button type="submit" size="sm" fullWidth>
            Add task
          </Button>
        </form>
      ) : (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Creator-only task controls.
        </div>
      )}

      <div className="mt-5 space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const canToggle = currentUser && (task.assignedToId === currentUser.id || isCreator)

            return (
              <label
                key={task.id}
                className={cn(
                  'flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-300/30',
                  task.completed && 'border-brand-400/30 bg-brand-400/10',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-brand-400 focus:ring-brand-400/30"
                  checked={Boolean(task.completed)}
                  disabled={!canToggle}
                  onChange={() => onToggleTask?.(task)}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('font-medium text-white', task.completed && 'line-through text-slate-400')}>
                      {task.title}
                    </p>
                    {task.completed ? (
                      <span className="rounded-full bg-brand-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-100">
                        Complete
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Avatar src={members.find((member) => member.id === task.assignedToId)?.avatar} name={task.assignedToName} size="xs" />
                      <span>{task.assignedToName}</span>
                    </span>
                    {task.completedBy ? <span>Completed by {task.completedBy}</span> : null}
                    {task.updatedAt ? <span>{formatClockTime(task.updatedAt)}</span> : null}
                  </div>
                </div>
              </label>
            )
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-400">
            No tasks yet. The creator can add one from the form above.
          </div>
        )}
      </div>
    </Card>
  )
}