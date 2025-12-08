import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import styles from './Posts.module.css'

const samplePosts = [
  {
    id: '1',
    caption: 'Summer launch announcement',
    comments: 42,
    likes: 320,
    createdAt: '2025-01-10',
  },
  {
    id: '2',
    caption: 'Behind the scenes reel',
    comments: 18,
    likes: 150,
    createdAt: '2025-01-07',
  },
]

export default function Posts() {
  const [posts, setPosts] = useState(samplePosts)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadPosts() {
      try {
        setLoading(true)
        const data = await api.fetchPosts()
        if (!ignore && Array.isArray(data)) {
          setPosts(data)
          setError('')
        }
      } catch (error) {
        console.debug('Failed to fetch posts', error)
        if (!ignore) {
          setError('Unable to reach backend yet, showing sample data.')
          setPosts(samplePosts)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadPosts()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Content</p>
          <h2 className={styles.title}>Posts</h2>
          <p className={styles.subtitle}>
            Pull posts from your Instagram account. Click a post to review or
            respond to comments.
          </p>
        </div>
        <button className={styles.secondaryButton} type="button">
          Sync latest posts
        </button>
      </div>

      {error ? <div className={styles.banner}>{error}</div> : null}
      {loading && <p className={styles.muted}>Loading posts…</p>}

      <div className={styles.list}>
        {posts.map((post) => (
          <article key={post.id} className={styles.card}>
            <div>
              <p className={styles.caption}>{post.caption || 'Untitled post'}</p>
              <p className={styles.meta}>
                {post.createdAt ? `Published ${post.createdAt}` : 'Date unknown'}
              </p>
            </div>
            <div className={styles.metrics}>
              <span>👍 {post.likes ?? '—'}</span>
              <span>💬 {post.comments ?? '—'}</span>
              <button className={styles.linkButton} type="button">
                View comments
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
