# Cade the Chill Capybara 🦫 — Technical Specification

> Version: 1.1
> Date: 2026-09-11
> Network: Base L2 (Base Sepolia → Mainnet)
> Status: In Development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Theme & Branding](#2-theme--branding)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Identity & Authentication](#5-identity--authentication)
6. [Smart Contracts](#6-smart-contracts)
7. [Tokenomics](#7-tokenomics)
8. [Subscription Model](#8-subscription-model)
9. [Game Mechanics](#9-game-mechanics)
10. [Game Verification](#10-game-verification)
11. [Leaderboard & Cohort System](#11-leaderboard--cohort-system)
12. [Badge System](#12-badge-system)
13. [Badge Marketplace](#13-badge-marketplace)
14. [Paymaster Strategy](#14-paymaster-strategy)
15. [Backend API](#15-backend-api)
16. [Frontend](#16-frontend)
17. [Distribution Plan](#17-distribution-plan)
18. [Infrastructure](#18-infrastructure)
19. [Roadmap](#19-roadmap)

---

## 1. Project Overview

**Cade the Chill Capybara** is a daily game dApp built on **Base L2**. Players step into the world of Cade — the most relaxed capybara in the blockchain — and complete daily mini-games to earn on-chain rewards. The project is designed as a portfolio showcase with potential for organic viral growth.

### Core Loop
```
Play daily games as Cade → Earn CADE Coin + CADE Point + Badges → Compete on leaderboard → Subscribe for on-chain settlement
```

### Goals
- Build a fun, replayable daily game experience anchored in Web3 identity
- Experiment with ERC-4337 smart accounts for gasless UX
- Create a sustainable micro-economy with decaying points and subscription revenue
- Ship to Base Sepolia testnet as a portfolio project; go mainnet if it gains traction

---

## 2. Theme & Branding

### The Universe of Cade
Cade is a perpetually chill capybara who lives in the CADE Meadows — a tranquil blockchain paradise. Every day, Cade wanders through different "zones" of the meadow and faces puzzles left behind by the mischievous **Puzzle Piranhas** 🐟 (the antagonists who try to steal Cade's peace). Players help Cade solve these puzzles to reclaim tranquility and earn rewards.

### Characters
| Character | Role | Description |
|---|---|---|
| **Cade** 🦫 | Protagonist | The main capybara. Always relaxed, never stressed. |
| **Puzzle Piranhas** 🐟 | Antagonists | Scatter puzzles across the meadow each day |
| **Capybara Companions** 🦫🦫 | Supporting | Other capybaras on the leaderboard (other players) |
| **The Wise Tortoise** 🐢 | Guide/Tutorial | Explains game mechanics to new players |

### Naming Conventions
| Game Term | Capybara Theme Name |
|---|---|
| CADE Coin | **CADE Coin** 🪙 (the golden seeds Cade collects) |
| CADE Point | **Chill Points** ✨ (Cade's vibe score — meluruh kalau Cade kurang main) |
| Badge | **Meadow Badge** 🏅 (achievement stamps from each zone) |
| Leaderboard | **Serenity Rankings** 🏆 |
| Cohort | **Herd** 🦫 (your group of capybara companions) |
| Subscription | **Meadow Pass** 🎫 |
| Free Tier | **Wanderer** (exploring the meadow casually) |
| Explorer Tier | **Settler** (Cade sets up camp in the meadow) |
| Adventurer | **Adventurer** (Cade explores deeper zones) |
| Legend | **Guardian** (Cade protects the meadow) |
| Eternal | **Ancient Capybara** (legendary founding member) |
| Daily Games | **Daily Chill Quests** |
| Game Session | **Quest Session** |

### Visual Style
- **Primary palette**: Warm earthy tones (terracotta, sage green, warm cream)
- **Accent**: Soft gold (#F4C430), meadow blue (#5BBCFF), gentle coral (#FF7F6B)
- **Dark mode**: Deep swamp green (#0D1F1A) background
- **Typography**: Rounded, friendly fonts (e.g., Nunito, Fredoka One for headings)
- **Illustrations**: Flat 2D pixel-art or soft cartoon capybara assets
- **Animations**: Slow, floaty, relaxed — everything moves at "capybara speed" (no rush!)
- **Sound**: Optional lo-fi chill music, soft "bloop" sound effects

### Taglines
- *"Play chill. Earn real."*
- *"The most relaxed game on the blockchain."*
- *"Cade never rushes. Neither should you."*

---

## 3. Tech Stack

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

## 4. System Architecture

```
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
│  • Herd Engine (hyper-local leaderboard cohort)              │
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
│  (Meadow Pass tier)  (CADE Coin marketplace)                 │
└──────────────────┬────────────────────────────────────────────┘
                   │
         Base L2 (Sepolia / Mainnet)
                   │
┌──────────────────▼────────────────────────────────────────────┐
│  The Graph subgraph (Serenity Rankings, marketplace, badges)  │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Identity & Authentication

### Multi-Platform Identity

Each user has **one canonical wallet address** regardless of which platform they log in from.

```sql
-- Supabase: user_identities table
CREATE TABLE user_identities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  TEXT UNIQUE NOT NULL,
    privy_did       TEXT UNIQUE,
    telegram_id     BIGINT UNIQUE,
    google_id       TEXT UNIQUE,
    farcaster_fid   INTEGER UNIQUE,    -- phase 2
    display_name    TEXT,              -- user's chosen capybara name
    capybara_color  TEXT DEFAULT 'brown', -- customizable capybara color
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Auth Flows

**Web (Google):**
```
1. User clicks "Play as Cade" (Google login via Privy)
2. Privy handles OAuth → creates ERC-4337 smart wallet
3. Backend receives wallet_address + privy_did → upsert user_identities
4. Backend issues JWT (sub: wallet_address)
```

**Telegram Mini App:**
```
1. Telegram passes initData to Mini App
2. Frontend sends initData to backend
3. Backend verifies HMAC signature:
   hash = HMAC-SHA256(key=HMAC-SHA256("WebAppData", BOT_TOKEN), data=data_check_string)
4. Extract telegram_id → lookup/create user_identities
5. If new user: create deterministic smart wallet via ZeroDev
6. Backend issues JWT (sub: wallet_address)
```

**Identity Linking:**
```
1. User logged in on one platform (JWT issued)
2. User initiates link → provides credentials from other platform
3. Backend verifies second credential
4. Merge rows: update existing wallet_address with new platform ID
5. Merge pending_rewards if other platform had pending coins
```

---

## 6. Smart Contracts

All contracts deployed on **Base Sepolia** (testnet) and later **Base Mainnet**.

### 6.1 CADECoin.sol (ERC-20)
- **Symbol**: CADE
- **Name**: CADE Coin
- No max supply at launch (controlled by GameReward.sol)
- Only `GameReward.sol` can mint
- Standard ERC-20 transfer/approval/burn

### 6.2 CADEBadge.sol (ERC-1155) — "Meadow Badges"
- tokenId = `uint256(keccak256(abi.encodePacked(gameName, dateUTC)))`
- Mintable only within the UTC calendar day of the puzzle
- `firstOwner` mapping stored permanently (survives transfers)
- Metadata stored on IPFS (Pinata)

### 6.3 GameReward.sol
- Verifies backend ECDSA-signed reward vouchers
- Prevents replay attacks via nonce/used-signature mapping
- Mints CADE Coin and Meadow Badges upon valid proof
- Emits events indexed by The Graph

### 6.4 Subscription.sol — "Meadow Pass"
- Mapping: `address → { tier, expiry_timestamp }`
- Not transferable, not sellable
- Stackable: subscribing while active extends expiry
- Payment in USDC (6 decimals)

| Tier | Lore Name | Price | Duration |
|---|---|---|---|
| 0 — Free | Wanderer | — | — |
| 1 — Explorer | Settler | 1.5 USDC | 30 days |
| 2 — Adventurer | Adventurer | 8 USDC | 180 days |
| 3 — Legend | Guardian | 15 USDC | 365 days |
| 4 — Eternal | Ancient Capybara | 40 USDC | 3 years |

### 6.5 BadgeMarket.sol — "Meadow Market"
- On-chain listing with CADE Coin pricing
- 5% royalty to treasury (GameVault) on every sale
- Badge held in escrow by contract during listing
- Listings discoverable via The Graph

---

## 7. Tokenomics

### CADE Coin 🪙
- **Mint authority**: Only `GameReward.sol`
- **Distribution**: Off-chain accumulation → backend issues signed vouchers at end of day → users pull-claim on-chain
- **No hard cap at launch** (can be added via governance later)
- **Utility**: Badge Marketplace currency; future trading on mainnet

### Reward Rates (per game, per day)

| Game (Quest) | CADE Coin | Chill Points | Meadow Badge |
|---|---|---|---|
| Tebak Angka | 1–5 | 10–50 | ❌ |
| Sudoku | 5–15 | 50–150 | ✅ |
| Figrid | 5–15 | 50–150 | ✅ |
| Klotski | 5–20 | 50–200 | ✅ |
| Spelling Bee | 3–10 | 30–100 | ✅ |
| 2048 | 2–10 | 20–100 | ❌ |
| Memory Flip | 2–8 | 20–80 | ❌ |

**Meadow Pass Multipliers:**
- Wanderer (Free): 1x — coins pending off-chain only
- Settler (Explorer): 1x — on-chain settlement unlocked
- Adventurer: 2x CADE Coin
- Guardian (Legend) / Ancient Capybara (Eternal): 3x CADE Coin

### Chill Points ✨ (Decaying Score)
- Stored **off-chain** in Supabase (no gas needed for decay)
- Lazy decay: `effective_points = raw_points × (0.99 ^ days_since_last_update)`
- No manual reset — naturally decays to ~0 if Cade stops playing (~460 days to <1%)
- Weekly epoch snapshot hash stored on-chain as tamper-proof record

---

## 8. Subscription Model — "Meadow Pass"

| Tier | Lore Name | Price | Duration | Key Features |
|---|---|---|---|---|
| **Free** | Wanderer 🚶 | Free | — | 1 quest/day, Chill Points off-chain, **no Meadow Badge**, no on-chain settlement |
| **Explorer** | Settler 🏕️ | 1.5 USDC | 30 days | All quests, on-chain claim, Meadow Badges, Serenity Rankings |
| **Adventurer** | Adventurer 🗺️ | 8 USDC | 180 days | + 2× CADE Coin multiplier |
| **Legend** | Guardian 🛡️ | 15 USDC | 365 days | + 3× multiplier + exclusive badge |
| **Eternal** | Ancient Capybara 🦫✨ | 40 USDC | 3 years | + 3× + exclusive badge + "Founding Capybara" soulbound badge |

Storage: state on-chain `mapping(address => struct{tier, expiry})`.
Not transferable. Subscribing while active extends expiry.

---

## 9. Game Mechanics

### Daily Seed System
All quests use a daily seed derived from:
```go
seed = keccak256(gameName + dateUTC_string)
// e.g. keccak256("sudoku" + "2026-09-11") → same puzzle for every player today
```
This ensures fairness: all players in the same Herd play identical puzzles.

### MVP Quests (Phase 1)

#### 🎲 Tebak Angka — "Cade's Lucky Number"
- *Lore: Cade found a mysterious number carved on a tree. Guess what it is!*
- Guess 1–100, closest to the secret number wins
- `score = 100 - |guess - answer|` (min 0)
- One attempt per day

#### 🔢 Sudoku — "The Piranha's Grid Trap"
- *Lore: A Puzzle Piranha scrambled Cade's number grid. Help sort it out!*
- Standard 9×9 Sudoku, difficulty rotates daily
- `score = base_score - (mistakes × 10) - (hints × 20)`
- base_score: 1000 (Easy) → 4000 (Expert)

#### 🔡 Figrid — "The Number Crossword"
- *Lore: Piranhas scattered number clues all over the meadow crossword!*
- Crossword where answers are numbers derived from math clues
- `score = cells_correctly_filled × 10`
- Ties broken by submission time

### Phase 2 Quests

#### 🧩 Klotski — "Cade's Blocked Path"
- *Lore: Piranhas blocked Cade's path with big rocks. Slide them away!*
- Slide blocks to free the "Cade block" to the exit
- `score = optimal_moves - actual_moves + 100` (min 0)
- Auto-generated via BFS solver from daily seed

#### 🔤 Spelling Bee — "Cade's Word Garden"
- *Lore: Letters fell from the sky into Cade's garden. Make words!*
- Find words from 7 letters (1 center letter required)
- Word-length points + pangram bonus

#### 🃏 Memory Flip — "Cade's Hiding Spots"
- *Lore: Cade hid his seeds under tiles. Remember where!*
- Match card pairs from daily-seeded board
- `score = 1000 - (wrong_flips × 20)`

#### 🔢 2048 — "Cade's Seed Merger"
- *Lore: Merge Cade's golden seeds into bigger and bigger piles!*
- Standard 2048, initial board from daily seed
- Leaderboard by final score

---

## 10. Game Verification

### Commitment Scheme (Backend Signed Hash)
Proves the puzzle was fixed before the user started — backend cannot cheat by changing it.

```
STEP 1 — Quest Start:
  Client → POST /game/start { game_type, wallet_address }
  Backend:
    puzzle = generate(dailySeed(game_type, todayUTC))
    commitment = hash(puzzle + wallet + timestamp + SERVER_SECRET)
    store in game_sessions table
    return { session_id, puzzle_data, commitment }

STEP 2 — Play (client-side, offline-capable):
  All moves tracked in browser state — no network calls during play

STEP 3 — Quest Submit:
  Client → POST /game/submit { session_id, moves[], final_state }
  Backend:
    verify commitment matches stored value
    replay moves → validate game logic
    calculate score
    if subscriber: sign voucher = ECDSA.sign(wallet + score + session_id + nonce)
    if free: accumulate pending_coins in Supabase
    return { score, coins_earned, voucher? }
```

One attempt per day: `UNIQUE(wallet_address, game_type, date_utc)` in DB.

---

## 11. Leaderboard & Cohort System — "Serenity Rankings"

### Herd System (Hyper-Local Cohorts)
- ~500 capybaras per Herd (similar activity/skill level)
- Players only see their own Herd's rankings → always feel competitive
- Chill Points decay applied lazily at query time (no gas)

### Weekly Epoch
- Monday 00:00 UTC → Sunday 23:59 UTC
- End-of-epoch cron:
  - Top 10% per Herd → promoted to higher Herd
  - Bottom 10% → demoted
  - Top 3 per Herd → bonus CADE Coin vouchers
  - Snapshot hash stored on-chain

### Supabase Schema
```sql
CREATE TABLE herds (          -- cohorts
    id      UUID PRIMARY KEY,
    name    TEXT,             -- "Meadow Alpha", "Meadow Beta", etc.
    tier    INTEGER,          -- 1 (beginner) → N (elite)
    epoch   INTEGER
);

CREATE TABLE herd_members (
    wallet_address TEXT,
    herd_id        UUID REFERENCES herds(id),
    epoch          INTEGER,
    PRIMARY KEY (wallet_address, epoch)
);

CREATE TABLE chill_points (   -- CADE Points
    wallet_address TEXT,
    epoch          INTEGER,
    raw_points     NUMERIC DEFAULT 0,
    last_updated   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (wallet_address, epoch)
);
```

---

## 12. Badge System — "Meadow Badges"

- `tokenId = uint256(keccak256(abi.encodePacked(gameName, dateUTC)))`
- Mintable **only within the UTC day** of the quest
- `firstOwner` stored permanently (even if badge changes hands)
- Only **subscribers** (Settlers and above) can earn badges
- One badge per wallet per game per day

### Special Badges
| Badge | Condition | Transferable |
|---|---|---|
| Daily Completionist 🌟 | Complete all available quests in one day | ✅ |
| 7-Day Streak 🔥 | Complete any quest 7 days straight | ✅ |
| Founding Capybara 🦫✨ | Hold Ancient Capybara (Eternal) subscription | ❌ Soulbound |
| First 100 🏆 | First 100 wallets to register | ✅ |
| Piranha Slayer ⚔️ | Perfect score on any quest | ✅ |

### Badge Metadata (IPFS)
```json
{
  "name": "Sudoku Meadow Badge — 2026-09-11",
  "description": "Cade solved The Piranha's Grid Trap on September 11, 2026.",
  "image": "ipfs://Qm.../sudoku-badge-2026-09-11.png",
  "attributes": [
    { "trait_type": "Quest", "value": "Sudoku" },
    { "trait_type": "Date (UTC)", "value": "2026-09-11" },
    { "trait_type": "Season", "value": "Season 1" }
  ]
}
```

---

## 13. Badge Marketplace — "Meadow Market"

- Seller lists badge → transferred to `BadgeMarket.sol` escrow
- Buyer pays in CADE Coin only
- **5% royalty** to treasury (GameVault) on every sale
- Discovery via The Graph subgraph
- Simple fixed-price listings for MVP (no auction)

---

## 14. Paymaster Strategy

### Free (Wanderer) Users: Zero On-Chain Activity
All activity is off-chain (Supabase). Pending rewards displayed as:
> *"Cade has been collecting 47 CADE Coins for you... get a Meadow Pass to claim them!"* 🦫

This is the conversion funnel from free to paid.

### Subscribers: Daily Batched Transactions
- Backend cron at 23:55 UTC
- Signs reward vouchers for all subscribers
- Users pull-claim on-chain (or backend pushes for Eternal tier)

### Revenue Loop
```
Meadow Pass fees (USDC)
        ↓
GameVault.sol treasury
        ↓
Fund ZeroDev Paymaster
        ↓
Sponsor gas for subscriber txns

+ Meadow Market royalties (5% CADE Coin) → treasury
```

### Circuit Breaker (Go)
```go
const MIN_PAYMASTER_BALANCE_ETH = 0.005

// Priority order when balance is low:
// Ancient Capybara → Guardian → Adventurer → Settler
```

---

## 15. Backend API (Go / Fiber)

Base URL: `https://api.cade.app` (or `https://cade-api.onrender.com` for testnet)

All protected routes require `Authorization: Bearer <JWT>`.

```
POST /auth/telegram         — verify Telegram initData, issue JWT
POST /auth/web              — verify Privy token, issue JWT
POST /auth/link             — link another platform to existing wallet
GET  /auth/me               — current user + capybara profile

POST /game/start            — begin quest session (returns puzzle + commitment)
POST /game/submit           — submit moves (returns score + voucher if subscribed)
GET  /game/today            — today's available quests + completion status
GET  /game/history          — user's quest history

GET  /herd/leaderboard      — user's Herd Serenity Rankings (current epoch)
GET  /herd/history          — past epoch results
GET  /leaderboard/global    — global top 100 (all-time CADE Coin holders)

GET  /rewards/pending       — pending off-chain CADE Coins (all users)
GET  /rewards/voucher       — signed on-chain claim voucher (subscribers only)

GET  /pass/status           — current Meadow Pass tier + expiry

GET  /badges/today          — today's earnable Meadow Badges
GET  /badges/my             — user's Meadow Badge collection

GET  /health                — health check (200 OK, for UptimeRobot)
```

---

## 16. Frontend

### Tech
- Next.js 14+ (App Router, TypeScript)
- Vanilla CSS + CSS Variables (no Tailwind)
- Privy SDK (web), Telegram WebApp SDK (mini app)
- Viem for contract interactions

### Routes
```
/                     — Home / Daily Quest selection (Cade's Meadow map)
/quest/tebak-angka    — Tebak Angka quest
/quest/sudoku         — Sudoku quest
/quest/figrid         — Figrid quest
/herd                 — Herd Serenity Rankings
/profile              — Capybara profile: pending coins, badges, identity links
/pass                 — Meadow Pass subscription page
/market               — Meadow Market (badge marketplace)
```

### Design System
- **Background**: Deep swamp green `#0D1F1A` (dark mode)
- **Surface**: Warm dark `#132019`
- **Primary accent**: Soft gold `#F4C430`
- **Secondary accent**: Meadow blue `#5BBCFF`
- **Danger/Piranha**: Gentle coral `#FF7F6B`
- **Text**: Warm cream `#F5F0E8`
- **Font headings**: Fredoka One or Nunito (rounded, friendly)
- **Font body**: Nunito or Inter
- **Animations**: Slow, floaty transitions — "capybara speed" (300–600ms eases)
- **Cards**: Glassmorphism with warm tint
- **Capybara mascot**: Appears in corners, loading states, and rewards

### Telegram Mini App
- Same Next.js codebase, detects `window.Telegram.WebApp`
- Adjusts: bottom navigation bar, full-screen game, no sidebar
- Auth: sends `initData` to backend instead of Privy

---

## 17. Distribution Plan

| Priority | Platform | Phase | Notes |
|---|---|---|---|
| 🔴 MVP | Telegram Mini App | Phase 1 | Primary channel |
| 🔴 MVP | Web App (PWA) | Phase 1 | Vercel |
| 🟡 Phase 2 | Farcaster Frame | Phase 2 | Viral for crypto-native users |
| 🟡 Phase 2 | Guild.xyz Quest | Phase 2 | Telegram community quest |
| 🟡 Phase 2 | Zealy / Layer3 | Phase 2 | Crypto quest platforms |
| 🟢 Phase 3 | Base Discord | Phase 3 | Submit to #projects (not a Discord game) |
| 🟢 Phase 3 | OnchainSummer | Phase 3 | Base ecosystem events |

---

## 18. Infrastructure

### Testnet — All Free ($0/month)
| Service | Plan | Notes |
|---|---|---|
| Render (Go backend) | Free | Ping via UptimeRobot every 10 min to avoid cold start |
| Vercel (Next.js) | Hobby | Auto-deploy from GitHub |
| Supabase | Free | 500MB DB, 2GB bandwidth |
| ZeroDev Paymaster | Free testnet | No cost on Base Sepolia |
| Privy | Free <1000 MAU | |
| The Graph | Free hosted | |
| Pinata (IPFS) | Free 1GB | Badge metadata |
| UptimeRobot | Free | Keeps Render warm |

### Mainnet Cost Estimate
| Item | Estimated Cost |
|---|---|
| Deploy 5 contracts to Base mainnet | ~$10–50 |
| Initial paymaster fund | ~$20–50 |
| Liquidity pool | Skip for now (add if demand grows) |

---

## 19. Roadmap

### Phase 0 — Docs & Setup (Week 1–2)
- [x] Technical specification (this document)
- [x] Initialize monorepo (`contracts/`, `backend/`, `frontend/`)
- [ ] Foundry project setup
- [ ] Go module setup
- [ ] Next.js setup

### Phase 1 — MVP (Week 3–10)
- [ ] 5 smart contracts + Foundry tests
- [ ] Deploy to Base Sepolia
- [ ] Go backend: identity, game session, verification, reward batch, cron
- [ ] 3 MVP quests: Tebak Angka, Sudoku, Figrid
- [ ] Telegram Mini App + PWA (capybara theme)

### Phase 2 — Expansion (Week 11–16)
- [ ] 4 more quests (Klotski, Spelling Bee, 2048, Memory Flip)
- [ ] Full Herd cohort leaderboard engine
- [ ] Meadow Market UI
- [ ] Farcaster Frame
- [ ] Guild.xyz + Zealy quests

### Phase 3 — Mainnet Prep (Week 17–20)
- [ ] Smart contract peer review
- [ ] Load testing
- [ ] Mainnet deploy decision:
  - Benchmark: 100+ DAU on testnet for 2 consecutive weeks
- [ ] CADE Coin airdrop snapshot planning

### Mainnet Go/No-Go Benchmarks
```
✅ 100+ Daily Active Users on testnet (2 consecutive weeks)
✅ Zero critical bugs for 14 days
✅ Smart contracts peer-reviewed by ≥2 developers
✅ Subscription revenue ≥ estimated gas costs
✅ At least 3 quests stable and fun
```
