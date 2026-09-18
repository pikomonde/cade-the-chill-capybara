import styles from './page.module.css'
import { Navbar } from '@/components/Navbar/Navbar'
import { GameCard } from '@/components/GameCard/GameCard'
import { StatBar } from '@/components/StatBar/StatBar'

const GAMES = [
  {
    emoji: '🔢',
    name: 'Number Guess',
    description: 'Guess Cade\'s secret number (1–100). The closer you are, the more points you earn!',
    coinReward: '1–5',
    pointReward: '10–50',
    hasBadge: false,
    status: 'available' as const,
    href: '/games/number-guess',
  },
  {
    emoji: '🧩',
    name: 'Sudoku',
    description: 'Classic number puzzle. Solve today\'s 9×9 Sudoku grid from Cade!',
    coinReward: '5–15',
    pointReward: '50–150',
    hasBadge: true,
    status: 'available' as const,
    href: '/games/sudoku',
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
  },
  {
    emoji: '🚧',
    name: 'Klotski',
    description: 'Sliding block puzzle. Help Cade escape the meadow traffic jam!',
    coinReward: '5–20',
    pointReward: '50–200',
    hasBadge: true,
    status: 'locked' as const,
    href: '/games/klotski',
  },
  {
    emoji: '🐝',
    name: 'Spelling Bee',
    description: 'Find as many words as possible from Cade\'s 7 daily letters!',
    coinReward: '3–10',
    pointReward: '30–100',
    hasBadge: true,
    status: 'locked' as const,
    href: '/games/spelling-bee',
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
  },
]

// Mock data for demo — will come from API
const MOCK_PLAYER = {
  walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  chillPoints: 3420,
  cadeCoins: 127,
  rank: 88,
  tier: 'Settler',
  decayInfo: 'decays 1% in 6h',
}

