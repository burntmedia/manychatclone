import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { api } from '../lib/api'
import styles from './Dashboard.module.css'

const fallbackActivity = [
  { title: 'Automation replied to 12 comments', time: '2h ago' },
  { title: 'New keyword added: "launch"', time: '4h ago' },
  { title: '3 new posts synced from IG', time: 'Yesterday' },
]

export default function Dashboard() {
  const [recentActivity, setRecentActivity] = useState(fallbackActivity)

  useEffect(() => {
    let ignore = false

    async function loadActivity() {
      try {
        // Example of how to hydrate the dashboard from your backend
        const posts = await api.fetchPosts({ limit: 5 })
        if (!ignore && Array.isArray(posts)) {
          const mapped = posts.slice(0, 3).map((post) => ({
            title: post.caption || post.title || 'Instagram post',
            time: post.createdAt || 'Recently synced',
          }))
          if (mapped.length) {
            setRecentActivity(mapped)
          }
        }
      } catch (error) {
        // Keep fallback content while backend is not connected
        console.debug('Dashboard activity placeholder in use', error)
      }
    }

    loadActivity()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.kicker}>Snapshot</p>
          <h2 className={styles.title}>Dashboard</h2>
          <p className={styles.subtitle}>
            Monitor automations, posts, and keyword triggers at a glance.
          </p>
        </div>
        <button type="button" className={styles.secondaryButton}>
          Refresh data
        </button>
      </div>

      <div className={styles.statGrid}>
        <StatCard label="Active automations" value="8" sublabel="3 paused" />
        <StatCard label="Keywords" value="24" sublabel="Watching comments" />
        <StatCard label="Replies sent" value="1,280" tone="positive" sublabel="Last 30 days" />
        <StatCard label="API status" value="Connected" tone="warning" sublabel="Using dev environment" />
      </div>

      <div className={styles.activityCard}>
        <div className={styles.activityHeader}>
          <h3>Recent activity</h3>
          <p className={styles.subtitle}>Latest events from Instagram + automations.</p>
        </div>
        <ul className={styles.activityList}>
          {recentActivity.map((item, idx) => (
            <li key={idx} className={styles.activityItem}>
              <div>
                <p className={styles.activityTitle}>{item.title}</p>
                <p className={styles.activityTime}>{item.time}</p>
              </div>
              <span className={styles.badge}>Feed</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
