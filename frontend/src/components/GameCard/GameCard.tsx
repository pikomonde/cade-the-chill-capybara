import styles from './GameCard.module.css'

export type GameStatus = 'available' | 'completed' | 'locked'

interface GameCardProps {
  emoji: string
  name: string
  description: string
  coinReward: string
  pointReward: string
  hasBadge: boolean
  status: GameStatus
  href: string
}

export function GameCard({
  emoji,
  name,
  description,
  coinReward,
  pointReward,
  hasBadge,
  status,
  href,
}: GameCardProps) {
  const isLocked = status === 'locked'
  const isDone = status === 'completed'

  return (
    <a
      href={isLocked ? undefined : href}
      className={`${styles.card} ${isDone ? styles.done : ''} ${isLocked ? styles.locked : ''}`}
      aria-disabled={isLocked}
    >
      {/* Status indicator */}
      {isDone && (
        <div className={styles.completedBadge}>
          <span>✓ Done</span>
        </div>
      )}
      {isLocked && (
        <div className={styles.lockedOverlay}>🔒</div>
      )}

      {/* Game icon */}
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{emoji}</span>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.desc}>{description}</p>
      </div>

      {/* Rewards */}
      <div className={styles.rewards}>
        <span className={styles.reward}>
          <span>🌾</span> {coinReward} CADE
        </span>
        <span className={styles.reward}>
          <span>✨</span> {pointReward} CP
        </span>
        {hasBadge && (
          <span className={`${styles.reward} ${styles.badgeReward}`}>
            <span>🏅</span> Badge
          </span>
        )}
      </div>

      {/* CTA */}
      {!isLocked && !isDone && (
        <div className={styles.cta}>
          Play Today&apos;s Quest →
        </div>
      )}
      {isDone && (
        <div className={styles.ctaDone}>
          Come back tomorrow! 🌿
        </div>
      )}
    </a>
  )
}
