import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import { loginUser, signupUser } from '../../services/api.js'
import { SESSION_KEYS, writeSessionString } from '../../utils/sessionStorage.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'

const initialFormState = {
  name: '',
  email: '',
  password: '',
}

function validateAuthForm(formState, mode) {
  const errors = {}

  if (mode === 'signup' && !formState.name.trim()) {
    errors.name = 'Display name is required.'
  }

  if (!formState.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!formState.password.trim()) {
    errors.password = 'Password is required.'
  } else if (formState.password.trim().length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }

  return errors
}

export function AuthModal() {
  const { state, actions } = useApp()
  const navigate = useNavigate()
  const { authModal } = state
  const [activeTab, setActiveTab] = useState(authModal.tab)
  const [formState, setFormState] = useState(initialFormState)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (authModal.open) {
      setActiveTab(authModal.tab)
      setFieldErrors({})
      setSubmitError('')
      setFormState(initialFormState)
    }
  }, [authModal.open, authModal.tab])

  const heading = useMemo(
    () => (activeTab === 'signup' ? 'Create your SyncTroop account' : 'Welcome back to SyncTroop'),
    [activeTab],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormState((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validateAuthForm(formState, activeTab)

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const payload = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        password: formState.password,
      }

      const response = activeTab === 'signup' ? await signupUser(payload) : await loginUser(payload)

      // Clear any stale room data from a previous user session BEFORE
      // setting the new user. This prevents the new user from briefly
      // seeing the old user's room name/creator in the UI.
      actions.clearRoom()
      actions.setUser(response.user)
      if (typeof window !== 'undefined' && response.token) {
        writeSessionString(SESSION_KEYS.token, response.token)
      }
      actions.closeAuthModal()
      navigate(authModal.mode === 'group' ? '/group' : '/solo')
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Unable to authenticate right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={authModal.open}
      onClose={actions.closeAuthModal}
      title={heading}
      description="Use the same account for Solo Mode and live group rooms."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'login' ? 'bg-brand-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'signup' ? 'bg-brand-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            onClick={() => setActiveTab('signup')}
          >
            Signup
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {activeTab === 'signup' ? (
            <Input
              label="Display name"
              name="name"
              value={formState.name}
              onChange={handleChange}
              placeholder="Alex Morgan"
              error={fieldErrors.name}
            />
          ) : null}

          <Input
            label="Email"
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            placeholder="alex@synctroop.app"
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            placeholder="••••••••"
            error={fieldErrors.password}
          />

          {submitError ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{submitError}</p> : null}

          <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : activeTab === 'signup' ? 'Create account' : 'Login'}
          </Button>
        </form>
      </div>
    </Modal>
  )
}