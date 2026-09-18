# Cade the Chill Capybara — Smart Contracts

Foundry project for all on-chain contracts.

## Contracts

| Contract | Description |
|---|---|
| `CADECoin.sol` | ERC-20 — the golden seeds Cade collects |
| `CADEBadge.sol` | ERC-1155 — Meadow Badges (date-stamped, soulbound support) |
| `GameReward.sol` | Verifies backend-signed vouchers, mints rewards |
| `Subscription.sol` | Meadow Pass — 5 tiers, USDC payment, stackable |
| `BadgeMarket.sol` | Meadow Market — CADE Coin marketplace, 5% royalty |

## Setup

```bash
# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts

# Build
forge build

# Test
forge test -vvv

# Deploy to Base Sepolia
cp .env.example .env
# fill in your values in .env
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
PRIVATE_KEY=         # deployer wallet private key
TRUSTED_SIGNER=      # backend signing wallet address (public key only needed here)
USDC_ADDRESS=        # USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
BADGE_BASE_URI=      # e.g. ipfs://QmYourHash/
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=    # from basescan.org
```
