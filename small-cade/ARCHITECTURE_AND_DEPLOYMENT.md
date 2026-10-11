# Cade The Chill Capybara - Architecture & Deployment Guide

This document serves as both a human-readable guide and an AI-parsable context file detailing the architecture, environment constraints, and deployment steps for the **Cade The Chill Capybara** ecosystem.

## 1. System Architecture by Environment

The project operates across three environments. Due to infrastructure limitations (Pimlico/ERC-4337 availability), the architecture adapts depending on the network.

| Feature | Local (Anvil) | Testnet (Base Sepolia) | Mainnet (Base) |
| :--- | :--- | :--- | :--- |
| **Auth** | Mock / Hardcoded | Privy (Email/Social) | Privy (Email/Social) |
| **Wallet** | Standard EOA | Smart Account (ERC-4337) | Smart Account (ERC-4337) |
| **Gas Sponsor**| None (User pays ETH) | CustomWhitelistPaymaster | CustomWhitelistPaymaster |
| **Bundler** | None | Pimlico | Pimlico |
| **Treasury** | Not Required | Active (Manages Gas/Profit) | Active (Manages Gas/Profit) |
| **DEX (Swap)** | Not Required | Uniswap V3 (Testnet) | Uniswap V3 |

### Local Environment Limitations
- **No Paymaster / Smart Accounts**: Pimlico does not officially support local Anvil nodes out-of-the-box easily without complex Docker setups.
- **Direct EOA**: In local development, the user's standard Externally Owned Account (EOA) interacts directly with the Game contract and pays its own gas in ETH.

---

## 2. Tokenomics & The Evolution of Gas/DEX Logic

The ecosystem's economy is designed to evolve in phases to protect developer capital and achieve self-sustainability through gameplay revenue.

### Token Supply Allocation (Total: 1,773,420,888 CADE)
- **1,000,000,000 CADE (~56.4%) ➔ Treasury Contract**: Dedicated purely as player cashback reserves for the game.
- **500,000,000 CADE (~28.2%) ➔ Initial DEX Liquidity Pool Reserve**: Held by Deployer until Phase 3 pool activation (paired with $50k USDC).
- **250,000,000 CADE (~14.1%) ➔ CEX Listings & Market Making (MM) Reserve**: Dedicated inventory for centralized exchange orderbook depth.
- **23,420,888 CADE (~1.3%) ➔ Community Airdrops, Quests, & Team Reserve**: Miscellaneous buffer.

---

### Economic Phases & Rollout Strategy

| Phase | Architecture State | Treasury Splits (Gas / Profit / Buyback) | DEX / Liquidity Pool Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Local / Initial Dev | N/A | None. |
| **Phase 2** | Game Live (Zero-Risk Bootstrap) | **40% Gas / 60% Profit / 0% Buyback** | **NO CADE POOL YET.** Players accumulate CADE cashback as on-chain prestige/vibe. Treasury collects 100% of game USDC entry fees. |
| **Phase 3** | Full DEX Ecosystem | **40% Gas / 40% Profit / 20% Buyback** | **Uniswap V3 Pool Active** (500M CADE + $50k USDC). Treasury auto-buys CADE via `replenishGas()`. |

### 🚀 Phase 3 Activation Threshold ($150,000 USDC Milestone)
To prevent personal capital loss ("boncos"), the initial DEX liquidity pool is **NOT** funded from personal savings. Instead, it is funded organically from gameplay revenue:

1. **Revenue Accumulation in Phase 2**: The game runs with splits configured to `40% Gas, 60% Profit, 0% Buyback`.
2. **The $150k Profit Target**: Developer profit accumulates until net profits reach **$150,000 USDC** in `personalWallet`.
3. **Seeding the Pool**: Exactly **$50,000 USDC** (representing 1/3 of the 60% accumulated profit, or 20% of total revenue) is paired with the reserved **500,000,000 CADE** to deploy the primary Uniswap V3 Pool:
   - **Initial Pair**: 500,000,000 CADE + $50,000 USDC.
   - **Initial Price**: **$0.0001 per CADE** ($50,000 / 500,000,000).
   - **Initial Market Cap (FDV)**: **~$177,342 USD**.
   - **Total Pool TVL**: **$100,000 USD** ($50k USDC + $50k CADE).
   - **Cashback Valuation**: 100 CADE cashback = **$0.01 USDC** (10% rebate on the 0.1 USDC entry fee).
