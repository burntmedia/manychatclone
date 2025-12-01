import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import styles from './Automations.module.css'

const defaultRules = [
  {
    id: 'auto-1',
    name: 'Reply to “pricing?” comments',
    trigger: 'Keyword match: pricing',
    action: 'Send DM with product catalog',
    status: 'Active',
  },
  {
    id: 'auto-2',
    name: 'Greet new followers',
    trigger: 'Follow event',
    action: 'Leave welcome comment',
    status: 'Paused',
  },
]

export default function Automations() {
  const [rules, setRules] = useState(defaultRules)
  const [form, setForm] = useState({ name: '', trigger: '', action: '' })
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadRules() {
      try {
        const data = await api.fetchAutomations()
        if (!ignore && Array.isArray(data)) {
          setRules(data)
        }
      } catch (error) {
        console.debug('Automations placeholder data in use', error)
      }
    }

    loadRules()
    return () => {
      ignore = true
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')

    if (!form.name || !form.trigger || !form.action) {
      setStatusMessage('Please complete all fields before saving.')
      return
    }

    const newRule = { ...form, id: crypto.randomUUID(), status: 'Active' }
    setRules((prev) => [newRule, ...prev])

    try {
      await api.createAutomation(newRule)
      setStatusMessage('Saved! Replace with your backend call to persist.')
    } catch (error) {
      console.debug('Persist automation via backend', error)
      setStatusMessage('Saved locally. Connect backend to persist this rule.')
    }

    setForm({ name: '', trigger: '', action: '' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Automation</p>
          <h2 className={styles.title}>Automations</h2>
          <p className={styles.subtitle}>
            Configure rules to automatically reply, DM, or triage comments.
          </p>
        </div>
      </div>

      <div className={styles.formCard}>
        <div>
          <h3>Create a rule</h3>
          <p className={styles.subtitle}>
            This UI is wired for your backend—just swap the placeholders in
            <code>src/lib/api.js</code>.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              name="name"
              placeholder="Welcome new commenters"
              value={form.name}
              onChange={handleChange}
            />
          </label>
          <label className={styles.label}>
            Trigger
            <input
              className={styles.input}
              name="trigger"
              placeholder="Keyword match: hello, hi"
              value={form.trigger}
              onChange={handleChange}
            />
          </label>
          <label className={styles.label}>
            Action
            <input
              className={styles.input}
              name="action"
              placeholder="Reply with templated message"
              value={form.action}
              onChange={handleChange}
            />
          </label>
          <button type="submit" className={styles.primaryButton}>
            Save automation
          </button>
          {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
        </form>
      </div>

      <div className={styles.list}>
        {rules.map((rule) => (
          <article key={rule.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{rule.name}</p>
              <p className={styles.meta}>{rule.trigger}</p>
              <p className={styles.meta}>{rule.action}</p>
            </div>
            <span className={styles.badge}>{rule.status}</span>
          </article>
        ))}
      </div>
    </div>
  )
}
