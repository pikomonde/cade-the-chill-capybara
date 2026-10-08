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

## 2. The Evolution of Gas & DEX Logic

The ecosystem's economy is designed to evolve in phases. The Treasury contract manages the flow of USDC (from gameplay) and converts it into ETH (for gas) and CADE (for player cashback buybacks).

### Economic Phases

| Phase | Architecture State | Gas Payment Mechanism | DEX Interaction |
| :--- | :--- | :--- | :--- |
| **Phase 1** | No Paymaster / Local | Player's EOA wallet pays ETH for gas. | None. |
| **Phase 2** | Paymaster + Treasury (DEX Partial) | Paymaster sponsors gas. Treasury converts `USDC -> WETH -> ETH` via DEX to refill Paymaster. | `USDC -> WETH` only. *(CADE buyback disabled via percentages)*. |
| **Phase 3** | Full Ecosystem | Paymaster sponsors gas. Treasury converts USDC to ETH (for gas) and USDC to CADE (for cashback). | `USDC -> WETH` AND `USDC -> CADE`. |

> **💡 AI Developer Note (How DEX logic is triggered)**: 
> In `Treasury.sol`, the function `replenishGas()` will completely revert if `dexRouterAddress == address(0)`.
> 
> To enable DEX operations, you MUST call:
> `cast send <TREASURY> "setDex(address)" <UNISWAP_ROUTER>`
>
> If you want to run **Phase 2** (Skip CADE buyback but keep USDC->ETH), set the percentages so buyback is `0`: 
> `cast send <TREASURY> "setPercentages(uint256,uint256,uint256)" 60 40 0`
> 
> If you want to run **Phase 3** (Enable CADE buyback), configure normal splits (e.g., 40% Gas, 40% Profit, 20% Buyback):
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
3. **Configure Splits**: Ensure Treasury percentages are set correctly (e.g., `setPercentages(60, 40, 0)` if CADE LP is not ready).
4. Anyone can now call `replenishGas()` on the Treasury!
