import styles from './Topbar.module.css'

export default function Topbar() {
  return (
    <header className={styles.topbar}>
      <div>
        <p className={styles.overline}>Instagram Automation</p>
        <h1 className={styles.title}>Control Center</h1>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton}>
          + New Automation
        </button>
        <div className={styles.avatar}>IA</div>
      </div>
    </header>
  )
}
