import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'

const clampValue = (value) => Math.min(Math.max(Number(value) || 0, 1), 180)

export function SettingsModal() {
  const { state, actions } = useApp()
  const { settings, settingsModalOpen } = state
  const [formState, setFormState] = useState(settings)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormState((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextSettings = {
      focusMinutes: clampValue(formState.focusMinutes),
      shortBreakMinutes: clampValue(formState.shortBreakMinutes),
      longBreakMinutes: clampValue(formState.longBreakMinutes),
    }

    if (nextSettings.focusMinutes < 1 || nextSettings.shortBreakMinutes < 1 || nextSettings.longBreakMinutes < 1) {
      setError('Enter valid durations for all timer phases.')
      return
    }

    actions.updateSettings(nextSettings)
    actions.closeSettingsModal()
  }

  return (
    <Modal
      open={settingsModalOpen}
      onClose={actions.closeSettingsModal}
      title="Global timer settings"
      description="These values update Solo Mode and the shared room timer defaults."
      maxWidth="max-w-xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Focus"
            type="number"
            name="focusMinutes"
            min="1"
            max="180"
            value={formState.focusMinutes}
            onChange={handleChange}
          />
          <Input
            label="Short break"
            type="number"
            name="shortBreakMinutes"
            min="1"
            max="180"
            value={formState.shortBreakMinutes}
            onChange={handleChange}
          />
          <Input
            label="Long break"
            type="number"
            name="longBreakMinutes"
            min="1"
            max="180"
            value={formState.longBreakMinutes}
            onChange={handleChange}
          />
        </div>

        <div className="rounded-2xl border border-brand-400/20 bg-brand-400/10 px-4 py-3 text-sm text-brand-50/90">
          Long break is automatically scheduled after 4 completed focus cycles.
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={actions.closeSettingsModal}>
            Cancel
          </Button>
          <Button type="submit">Save settings</Button>
        </div>
      </form>
    </Modal>
  )
}