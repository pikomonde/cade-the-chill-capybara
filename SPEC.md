# CADE — Technical Specification

> Version: 1.0  
> Date: 2026-09-11  
> Network: Base L2 (Base Sepolia → Mainnet)  
> Status: Pre-development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Identity & Authentication](#4-identity--authentication)
5. [Smart Contracts](#5-smart-contracts)
6. [Tokenomics](#6-tokenomics)
7. [Subscription Model](#7-subscription-model)
8. [Game Mechanics](#8-game-mechanics)
9. [Game Verification](#9-game-verification)
10. [Leaderboard & Cohort System](#10-leaderboard--cohort-system)
11. [Badge System](#11-badge-system)
12. [Badge Marketplace](#12-badge-marketplace)
13. [Paymaster Strategy](#13-paymaster-strategy)
14. [Backend API](#14-backend-api)
15. [Frontend](#15-frontend)
16. [Distribution Plan](#16-distribution-plan)
17. [Infrastructure](#17-infrastructure)
18. [Roadmap](#18-roadmap)

---

## 1. Project Overview

**CADE** is a daily game dApp built on **Base L2** where players complete mini-games to earn on-chain rewards. The project is designed as a portfolio showcase with potential for organic viral growth.

### Core Loop
\`\`\`
Play daily games → Earn CADE Coin + CADE Point + Badges → Compete on leaderboard → Subscribe for on-chain settlement
\`\`\`

### Goals
- Build a fun, replayable daily game experience anchored in Web3 identity
- Experiment with ERC-4337 smart accounts for gasless UX
- Create a sustainable micro-economy with decaying points and subscription revenue
- Ship to Base Sepolia testnet as a portfolio project, mainnet if it gains traction

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Blockchain** | Base L2 | EVM-compatible, very low gas fees |
| **Smart Contracts** | Solidity + Foundry | Foundry for testing & deployment |
| **Smart Account** | Privy (web) | ERC-4337, Google login → smart wallet |
| **Paymaster** | ZeroDev | Sponsors gas for subscribers |
| **Backend** | Go (Fiber framework) | REST API, game logic, signing |
| **Database** | Supabase (PostgreSQL) | Identity mapping, game sessions, off-chain rewards |
| **Frontend** | Next.js (TypeScript) | PWA + Telegram Mini App |
| **Indexer** | The Graph | Leaderboard, marketplace discovery |
| **Scheduler** | Backend cron (Go) | Daily batch tx, weekly epoch settlement |
| **Storage** | IPFS via Pinata | Badge metadata |
| **Hosting (BE)** | Render (free tier) | + UptimeRobot to prevent cold start |
| **Hosting (FE)** | Vercel (free tier) | Next.js deployment |

---

## 3. System Architecture

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│                         Clients                               │
│                                                              │
│   Next.js PWA (Vercel)    │    Telegram Mini App             │
│   - Privy social login    │    - Telegram initData auth      │
│   - Google → SmartWallet  │    - Same smart wallet           │
└──────────────────┬─────────────────────────────┬─────────────┘
                   │ HTTPS/REST                  │ HTTPS/REST
┌──────────────────▼─────────────────────────────▼─────────────┐
│                  Go Backend (Render)                          │
│                                                              │
│  • Identity Service (multi-platform mapping)                 │
│  • Game Session Manager (commitment hash)                    │
│  • Move Verifier (replay & validate)                         │
│  • Reward Accumulator (batch end of day)                     │
│  • Cohort Engine (hyper-local leaderboard)                   │
│  • Telegram initData verifier                                │
│  • Result Signer (trusted signer key)                        │
│                                                              │
│  Supabase (PostgreSQL)                                       │
└──────────────────┬────────────────────────────────────────────┘
                   │ signed tx via ZeroDev Paymaster
┌──────────────────▼────────────────────────────────────────────┐
│              Smart Contracts (Base L2)                        │
│                                                              │
│  CADECoin.sol        CADEBadge.sol      GameReward.sol        │
│  (ERC-20)            (ERC-1155)         (verify + mint)       │
│                                                              │
│  Subscription.sol    BadgeMarket.sol                         │
│  (tier + expiry)     (listing + royalty)                     │
└──────────────────┬────────────────────────────────────────────┘
                   │
         Base L2 (Sepolia / Mainnet)
                   │
┌──────────────────▼────────────────────────────────────────────┐
│  The Graph subgraph (leaderboard, marketplace, badge history) │
└───────────────────────────────────────────────────────────────┘
\`\`\`

---

## 4. Identity & Authentication

### Multi-Platform Identity

Each user has **one canonical wallet address** regardless of which platform they use to log in.

\`\`\`sql
-- Supabase: user_identities table
CREATE TABLE user_identities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  TEXT UNIQUE NOT NULL,
    privy_did       TEXT UNIQUE,
    telegram_id     BIGINT UNIQUE,
    google_id       TEXT UNIQUE,
    farcaster_fid   INTEGER UNIQUE,    -- phase 2
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### Auth Flows

**Web (Google):**
\`\`\`
1. User clicks "Login with Google"
2. Privy handles OAuth → creates ERC-4337 smart wallet
3. Backend receives wallet_address + privy_did → upsert user_identities
4. Backend issues JWT (sub: wallet_address)
\`\`\`

**Telegram Mini App:**
\`\`\`
1. Telegram passes initData to Mini App
2. Frontend sends initData to backend
3. Backend verifies HMAC signature:
   hash = HMAC-SHA256(key=HMAC-SHA256("WebAppData", BOT_TOKEN), data=data_check_string)
4. Extract telegram_id → lookup/create user_identities
5. If new user: create deterministic smart wallet via ZeroDev
6. Backend issues JWT (sub: wallet_address)
\`\`\`

**Identity Linking:**
\`\`\`
1. User logged in on one platform (JWT issued)
2. User initiates link with credentials from other platform
3. Backend verifies second credential
4. Merge rows: update existing wallet_address with new platform ID
5. Merge pending_rewards if other platform had pending
\`\`\`

---

## 5. Smart Contracts

### 5.1 CADECoin.sol (ERC-20)
- No max supply at launch (controlled by reward contract)
- Only GameReward.sol can mint
- Standard ERC-20 transfer/approval

### 5.2 CADEBadge.sol (ERC-1155)
- tokenId = uint256(keccak256(abi.encodePacked(gameName, dateUTC)))
- Mintable only within the UTC calendar day
- firstOwner field stored permanently (survives transfers)

### 5.3 GameReward.sol
- Verifies backend-signed reward vouchers (ECDSA)
- Prevents replay attacks via nonce/used-signature mapping
- Mints CADE Coin and badges upon valid proof

### 5.4 Subscription.sol
- Mapping: address → { tier, expiry_timestamp }
- Not transferable
- Stackable: subscribing while active extends expiry

| Tier | Price | Duration |
|---|---|---|
| Free | — | — |
| Explorer | 1.5 USDC | 30 days |
| Adventurer | 8 USDC | 180 days |
| Legend | 15 USDC | 365 days |
| Eternal | 40 USDC | 3 years |

### 5.5 BadgeMarket.sol
- On-chain listing with CADE Coin pricing
- 5% royalty to treasury on every sale
- Listings discoverable via The Graph

---

## 6. Tokenomics

### CADE Coin (ERC-20)
- Mint authority: only GameReward.sol
- Distribution: off-chain accumulation → signed vouchers at end of day → pull-claim on-chain
- No hard cap at launch

### Reward Rates (per game, per day)

| Game | CADE Coin | CADE Point | Badge |
|---|---|---|---|
| Tebak Angka | 1–5 | 10–50 | No |
| Sudoku | 5–15 | 50–150 | Yes |
| Figrid | 5–15 | 50–150 | Yes |
| Klotski | 5–20 | 50–200 | Yes |
| Spelling Bee | 3–10 | 30–100 | Yes |
| 2048 | 2–10 | 20–100 | No |
| Memory Flip | 2–8 | 20–80 | No |

**Multipliers:** Free: 1x (off-chain only) | Explorer: 1x | Adventurer: 2x | Legend/Eternal: 3x

### CADE Point (Decaying Score)
- Stored off-chain in Supabase (efficient, no gas)
- Lazy decay: effective_point = raw_point * (0.99 ^ days_elapsed)
- No reset — naturally decays to ~0 if inactive (~460 days to <1%)
- Weekly epoch snapshot hash stored on-chain as tamper-proof record

---

## 7. Subscription Model

| Tier | Price | Duration | Key Features |
|---|---|---|---|
| **Free** | Free | — | 1 game/day, off-chain only, **no badge**, no on-chain settlement |
| **Explorer** | 1.5 USDC | 30 days | All games, on-chain claim, badges, leaderboard |
| **Adventurer** | 8 USDC | 180 days | + 2x CADE Coin multiplier |
| **Legend** | 15 USDC | 365 days | + 3x multiplier + exclusive badge |
| **Eternal** | 40 USDC | 3 years | + 3x + exclusive badge + "Founding Member" soulbound badge |

Storage: state on-chain (`mapping(address => struct{tier, expiry})`)

---

## 8. Game Mechanics

All games use a **daily seed**: `keccak256(gameName + dateUTC_string)`
Same seed = same puzzle for all players on the same day (fair leaderboard).

### MVP Games

**Tebak Angka**
- Guess 1–100, closest to secret number wins
- score = 100 - |guess - answer| (min 0)
- One attempt per day

**Sudoku**
- Standard 9×9, difficulty rotates daily
- score = base_score - (mistakes × 10) - (hints × 20)
- Moves submitted for verification

**Figrid (Number Crossword)**
- Crossword with number answers from math clues
- score = cells_filled × 10
- Ties broken by submission order

### Phase 2 Games
- Klotski (Unblock Puzzle): score = optimal_moves - actual_moves + 100
- Spelling Bee: word-length scoring + pangram bonus
- 2048: final board score
- Memory Card Flip: score = 1000 - (wrong_flips × 20)

---

## 9. Game Verification

### Commitment Scheme (Backend Signed Hash)

Prevents backend from changing the puzzle after seeing user moves.

\`\`\`
STEP 1 — Game Start:
  Client → POST /game/start
  Backend → returns { session_id, puzzle_data, commitment_hash }
  commitment_hash = hash(puzzle_data + wallet + timestamp + SERVER_SECRET)
  (stored in Supabase, proves puzzle was fixed before play)

STEP 2 — Play (client-side, offline-capable):
  User plays, moves tracked in browser memory

STEP 3 — Submit:
  Client → POST /game/submit { session_id, moves[], final_state }
  Backend:
    - Verify commitment
    - Replay moves, validate game logic
    - Calculate score
    - Subscribers: sign reward voucher (ECDSA)
    - Free users: accumulate in pending_rewards table
\`\`\`

One attempt per day enforced by UNIQUE(wallet, game_type, date_utc) in DB.

---

## 10. Leaderboard & Cohort System

### Hyper-Local Cohorts
- ~500 players per cohort (similar activity level)
- Players only see their own cohort's leaderboard → always feel competitive
- CADE Point decay applied lazily at query time

### Epoch (Weekly)
- Monday 00:00 UTC → Sunday 23:59 UTC
- End of epoch cron:
  - Top 10% per cohort → promoted
  - Bottom 10% → demoted
  - Top 3 per cohort → bonus CADE Coin vouchers
  - Snapshot hash stored on-chain

---

## 11. Badge System

- tokenId = keccak256(gameName + dateUTC)
- Mintable only within the UTC day
- firstOwner stored permanently (even after badge is sold)
- Only subscribers can earn badges
- Special badges: Daily Completionist, 7-Day Streak, Founding Member (soulbound), First 100

---

## 12. Badge Marketplace

- On-chain listing → badge held in BadgeMarket.sol escrow
- Payment in CADE Coin only
- 5% royalty to treasury on every sale
- Discovery via The Graph subgraph
- Simple fixed-price listings (no auction MVP)

---

## 13. Paymaster Strategy

### Free Users: Zero On-Chain Activity
- All rewards accumulate in Supabase (off-chain)
- Displayed as "unclaimed" → conversion funnel to subscribe
- "You have 47 CADE Coin waiting — subscribe to claim!"

### Subscribers: Daily Batched Transactions
- Backend cron at 23:55 UTC signs vouchers for all subscribers
- Users pull-claim at their convenience

### Revenue Loop
\`\`\`
Subscription fees (USDC) → GameVault → ZeroDev Paymaster → sponsor subscriber gas
Badge royalties (5% CADE Coin) → treasury
\`\`\`

### Circuit Breaker
- Backend monitors paymaster balance
- Below threshold: prioritize Eternal > Legend > Adventurer > Explorer

---

## 14. Backend API (Go / Fiber)

\`\`\`
POST /auth/telegram         — verify initData, issue JWT
POST /auth/web              — verify Privy token, issue JWT
POST /auth/link             — link platform to existing wallet
GET  /auth/me               — current user identity

POST /game/start            — begin session, get puzzle + commitment
POST /game/submit           — submit moves, get score + voucher
GET  /game/today            — available games + completion status
GET  /game/history          — user game history

GET  /leaderboard/cohort    — user's cohort leaderboard
GET  /leaderboard/global    — global top 100 (all-time CADE Coin)

GET  /rewards/pending       — pending off-chain rewards
GET  /rewards/voucher       — signed claim voucher (subscribers only)

GET  /subscription/status   — current tier + expiry

GET  /badges/today          — today's mintable badges
GET  /badges/my             — user's badges

GET  /health                — health check (for UptimeRobot)
\`\`\`

---

## 15. Frontend

### Tech
- Next.js 14+ (App Router, TypeScript)
- Vanilla CSS + CSS Variables
- Privy SDK (web auth), Telegram WebApp SDK (mini app)
- Viem for contract interactions

### Routes
\`\`\`
/                   — Landing / game selection
/game/tebak-angka   — Tebak Angka
/game/sudoku        — Sudoku
/game/figrid        — Figrid
/leaderboard        — Cohort leaderboard
/profile            — Pending rewards, badges, identity
/subscribe          — Subscription page
/marketplace        — Badge marketplace
\`\`\`

### Design
- Dark mode primary
- Accent: electric blue (#00D4FF), neon green (#00FF88)
- Glassmorphism cards, smooth micro-animations
- Mobile-first, Telegram Mini App adaptive

---

## 16. Distribution Plan

| Priority | Platform | Phase |
|---|---|---|
| 🔴 | Telegram Mini App | MVP |
| 🔴 | Web App (PWA, Vercel) | MVP |
| 🟡 | Farcaster Frame | Phase 2 |
| 🟡 | Guild.xyz Quest (Telegram community) | Phase 2 |
| 🟡 | Zealy / Layer3 | Phase 2 |
| 🟢 | Base Discord (#projects submission) | Phase 3 |
| 🟢 | OnchainSummer | Phase 3 |

---

## 17. Infrastructure

### Testnet (All Free)
| Service | Plan | Cost |
|---|---|---|
| Render (Go backend) | Free | $0 |
| Vercel (Next.js) | Hobby | $0 |
| Supabase | Free | $0 |
| ZeroDev Paymaster | Free testnet | $0 |
| Privy | Free <1000 MAU | $0 |
| The Graph | Free hosted | $0 |
| Pinata (IPFS) | Free 1GB | $0 |
| UptimeRobot | Free | $0 |

**Total: $0/month on testnet**

Render cold start fix: UptimeRobot pings GET /health every 10 minutes.

### Mainnet Cost Estimate
| Item | Cost |
|---|---|
| Deploy 5 contracts to Base mainnet | ~$10–50 |
| Initial paymaster fund | ~$20–50 |
| Liquidity pool (skip for now) | $100–5000+ |

---

## 18. Roadmap

### Phase 0 — Docs & Setup (Week 1–2)
- [x] Technical specification
- [ ] Initialize monorepo
- [ ] Setup Foundry, Go, Next.js

### Phase 1 — MVP (Week 3–10)
- [ ] 5 smart contracts + tests + Base Sepolia deploy
- [ ] Go backend: identity, game session, verification, reward batch
- [ ] 3 games: Tebak Angka, Sudoku, Figrid
- [ ] Telegram Mini App + PWA

### Phase 2 — Expansion (Week 11–16)
- [ ] 4 more games
- [ ] Full cohort leaderboard engine
- [ ] Badge marketplace UI
- [ ] Farcaster Frame
- [ ] Guild.xyz + Zealy quests

### Phase 3 — Mainnet Prep (Week 17–20)
- [ ] Peer review smart contracts
- [ ] Load testing
- [ ] Mainnet deploy (if 100+ DAU on testnet for 2 weeks)
- [ ] Airdrop snapshot planning

### Mainnet Benchmarks
\`\`\`
✅ 100+ Daily Active Users on testnet (2 consecutive weeks)
✅ Zero critical bugs for 14 days
✅ Smart contracts peer-reviewed by 2+ developers
✅ Subscription revenue ≥ estimated gas costs
✅ At least 3 games stable
\`\`\`
