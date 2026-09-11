'use client'

import { useState } from 'react'
import styles from './Navbar.module.css'

interface NavbarProps {
  walletAddress?: string
  chillPoints?: number
  cadeCoins?: number
  onConnect?: () => void
}

export function Navbar({ walletAddress, chillPoints, cadeCoins, onConnect }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        {/* Logo */}
        <a href="/" className={styles.logo}>
          <span className={styles.logoEmoji}>🦫</span>
          <span className={styles.logoText}>
            Cade <span className={styles.logoDim}>the Chill Capybara</span>
          </span>
        </a>

        {/* Desktop Nav Links */}
        <ul className={styles.navLinks}>
          <li><a href="/games" className={styles.navLink}>🎮 Games</a></li>
          <li><a href="/leaderboard" className={styles.navLink}>🏆 Serenity Rankings</a></li>
          <li><a href="/badges" className={styles.navLink}>🏅 Meadow Badges</a></li>
          <li><a href="/market" className={styles.navLink}>🛒 Market</a></li>
        </ul>

        {/* Right Side */}
        <div className={styles.navRight}>
          {walletAddress ? (
            <div className={styles.walletInfo}>
              <span className={styles.stat}>
                <span className={styles.statIcon}>✨</span>
                {chillPoints?.toLocaleString() ?? '0'}
              </span>
              <span className={styles.statDivider} />
              <span className={styles.stat}>
                <span className={styles.statIcon}>🌾</span>
                {cadeCoins?.toLocaleString() ?? '0'}
              </span>
              <button className={`${styles.walletBtn} btn btn-secondary`}>
                {shortAddr}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onConnect}>
              Connect Wallet
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={menuOpen ? styles.barOpen : styles.bar} />
            <span className={menuOpen ? styles.barOpen : styles.bar} />
            <span className={menuOpen ? styles.barOpen : styles.bar} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <a href="/games" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🎮 Games</a>
          <a href="/leaderboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏆 Serenity Rankings</a>
          <a href="/badges" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏅 Meadow Badges</a>
          <a href="/market" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🛒 Market</a>
        </div>
      )}
    </nav>
  )
}
