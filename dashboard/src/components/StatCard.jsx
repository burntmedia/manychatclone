import styles from './StatCard.module.css'

export default function StatCard({ label, value, sublabel, tone = 'neutral' }) {
  return (
    <div className={[styles.card, styles[tone]].join(' ').trim()}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {sublabel ? <p className={styles.sublabel}>{sublabel}</p> : null}
    </div>
  )
}