4. **Transition to 40/40/20**: Once the pool is live on Uniswap, call:
   ```bash
   cast send <TREASURY> "setPercentages(uint256,uint256,uint256)" 40 40 20
   ```
   Now, 20% of all future gameplay fees directly buy back CADE from the market!

> **💡 AI Developer Note (How DEX logic is triggered)**: 
> In `Treasury.sol`, the function `replenishGas()` will completely revert if `dexRouterAddress == address(0)`.
> 
> To enable DEX operations, you MUST call:
> `cast send <TREASURY> "setDex(address)" <UNISWAP_ROUTER>`
>
> If you want to run **Phase 2** (Keep 60% profit, 0% buyback): 
> `cast send <TREASURY> "setPercentages(uint256,uint256,uint256)" 40 60 0`
> 
> If you want to run **Phase 3** (Enable CADE buyback after $75k milestone):
> `cast send <TREASURY> "setPercentages(uint256,uint256,uint256)" 40 40 20`

---

## 3. How to Register a New Game

Whenever a new game contract is added to the ecosystem, it must be properly registered across several core contracts to function seamlessly with gas abstraction and the Treasury.

### Required Registration Steps for a New Game:
1. **Paymaster Whitelist**: The Game must be whitelisted in the Paymaster so players don't pay gas fees.
   ```bash
   cast send <PAYMASTER> "addWhitelistedContract(address)" <NEW_GAME_ADDRESS>
   ```
2. **CadePoints Minting Authority**: The Game must be authorized to mint CadePoints for prizes.
   ```bash
   cast send <CADE_POINTS> "addGameContract(address)" <NEW_GAME_ADDRESS>
   ```
3. **Treasury Cashback Allowance**: The Treasury must approve the Game to pull CADE tokens for player cashbacks.
   ```bash
   cast send <TREASURY> "approveGame(address)" <NEW_GAME_ADDRESS>
   ```
4. **Game Bank Account**: Tell the Game contract that the Treasury is its bank.
   ```bash
   cast send <NEW_GAME_ADDRESS> "setBankAccountAddress(address)" <TREASURY>
   ```

### Deprecating or Removing a Game
If a game is no longer active, you should revoke its allowance to pull CADE tokens from the Treasury:
```bash
cast send <TREASURY> "revokeGame(address)" <OLD_GAME_ADDRESS>
```
You should also remove it from the Paymaster whitelist if desired.

---

## 4. Step-by-Step Deployment Guide

### Prerequisites
- Foundry (`forge`, `cast`, `anvil`) installed.
- Valid `.env` file in the `contracts/` and `frontend/` directories.
- Deployer wallet funded with ETH on the target network.

### A. Local (Anvil) Deployment
1. Start the local chain:
   ```bash
   make run-chain-local
   ```
2. Open a new terminal and deploy the contracts:
   ```bash
   make build-and-deploy-contract-local
   ```
3. Airdrop mock USDC and ETH to your tester wallet:
   ```bash
   make airdrop-eth-on-anvil
   make airdrop-usdc-on-anvil
   ```
4. Run the frontend:
   ```bash
   make run-frontend-local
   ```

### B. Testnet (Base Sepolia) Deployment
1. Ensure the deployer wallet (`PRIVATE_KEY`) has Base Sepolia ETH.
2. Run the automated deployment script:
   ```bash
   make build-and-deploy-contract-sepolia
   ```
