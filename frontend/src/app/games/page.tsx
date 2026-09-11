import { Navbar } from '@/components/Navbar/Navbar'
import { GameCard } from '@/components/GameCard/GameCard'
import styles from './page.module.css'

const ALL_GAMES = [
  // Phase 1 — MVP
  {
    emoji: '🔢',
    name: 'Number Guess',
    description: 'Guess Cade\'s secret number (1–100). The closer you get, the higher the score!',
    coinReward: '1–5',
    pointReward: '10–50',
    hasBadge: false,
    status: 'available' as const,
    href: '/games/number-guess',
    phase: 1,
  },
  {
    emoji: '🧩',
    name: 'Sudoku',
    description: 'Complete the auto-generated 9×9 Sudoku grid for today!',
    coinReward: '5–15',
    pointReward: '50–150',
    hasBadge: true,
    status: 'available' as const,
    href: '/games/sudoku',
    phase: 1,
  },
  {
    emoji: '📐',
    name: 'Figrid',
    description: 'Number crossword. Fill the grid using Cade\'s math clues.',
    coinReward: '5–15',
    pointReward: '50–150',
    hasBadge: true,
    status: 'available' as const,
    href: '/games/figrid',
    phase: 1,
  },
  // Phase 2 — Coming soon
  {
    emoji: '🚧',
    name: 'Klotski',
    description: 'Sliding block puzzle. Help Cade escape the meadow traffic jam!',
    coinReward: '5–20',
    pointReward: '50–200',
    hasBadge: true,
    status: 'locked' as const,
    href: '/games/klotski',
    phase: 2,
  },
  {
    emoji: '🐝',
    name: 'Spelling Bee',
    description: 'Find as many words as possible from Cade\'s 7 daily letters.',
    coinReward: '3–10',
    pointReward: '30–100',
    hasBadge: true,
    status: 'locked' as const,
    href: '/games/spelling-bee',
    phase: 2,
  },
  {
    emoji: '🔲',
    name: '2048',
    description: 'Merge number tiles until you reach 2048. Chill but addictive!',
    coinReward: '2–10',
    pointReward: '20–100',
    hasBadge: false,
    status: 'locked' as const,
    href: '/games/2048',
    phase: 2,
  },
  {
    emoji: '🃏',
    name: 'Memory Flip',
    description: 'Match all card pairs before time runs out. Test Cade\'s memory!',
    coinReward: '2–8',
    pointReward: '20–80',
    hasBadge: false,
    status: 'locked' as const,
    href: '/games/memory-flip',
    phase: 2,
  },
]

export default function GamesPage() {
  const phase1 = ALL_GAMES.filter(g => g.phase === 1)
  const phase2 = ALL_GAMES.filter(g => g.phase === 2)

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">

          {/* Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>🎮 Daily Quests</h1>
              <p className={styles.pageSub}>
                A new puzzle every day. Complete all quests to maximize your rewards!
                Resets at <strong>00:00 UTC</strong> daily.
              </p>
            </div>
            <div className={styles.datePill}>
              📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {/* Phase 1 Games */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Meadow Quests</h2>
              <span className="badge-pill badge-green">✅ Phase 1 · Available</span>
            </div>
            <div className="grid-3">
              {phase1.map(g => <GameCard key={g.name} {...g} />)}
            </div>
          </section>

          {/* Phase 2 Games */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Coming Soon</h2>
              <span className="badge-pill badge-gold">🔒 Phase 2</span>
            </div>
            <div className="grid-4">
              {phase2.map(g => <GameCard key={g.name} {...g} />)}
            </div>
          </section>

          {/* Reward info */}
          <section className={styles.rewardInfo}>
            <h3 className={styles.rewardTitle}>🌾 Reward System</h3>
            <div className="grid-3">
              {REWARD_INFO.map((r, i) => (
                <div key={i} className={`card ${styles.rewardCard}`}>
                  <span className={styles.rewardEmoji}>{r.emoji}</span>
                  <div>
                    <h4 className={styles.rewardName}>{r.name}</h4>
                    <p className={styles.rewardDesc}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  )
}

const REWARD_INFO = [
  {
    emoji: '🌾',
    name: 'CADE Coin',
    desc: 'Permanent on-chain token. The better you play, the more coins you collect.',
  },
  {
    emoji: '✨',
    name: 'Chill Points',
    desc: 'Your score for Serenity Rankings. Decays 1% every 24h — stay active!',
  },
  {
    emoji: '🏅',
    name: 'Meadow Badge',
    desc: 'Exclusive daily badge. Only earnable on that specific day — forever rare!',
  },
]
