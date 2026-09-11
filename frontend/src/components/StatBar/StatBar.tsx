import styles from './StatBar.module.css'

interface StatBarProps {
  chillPoints: number
  maxChillPoints?: number
  cadeCoins: number
  rank?: number
  tier?: string
  decayInfo?: string // e.g. "decays in 18h"
}

export function StatBar({
  chillPoints,
  maxChillPoints = 10000,
  cadeCoins,
  rank,
  tier = 'Wanderer',
  decayInfo,
}: StatBarProps) {
  const pct = Math.min((chillPoints / maxChillPoints) * 100, 100)

  return (
    <div className={styles.statBar}>
      <div className={styles.container}>

        {/* Chill Points with decay bar */}
        <div className={styles.statGroup}>
          <div className={styles.labelRow}>
            <span className={styles.label}>
              <span>✨</span> Chill Points
            </span>
            <span className={styles.value}>{chillPoints.toLocaleString()}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          {decayInfo && (
            <span className={styles.decayInfo}>⏳ {decayInfo}</span>
          )}
        </div>

        <div className={styles.divider} />

        {/* CADE Coin */}
        <div className={styles.statGroup}>
          <span className={styles.label}><span>🌾</span> CADE Coin</span>
          <span className={styles.valueLarge}>{cadeCoins.toLocaleString()}</span>
        </div>

        <div className={styles.divider} />

        {/* Rank */}
        {rank !== undefined && (
          <>
            <div className={styles.statGroup}>
              <span className={styles.label}><span>🏆</span> Rank</span>
              <span className={styles.valueLarge}>#{rank.toLocaleString()}</span>
            </div>
            <div className={styles.divider} />
          </>
        )}

        {/* Tier */}
        <div className={styles.statGroup}>
          <span className={styles.label}><span>🦫</span> Tier</span>
          <span className={`badge-pill badge-gold ${styles.tierBadge}`}>{tier}</span>
        </div>

      </div>
    </div>
  )
}
