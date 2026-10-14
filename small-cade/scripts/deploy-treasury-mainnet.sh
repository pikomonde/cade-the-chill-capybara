#!/bin/bash
# Stop execution if any command fails
set -e

echo "🛠️  Entering contracts directory..."
cd "$(dirname "$0")/../contracts"

echo "📋 Loading environment variables..."
set -a
source .env
source ../frontend/.env
set +a

echo "🛠️  Building Treasury contract with SwapRouter02 fix..."
forge build

RPC_URL="${BASE_MAINNET_RPC_URL:-https://mainnet.base.org}"
USDC_ADDRESS="${VITE_USDC_ADDRESS_MAINNET:-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913}"
WETH_ADDRESS="${VITE_WETH_ADDRESS_MAINNET:-0x4200000000000000000000000000000000000006}"
ENTRY_POINT="${VITE_ENTRYPOINT_ADDRESS_MAINNET:-0x0000000071727De22E5E9d8BAf0edAc6f37da032}"
DEX_ROUTER="${VITE_UNISWAP_ROUTER_MAINNET:-0x2626664c2603336E57B271c5C0b26F421741e481}"
CADE_TOKEN="${VITE_CADE_TOKEN_ADDRESS_MAINNET:-0x66943d0D35B8A2178D1df7d1Eb55eaEe3B5396Fe}"
GAME_ADDRESS="${VITE_GAME_GUESS_NUMBER_ADDRESS_MAINNET:-0x08D1125FfE48d390D7176BB92fF8dFC934854B28}"
PAYMASTER_ADDRESS="${VITE_PAYMASTER_ADDRESS_MAINNET:-0x5e7e7112eFb99c7f7d6fB7E79e4342b9218A4FD3}"
PERSONAL_WALLET=$(cast wallet address --private-key "$PRIVATE_KEY")

echo "=========================================="
echo "🚀 Deploying New Treasury to Base Mainnet"
echo "Deployer:  $PERSONAL_WALLET"
echo "USDC:      $USDC_ADDRESS"
echo "CADE:      $CADE_TOKEN"
echo "Game:      $GAME_ADDRESS"
echo "Paymaster: $PAYMASTER_ADDRESS"
echo "Router:    $DEX_ROUTER"
echo "=========================================="

TREASURY_OUT=$(forge create src/Treasury.sol:Treasury \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --constructor-args "$USDC_ADDRESS" "$CADE_TOKEN" "$WETH_ADDRESS" "$ENTRY_POINT" "$PERSONAL_WALLET")

NEW_TREASURY=$(echo "$TREASURY_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ New Treasury Deployed to: $NEW_TREASURY"

echo "⏳ Waiting 4s for RPC nonce sync..."
sleep 4

echo "🔗 Wiring Permissions for New Treasury..."

# 1. Set Paymaster in Treasury
echo "1/7 Linking Paymaster..."
cast send "$NEW_TREASURY" "setPaymaster(address)" "$PAYMASTER_ADDRESS" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

# 2. Set Uniswap DEX Router (SwapRouter02)
echo "2/7 Setting Uniswap SwapRouter02..."
cast send "$NEW_TREASURY" "setDex(address)" "$DEX_ROUTER" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

# 3. Set Split Percentages: 40% Gas, 60% Profit, 0% Buyback
echo "3/7 Setting Splits (40% Gas, 60% Profit, 0% Buyback)..."
cast send "$NEW_TREASURY" "setPercentages(uint256,uint256,uint256)" 40 60 0 --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

# 4. Set Uniswap Pool Fee for USDC/WETH (500 = 0.05%)
echo "4/7 Setting USDC/WETH Pool Fee to 500 (0.05%)..."
cast send "$NEW_TREASURY" "setPoolFees(uint24,uint24)" 500 0 --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

# 5. Approve Game to pull CADE tokens from New Treasury for cashback
echo "5/7 Approving Game to pull CADE cashback..."
cast send "$NEW_TREASURY" "approveGame(address)" "$GAME_ADDRESS" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

# 6. Update Game contract to send USDC fees to New Treasury
echo "6/7 Pointing Game bankAccountAddress to New Treasury..."
cast send "$GAME_ADDRESS" "setBankAccountAddress(address)" "$NEW_TREASURY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

# 7. Whitelist New Treasury in Paymaster so replenishGas() can be called gaslessly
echo "7/7 Whitelisting New Treasury in Paymaster..."
cast send "$PAYMASTER_ADDRESS" "addWhitelistedContract(address)" "$NEW_TREASURY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
sleep 3

echo "📝 Updating frontend/.env with new Treasury address..."
sed -i "s/VITE_TREASURY_ADDRESS_MAINNET=.*/VITE_TREASURY_ADDRESS_MAINNET=$NEW_TREASURY/" ../frontend/.env

echo "📦 Copying latest Treasury ABI to frontend..."
cp out/Treasury.sol/Treasury.json ../frontend/src/TreasuryABI.json

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "New Treasury Address: $NEW_TREASURY"
echo ""
echo "👉 NEXT STEPS:"
echo "1. Transfer CADE supply to the new Treasury so players get cashback:"
echo "   cast send $CADE_TOKEN \"transfer(address,uint256)\" $NEW_TREASURY 1000000000000000000000000000 --rpc-url $RPC_URL --private-key \$PRIVATE_KEY"
echo "2. Transfer 0.5 - 1 USDC into Treasury to test replenishGas with Uniswap:"
echo "   cast send $USDC_ADDRESS \"transfer(address,uint256)\" $NEW_TREASURY 1000000 --rpc-url $RPC_URL --private-key \$PRIVATE_KEY"
echo "3. Test replenishGas via Uniswap:"
echo "   make set-replenish-interval-1min-mainnet"
echo "   make replenish-gas-mainnet"
echo "=========================================================="