export default function HomePage() {
  return (
    <>
      <Navbar
        walletAddress={MOCK_PLAYER.walletAddress}
        chillPoints={MOCK_PLAYER.chillPoints}
        cadeCoins={MOCK_PLAYER.cadeCoins}
      />

      <StatBar
        chillPoints={MOCK_PLAYER.chillPoints}
        cadeCoins={MOCK_PLAYER.cadeCoins}
        rank={MOCK_PLAYER.rank}
        tier={MOCK_PLAYER.tier}
        decayInfo={MOCK_PLAYER.decayInfo}
      />

      <main className={styles.main}>

        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={`${styles.heroBg} container-sm`}>
            <div className={`badge-pill badge-gold ${styles.heroBadge} animate-fade-in-up`}>
              🌿 Testnet Live · Base Sepolia
            </div>
            <h1 className={`${styles.heroTitle} animate-fade-in-up`}>
              Chill.<br />
              <span className="text-gradient-gold">Play daily.</span><br />
              Earn on-chain.
            </h1>
            <p className={`${styles.heroSub} animate-fade-in-up`}>
              Cade the Capybara challenges you to daily mini-games.
              Complete quests, earn <strong>CADE Coin</strong> 🌾, collect <strong>Meadow Badges</strong> 🏅,
              and climb the <strong>Serenity Rankings</strong> 🏆 — all on Base L2.
            </p>
            <div className={`${styles.heroActions} animate-fade-in-up`}>
              <a href="/games" className="btn btn-primary">
                Start Playing 🦫
              </a>
              <a href="#how-it-works" className="btn btn-secondary">
                How it works
              </a>
            </div>

            {/* Capybara mascot floating */}
            <div className={`${styles.mascot} animate-float`} aria-hidden="true">
              🦫
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className={styles.howSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>How Cade&apos;s Meadow Works</h2>
            <p className={styles.sectionSub}>
              Simple flow, real on-chain rewards. No gas fees for free players.
            </p>
            <div className="grid-3">
              {HOW_STEPS.map((step, i) => (
                <div key={i} className={`card ${styles.howCard}`}>
                  <span className={styles.howNum}>0{i + 1}</span>
                  <span className={styles.howEmoji}>{step.emoji}</span>
                  <h3 className={styles.howTitle}>{step.title}</h3>
                  <p className={styles.howDesc}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Daily Quests ── */}
        <section className={styles.gamesSection}>
          <div className="container">
            <div className={styles.gamesSectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Today&apos;s Quests</h2>
                <p className={styles.sectionSub}>
                  New puzzles every day at 00:00 UTC. Complete all to maximize rewards!
                </p>
              </div>
              <div className={styles.datePill}>
                📅 {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <div className="grid-3">
              {GAMES.map((game) => (
                <GameCard key={game.name} {...game} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Tokenomics ── */}
        <section className={styles.tokenSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>CADE Coin Economy</h2>
            <p className={styles.sectionSub}>
              Two reward systems work in harmony. Your coins are permanent; your points keep you active.
            </p>
            <div className="grid-2">
              {TOKEN_CARDS.map((t, i) => (
                <div key={i} className={`card ${styles.tokenCard}`}>
                  <span className={styles.tokenIcon}>{t.emoji}</span>
                  <div>
                    <h3 className={styles.tokenName}>{t.name}</h3>
                    <p className={styles.tokenDesc}>{t.desc}</p>
                    <ul className={styles.tokenFeatures}>
                      {t.features.map((f, fi) => (
                        <li key={fi}><span className={styles.tokenBullet}>→</span> {f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Meadow Pass CTA ── */}
        <section className={styles.passSection}>
          <div className="container-sm">
            <div className={styles.passCard}>
              <div className={styles.passGlow} aria-hidden="true" />
              <span className={styles.passEmoji}>🌿</span>
              <h2 className={styles.passTitle}>Upgrade to Meadow Pass</h2>
              <p className={styles.passSub}>
                Unlock on-chain settlement, 2–3× coin multipliers, exclusive Meadow Badges,
                and priority in Serenity Rankings — starting from just <strong>1.5 USDC/month</strong>.
              </p>
              <div className={styles.passActions}>
                <a href="/subscribe" className="btn btn-primary animate-pulse-glow">
                  Get Meadow Pass 🌿
                </a>
                <a href="/subscribe#tiers" className="btn btn-ghost">
                  View all tiers
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <div className="container">
            <div className={styles.footerInner}>
              <span className={styles.footerLogo}>🦫 Cade the Chill Capybara</span>
              <span className={styles.footerMeta}>Built on Base L2 · ERC-4337 Smart Wallets</span>
              <div className={styles.footerLinks}>
                <a href="https://github.com/pikomonde/cade-the-chill-capybara" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="/SPEC.md">Spec</a>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </>
  )
}

// ── Static data ─────────────────────────────

const HOW_STEPS = [
  {
    emoji: '🔐',
    title: 'Connect Wallet',
    desc: 'Login with Google or Telegram via Privy. A smart wallet is auto-created for you — no seed phrase needed.',
  },
  {
    emoji: '🎮',
    title: 'Play Daily Quests',
    desc: 'Complete up to 3 daily mini-games. Each game generates a unique puzzle seed refreshed at midnight UTC.',
  },
  {
    emoji: '🌾',
    title: 'Earn On-Chain',
    desc: 'Collect CADE Coin & Chill Points. Subscribers get settled on Base L2 instantly; free players batch weekly.',
  },
]

const TOKEN_CARDS = [
  {
    emoji: '🌾',
    name: 'CADE Coin',
    desc: 'Your permanent on-chain currency. Earned by playing, never expires. Future airdrop eligible.',
    features: [
      'ERC-20 on Base L2',
      'Earnable from all daily games',
      'Tradeable in Meadow Market',
      'Future airdrop for early players',
    ],
  },
  {
    emoji: '✨',
    name: 'Chill Points',
    desc: 'Your live ranking score. Decays 1% every 24h — stay active to maintain your rank!',
    features: [
      'Drives Serenity Rankings',
      'Decays 1%/day (stay active!)',
      'Resets per weekly epoch in Herds',
      'Bonus for subscription tiers',
    ],
  },
]
