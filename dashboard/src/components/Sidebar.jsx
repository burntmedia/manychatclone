import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: '📊' },
  { label: 'Posts', to: '/posts', icon: '🖼️' },
  { label: 'Automations', to: '/automations', icon: '🤖' },
  { label: 'Keywords', to: '/keywords', icon: '🔑' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>Insta Automator</div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.navLink, isActive ? styles.active : ''].join(' ').trim()
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.helpCard}>
        <p className={styles.helpTitle}>Need help?</p>
        <p className={styles.helpText}>
          Wire up your backend URL in <code>src/lib/api.js</code> to start syncing
          data.
        </p>
      </div>
    </aside>
  )
}
