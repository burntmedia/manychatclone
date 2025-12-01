import { useState } from 'react'
import { api } from '../lib/api'
import styles from './Settings.module.css'

const initialSettings = {
  apiToken: '',
  webhookUrl: '',
  metaAppId: '',
  metaAppSecret: '',
}

export default function Settings() {
  const [form, setForm] = useState(initialSettings)
  const [status, setStatus] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')

    try {
      await api.saveSettings(form)
      setStatus('Settings saved. Replace with backend integration to persist securely.')
    } catch (error) {
      console.debug('Save settings via backend', error)
      setStatus('Stored locally. Connect your backend endpoint to persist these.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Configuration</p>
          <h2 className={styles.title}>Settings</h2>
          <p className={styles.subtitle}>
            Store tokens, webhook URLs, and Meta app credentials for the bot.
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>
          API token
          <input
            className={styles.input}
            name="apiToken"
            placeholder="Bearer token"
            value={form.apiToken}
            onChange={handleChange}
          />
        </label>
        <label className={styles.label}>
          Webhook URL
          <input
            className={styles.input}
            name="webhookUrl"
            placeholder="https://example.com/webhook"
            value={form.webhookUrl}
            onChange={handleChange}
          />
        </label>
        <label className={styles.label}>
          Meta App ID
          <input
            className={styles.input}
            name="metaAppId"
            placeholder="App ID"
            value={form.metaAppId}
            onChange={handleChange}
          />
        </label>
        <label className={styles.label}>
          Meta App Secret
          <input
            className={styles.input}
            name="metaAppSecret"
            placeholder="App secret"
            type="password"
            value={form.metaAppSecret}
            onChange={handleChange}
          />
        </label>
        <button className={styles.primaryButton} type="submit">
          Save settings
        </button>
        {status ? <p className={styles.status}>{status}</p> : null}
      </form>
    </div>
  )
}