3. **Fund the Treasury**: Transfer a portion of CADE (e.g., 90% of supply) to the newly deployed Treasury address. Keep the rest in the deployer wallet for Uniswap Liquidity Pools.
4. **Fund the Paymaster**: The Treasury needs initial ETH to deposit into the EntryPoint for the Paymaster before it can run `replenishGas` for the first time. You can deposit 0.01 ETH directly to the Paymaster via:
   ```bash
   cast send <PAYMASTER_ADDRESS> "deposit()" --value 0.01ether --rpc-url https://sepolia.base.org --private-key <PRIVATE_KEY>
   ```

### C. Activating the DEX (Uniswap V3)
When ready to activate Phase 2 or Phase 3:
1. **Create Pools**: Go to Uniswap V3 and ensure pools exist for `USDC/WETH` (usually exists) and `USDC/CADE` (you must create this).
2. **Activate Router**: Point the Treasury to the Uniswap V3 SwapRouter02:
   ```bash
   cast send <TREASURY_ADDRESS> "setDex(address)" 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4 --rpc-url <RPC> --private-key <PRIVATE_KEY>
   ```
3. **Configure Splits**: Ensure Treasury percentages are set correctly (e.g., `setPercentages(40, 60, 0)` if CADE LP is not ready).
4. Anyone can now call `replenishGas()` on the Treasury!

---

## 5. CEX (Centralized Exchange) Expansion Roadmap & Requirements

When the project scales beyond Uniswap DEX and targets Centralized Exchanges (e.g., MEXC, Gate.io, Bitget, KuCoin, Bybit), the operational model shifts from Automated Market Maker (AMM) pools to centralized Order Books.

### What is Required for a CEX Listing?

Unlike Uniswap where anyone can deposit tokens into a pool permissionlessly, CEX listings require:
1. **Exchange Listing Agreement & Fees**:
   - **Tier 3 / Tier 2 (MEXC, CoinEx, Bitget, Gate.io)**: 
     - Listing fee typically ranges from **$10,000 to $40,000 USDT** (or free if organic DEX trading volume and holder count are exceptionally high).
     - Security deposit / marketing budget: **$5,000 – $10,000 USDT** for airdrops/trading competitions.
   - **Tier 1 (Bybit, OKX, Binance, Coinbase)**:
     - Zero listing fee for genuine community tokens, but strictly requires sustained multi-million dollar daily volume and massive active user bases.
2. **Order Book Liquidity & Market Maker (MM)**:
   - CEXs do not run AMM pools. They use central limit order books (CLOB) where buyers and sellers meet.
   - To prevent an empty orderbook, extreme spread, or instant price crashing, projects must partner with a **Market Maker (MM)** (e.g., Kairon Labs, CLS, or self-managed MM bot).
   - **CADE Token Deposit for MM**: Around **5% – 10% of total supply (~90,000,000 – 177,000,000 CADE)** loaned/deposited to the MM account to place sell orders above market price.
   - **USDT / USDC Capital for MM**: **$20,000 – $50,000 USDT/USDC** placed on the exchange to maintain buy orders (bid depth) and support market liquidity.
3. **Prerequisites Before Applying to CEXs**:
   - **DEX Daily Volume**: Minimum **$100,000 – $300,000 / day** sustained on Uniswap.
   - **Holder Count**: At least **2,000 – 5,000+ active on-chain holders** on Base.
   - **Social Activity**: Active engagement on Telegram, X/Twitter, and Farcaster.
   - **Audited Contracts**: Verified and audited smart contracts on BaseScan.

### Summary: CEX Capital & Token Budgeting
- **Token Budget**: **250,000,000 CADE** (Dedicated CEX & Market Making Reserve).
- **Cash Capital Required**: $30,000 – $60,000 USDT/USDC (funded from accumulated game profits).
- **Rule of Thumb**: **Never rush to CEX.** A strong, viral meme game with deep Uniswap liquidity on Base will naturally attract CEX listing managers for free or heavily discounted rates.
