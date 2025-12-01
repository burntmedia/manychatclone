import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import styles from './Keywords.module.css'

const seedKeywords = ['pricing', 'support', 'demo']

export default function Keywords() {
  const [keywords, setKeywords] = useState(seedKeywords)
  const [newKeyword, setNewKeyword] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadKeywords() {
      try {
        const data = await api.fetchKeywords()
        if (!ignore && Array.isArray(data) && data.length) {
          setKeywords(data.map((k) => k.keyword || k))
        }
      } catch (error) {
        console.debug('Keywords placeholder data in use', error)
      }
    }

    loadKeywords()
    return () => {
      ignore = true
    }
  }, [])

  const addKeyword = async (event) => {
    event.preventDefault()
    const normalized = newKeyword.trim()
    if (!normalized) return

    const updated = [normalized, ...keywords.filter((k) => k !== normalized)]
    setKeywords(updated)
    setNewKeyword('')

    try {
      await api.addKeyword({ keyword: normalized })
      setStatus('Keyword saved. Connect to backend to persist permanently.')
    } catch (error) {
      console.debug('Persist keyword via backend', error)
      setStatus('Stored locally. Replace with backend call to persist.')
    }
  }

  const removeKeyword = async (keyword) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword))
    try {
      await api.removeKeyword(keyword)
    } catch (error) {
      console.debug('Remove keyword via backend', error)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Keyword triggers</p>
          <h2 className={styles.title}>Keywords</h2>
          <p className={styles.subtitle}>
            Manage the phrases that start comment replies or DMs.
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={addKeyword}>
        <input
          className={styles.input}
          placeholder="Add a keyword"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
        />
        <button type="submit" className={styles.primaryButton}>
          Add keyword
        </button>
      </form>
      {status ? <p className={styles.status}>{status}</p> : null}

      <div className={styles.chips}>
        {keywords.map((keyword) => (
          <span key={keyword} className={styles.chip}>
            {keyword}
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => removeKeyword(keyword)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
