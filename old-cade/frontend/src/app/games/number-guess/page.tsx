'use client'

import { useState, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/Navbar/Navbar'
import styles from './page.module.css'

type GamePhase = 'idle' | 'playing' | 'result'

interface Guess {
  value: number
  hint: 'too-low' | 'too-high' | 'correct'
  score: number
}

const MAX_ATTEMPTS = 7
const MIN_N = 1
const MAX_N = 100

// Deterministic seed from today's UTC date — same number for all players each day
function getTodaysNumber(): number {
  const now = new Date()
  const seed = `number-guess-${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return (Math.abs(hash) % MAX_N) + MIN_N
}

function calcScore(attempts: number, distance: number): number {
  if (distance === 0) {
    return Math.max(10, 50 - (attempts - 1) * 6)
  }
  const distPenalty = Math.min(distance * 0.5, 30)
  return Math.max(1, Math.round(10 - attempts - distPenalty))
}

export default function NumberGuessPage() {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [secret, setSecret] = useState(0)
  const [input, setInput] = useState('')
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [error, setError] = useState('')
  const [totalScore, setTotalScore] = useState(0)
  const [coinReward, setCoinReward] = useState(0)

  useEffect(() => {
    setSecret(getTodaysNumber())
  }, [])

  const startGame = () => {
    setGuesses([])
    setInput('')
    setError('')
    setPhase('playing')
  }

  const submitGuess = useCallback(() => {
    const num = parseInt(input, 10)
    if (isNaN(num) || num < MIN_N || num > MAX_N) {
      setError(`Enter a number between ${MIN_N} and ${MAX_N}`)
      return
    }
    setError('')

    const distance = Math.abs(num - secret)
    const hint = num < secret ? 'too-low' : num > secret ? 'too-high' : 'correct'
    const attemptIndex = guesses.length
    const score = calcScore(attemptIndex + 1, distance)

    const newGuess: Guess = { value: num, hint, score }
    const newGuesses = [...guesses, newGuess]
    setGuesses(newGuesses)
    setInput('')

    const isWin = hint === 'correct'
    const isOut = newGuesses.length >= MAX_ATTEMPTS

    if (isWin || isOut) {
      const best = newGuesses.reduce((a, b) =>
        Math.abs(a.value - secret) < Math.abs(b.value - secret) ? a : b
      )
      const finalScore = best.score
      const coins = distance === 0 ? Math.max(1, Math.ceil(finalScore / 10)) : 1
      setTotalScore(finalScore)
      setCoinReward(coins)
      setPhase('result')
    }
  }, [input, guesses, secret])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitGuess()
  }

  const attemptsLeft = MAX_ATTEMPTS - guesses.length

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.wrapper}>

          {/* Header */}
          <div className={styles.header}>
            <a href="/games" className={styles.backLink}>← Back to Games</a>
            <div className={styles.gameTitle}>
              <span className={styles.gameEmoji}>🔢</span>
              <div>
                <h1 className={styles.title}>Number Guess</h1>
                <p className={styles.subtitle}>
                  Guess Cade&apos;s secret number (1–100) in {MAX_ATTEMPTS} attempts!
                </p>
              </div>
            </div>
            <div className={styles.rewardPills}>
              <span className="badge-pill badge-gold">🌾 1–5 CADE Coin</span>
              <span className="badge-pill badge-green">✨ 10–50 Chill Points</span>
            </div>
          </div>

          {/* Card */}
          <div className={`card ${styles.gameCard}`}>

            {/* IDLE */}
            {phase === 'idle' && (
              <div className={styles.idleState}>
                <div className={`${styles.mascot} animate-float`}>🦫</div>
                <h2 className={styles.idleTitle}>Cade is hiding a number...</h2>
                <p className={styles.idleDesc}>
                  Every day, Cade picks the same secret number for all players worldwide.
                  Guess it in {MAX_ATTEMPTS} attempts — the closer you get, the higher your score!
                </p>
                <button className="btn btn-primary" onClick={startGame} id="start-number-guess">
                  Start Guessing! 🦫
                </button>
              </div>
            )}

            {/* PLAYING */}
            {phase === 'playing' && (
              <div className={styles.playState}>
                {/* Attempt dots */}
                <div className={styles.attemptBar}>
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div
                      key={i}
                      className={`${styles.attemptDot} ${i < guesses.length ? styles.dotUsed : ''}`}
                    />
                  ))}
                  <span className={styles.attemptCount}>{attemptsLeft} left</span>
                </div>

                {/* Range visual */}
                <div className={styles.rangeBar}>
                  <span className={styles.rangeLabel}>1</span>
                  <div className={styles.rangeTrack}>
                    {guesses.map((g, i) => (
                      <div
                        key={i}
                        className={`${styles.guessMarker} ${styles[g.hint]}`}
                        style={{ left: `${((g.value - 1) / 99) * 100}%` }}
                        title={`${g.value}`}
                      />
                    ))}
                  </div>
                  <span className={styles.rangeLabel}>100</span>
                </div>

                {/* Guess history */}
                {guesses.length > 0 && (
                  <div className={styles.guessList}>
                    {guesses.map((g, i) => (
                      <div key={i} className={`${styles.guessRow} ${styles[g.hint]}`}>
                        <span className={styles.guessNum}>#{i + 1}</span>
                        <span className={styles.guessVal}>{g.value}</span>
                        <span className={styles.guessHint}>
                          {g.hint === 'too-low' && '⬆️ Too low'}
                          {g.hint === 'too-high' && '⬇️ Too high'}
                          {g.hint === 'correct' && '🎯 Correct!'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className={styles.inputRow}>
                  <input
                    id="guess-input"
                    type="number"
                    min={1}
                    max={100}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    className={styles.input}
                    placeholder="Enter your guess..."
                    autoFocus
                  />
                  <button
                    className="btn btn-primary"
                    onClick={submitGuess}
                    disabled={!input}
                    id="submit-guess"
                  >
                    Guess!
                  </button>
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
              </div>
            )}

            {/* RESULT */}
            {phase === 'result' && (
              <div className={styles.resultState}>
                {guesses[guesses.length - 1]?.hint === 'correct' ? (
                  <>
                    <div className={styles.resultEmoji}>🎯</div>
                    <h2 className={styles.resultTitle}>Bullseye!</h2>
                    <p className={styles.resultSub}>
                      The number was <strong>{secret}</strong>. You found it in{' '}
                      <strong>{guesses.length}</strong> attempt{guesses.length > 1 ? 's' : ''}!
                    </p>
                  </>
                ) : (
                  <>
                    <div className={styles.resultEmoji}>🦫</div>
                    <h2 className={styles.resultTitle}>Out of attempts!</h2>
                    <p className={styles.resultSub}>
                      The secret number was <strong>{secret}</strong>.
                      Come back tomorrow for a new one!
                    </p>
                  </>
                )}

                {/* Rewards */}
                <div className={styles.rewardBox}>
                  <div className={styles.rewardItem}>
                    <span className={styles.rewardVal}>{totalScore}</span>
                    <span className={styles.rewardLbl}>✨ Chill Points</span>
                  </div>
                  <div className={styles.rewardDivider} />
                  <div className={styles.rewardItem}>
                    <span className={styles.rewardVal}>{coinReward}</span>
                    <span className={styles.rewardLbl}>🌾 CADE Coin</span>
                  </div>
                </div>

                {/* Recap */}
                <div className={styles.guessList}>
                  {guesses.map((g, i) => (
                    <div key={i} className={`${styles.guessRow} ${styles[g.hint]}`}>
                      <span className={styles.guessNum}>#{i + 1}</span>
                      <span className={styles.guessVal}>{g.value}</span>
                      <span className={styles.guessHint}>
                        {g.hint === 'too-low' && '⬆️ Too low'}
                        {g.hint === 'too-high' && '⬇️ Too high'}
                        {g.hint === 'correct' && '🎯 Correct!'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.resultActions}>
                  <a href="/games" className="btn btn-primary">
                    More Quests 🎮
                  </a>
                  <a href="/leaderboard" className="btn btn-secondary">
                    🏆 Serenity Rankings
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* How to play */}
          {phase === 'idle' && (
            <div className={styles.howToPlay}>
              <h3 className={styles.howTitle}>How to Play</h3>
              <ol className={styles.howList}>
                <li>Enter a number between 1 and 100</li>
                <li>Cade hints whether his number is <em>higher</em> or <em>lower</em></li>
                <li>You have {MAX_ATTEMPTS} attempts — fewer guesses means a higher score!</li>
                <li>Today&apos;s number is the same for all players worldwide 🌍</li>
              </ol>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
