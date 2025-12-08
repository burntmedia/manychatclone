import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { api } from '../lib/api'
import styles from './Dashboard.module.css'

const fallbackActivity = [
  {
    title: 'Automation replied to 12 comments',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: 'New keyword added: "launch"',
    time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: '3 new posts synced from IG',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

function formatRelativeTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  const timestamp = date?.getTime()
  if (Number.isNaN(timestamp)) return 'Recently'

  const diffMs = Date.now() - timestamp
  const diffSec = Math.max(Math.round(diffMs / 1000), 0)
  if (diffSec < 45) return 'Just now'

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDays = Math.round(diffHr / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export default function Dashboard() {
  const [recentActivity, setRecentActivity] = useState(fallbackActivity)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [metrics, setMetrics] = useState({
    automations: null,
    keywords: null,
    replies: null,
    apiStatus: 'Checking...'
  })
  const [metricsTone, setMetricsTone] = useState('warning')
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState(null)

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setMetricsLoading(true)
      setMetricsError(null)
      try {
        const [automations, keywords, logs, health] = await Promise.all([
          api.fetchAutomations({ signal: controller.signal }),
          api.fetchKeywords({ signal: controller.signal }),
          api.fetchLogs({ signal: controller.signal }),
          api.fetchHealth({ signal: controller.signal }),
        ])

        if (ignore) return

        setMetrics({
          automations: Array.isArray(automations) ? automations.length : null,
          keywords: Array.isArray(keywords) ? keywords.length : null,
          replies: Array.isArray(logs) ? logs.length : null,
          apiStatus: health?.status ? String(health.status) : 'Unknown',
        })
        setMetricsTone(health?.status === 'ok' ? 'positive' : 'warning')
      } catch (error) {
        if (controller.signal.aborted || ignore) return
        setMetricsError(error?.message || 'Unable to load dashboard stats')
        setMetrics((prev) => ({ ...prev, apiStatus: 'Offline' }))
        setMetricsTone('negative')
      } finally {
        if (!ignore) {
          setMetricsLoading(false)
        }
      }
    }, 150)

    return () => {
      ignore = true
      controller.abort()
      clearTimeout(timeout)
    }
  }, [refreshIndex])

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setActivityLoading(true)
      setActivityError(null)

      try {
        const posts = await api.fetchPosts(
          { limit: 5 },
          {
            signal: controller.signal,
          }
        )
        if (!ignore && Array.isArray(posts)) {
          const mapped = posts.slice(0, 3).map((post) => ({
            title: post.caption || post.title || 'Instagram post',
            time:
              post.created_time || post.createdAt || post.timestamp || post.time || new Date().toISOString(),
          }))
          if (mapped.length) {
            setRecentActivity(mapped)
          }
        }
      } catch (error) {
        if (controller.signal.aborted || ignore) return
        setActivityError('Unable to load recent activity')
        console.debug('Dashboard activity placeholder in use', error)
      } finally {
        if (!ignore) {
          setActivityLoading(false)
        }
      }
    }, 150)

    return () => {
      ignore = true
      controller.abort()
      clearTimeout(timeout)
    }
  }, [refreshIndex])

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
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setRefreshIndex((i) => i + 1)}
          disabled={metricsLoading || activityLoading}
        >
          {metricsLoading || activityLoading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      {metricsError ? <p className={styles.error}>Failed to load stats: {metricsError}</p> : null}

      <div className={styles.statGrid}>
        <StatCard
          label="Active automations"
          value={metricsLoading ? 'Loading…' : metrics.automations ?? '—'}
          sublabel="Synced from API"
        />
        <StatCard
          label="Keywords"
          value={metricsLoading ? 'Loading…' : metrics.keywords ?? '—'}
          sublabel="Watching comments"
        />
        <StatCard
          label="Replies sent"
          value={metricsLoading ? 'Loading…' : metrics.replies ?? '—'}
          tone={metrics.replies ? 'positive' : 'neutral'}
          sublabel="From recent logs"
        />
        <StatCard
          label="API status"
          value={metricsLoading ? 'Checking…' : metrics.apiStatus}
          tone={metricsTone}
          sublabel={metricsError ? 'Connection issue' : 'Express backend'}
        />
      </div>

      <div className={styles.activityCard}>
        <div className={styles.activityHeader}>
          <h3>Recent activity</h3>
          <p className={styles.subtitle}>Latest events from Instagram + automations.</p>
        </div>
        {activityError ? <p className={styles.error}>{activityError}</p> : null}
        <ul className={styles.activityList}>
          {recentActivity.map((item, idx) => (
            <li key={idx} className={styles.activityItem}>
              <div>
                <p className={styles.activityTitle}>{item.title}</p>
                <p className={styles.activityTime}>{formatRelativeTime(item.time)}</p>
              </div>
              <span className={styles.badge}>{activityLoading ? 'Updating' : 'Feed'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
