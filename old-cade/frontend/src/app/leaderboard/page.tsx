import { Navbar } from '@/components/Navbar/Navbar'
import styles from './page.module.css'

// Mock data — will be replaced with API calls
const MOCK_GLOBAL = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  name: ['CadeMaxi', 'ChillVibes', 'CapyQueen', 'Meadow Pal', 'SudokuGuru', 'PuzzleMaster', 'DailyGrinder', 'QuietCapy', 'ZenPlayer', 'NightOwl', 'MorningDew', 'RiverWalker', 'GrassEater', 'SunBather', 'WaterLover', 'PeacefulSoul', 'CalmPlayer', 'SlowAndSteady', 'ChillMode', 'RelaxedCapy'][i],
  address: `0x${Math.random().toString(16).slice(2, 8)}…${Math.random().toString(16).slice(2, 6)}`,
  chillPoints: Math.round(10000 * Math.exp(-i * 0.3)),
  cadeCoins: Math.round(800 - i * 35),
  streak: Math.max(1, 21 - i),
  tier: i < 3 ? 'Legend' : i < 8 ? 'Adventurer' : i < 14 ? 'Settler' : 'Wanderer',
}))

const TIER_COLORS: Record<string, string> = {
  Legend: 'badge-gold',
  Adventurer: 'badge-green',
  Settler: '',
  Wanderer: '',
}

export default function LeaderboardPage() {
  const top3 = MOCK_GLOBAL.slice(0, 3)
  const rest = MOCK_GLOBAL.slice(3)

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">

          {/* Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>🏆 Serenity Rankings</h1>
            <p className={styles.pageSub}>
              Chill Points meluruh 1% setiap 24 jam. Main setiap hari untuk tetap di puncak padang rumput!
            </p>
          </div>

          {/* Tabs — placeholder for global/herd toggle */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.tabActive}`} id="tab-global">🌍 Global</button>
            <button className={styles.tab} id="tab-herd">🐾 Herd-ku</button>
          </div>

          {/* Podium — Top 3 */}
          <div className={styles.podium}>
            {/* 2nd Place */}
            <div className={`${styles.podiumCard} ${styles.second}`}>
              <span className={styles.podiumMedal}>🥈</span>
              <div className={styles.podiumAvatar}>
                {top3[1]?.name.slice(0, 2).toUpperCase()}
              </div>
              <span className={styles.podiumName}>{top3[1]?.name}</span>
              <span className={styles.podiumPoints}>{top3[1]?.chillPoints.toLocaleString()} ✨</span>
              <div className={styles.podiumBase} style={{ height: 80 }} />
            </div>

            {/* 1st Place */}
            <div className={`${styles.podiumCard} ${styles.first}`}>
              <span className={styles.podiumMedal}>🥇</span>
              <div className={`${styles.podiumAvatar} ${styles.avatarFirst}`}>
                {top3[0]?.name.slice(0, 2).toUpperCase()}
              </div>
              <span className={styles.podiumName}>{top3[0]?.name}</span>
              <span className={styles.podiumPoints}>{top3[0]?.chillPoints.toLocaleString()} ✨</span>
              <div className={styles.podiumBase} style={{ height: 110 }} />
            </div>

            {/* 3rd Place */}
            <div className={`${styles.podiumCard} ${styles.third}`}>
              <span className={styles.podiumMedal}>🥉</span>
              <div className={styles.podiumAvatar}>
                {top3[2]?.name.slice(0, 2).toUpperCase()}
              </div>
              <span className={styles.podiumName}>{top3[2]?.name}</span>
              <span className={styles.podiumPoints}>{top3[2]?.chillPoints.toLocaleString()} ✨</span>
              <div className={styles.podiumBase} style={{ height: 60 }} />
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Tier</th>
                  <th>✨ Chill Points</th>
                  <th>🌾 CADE Coin</th>
                  <th>🔥 Streak</th>
                </tr>
              </thead>
              <tbody>
                {rest.map(p => (
                  <tr key={p.rank} className={styles.tableRow}>
                    <td className={styles.rankCell}>#{p.rank}</td>
                    <td className={styles.playerCell}>
                      <div className={styles.playerInfo}>
                        <div className={styles.avatar}>{p.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className={styles.playerName}>{p.name}</div>
                          <div className={styles.playerAddr}>{p.address}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-pill ${TIER_COLORS[p.tier] || styles.tierMuted}`}>
                        {p.tier}
                      </span>
                    </td>
                    <td className={styles.pointsCell}>{p.chillPoints.toLocaleString()}</td>
                    <td className={styles.coinCell}>{p.cadeCoins.toLocaleString()}</td>
                    <td className={styles.streakCell}>{p.streak}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Epoch info */}
          <div className={styles.epochInfo}>
            <span className={styles.epochIcon}>⏰</span>
            <p className={styles.epochText}>
              <strong>Herd epoch</strong> direset setiap minggu (Senin 00:00 UTC).
              Chill Points global meluruh 1% setiap 24 jam — tetap aktif untuk mempertahankan posisi!
            </p>
          </div>

        </div>
      </main>
    </>
  )
}
