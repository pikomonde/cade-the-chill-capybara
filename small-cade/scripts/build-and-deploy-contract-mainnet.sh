#!/bin/bash
# Stop execution if any command fails
set -e

echo "🛠️  Building contracts..."
cd contracts

# Load environment variables securely
set -a
source .env
set +a

forge build

USDC_ADDRESS="${VITE_USDC_ADDRESS_MAINNET:-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913}"
WETH_ADDRESS="${VITE_WETH_ADDRESS_MAINNET:-0x4200000000000000000000000000000000000006}"
PERSONAL_WALLET=$(cast wallet address --private-key $PRIVATE_KEY)

#================================ Deploying CadeToken ================================
echo "🚀 Deploying CadeToken to Base Mainnet..."
OUT=$(forge create src/CadeToken.sol:CadeToken --rpc-url $BASE_MAINNET_RPC_URL --private-key $PRIVATE_KEY --broadcast)

# Extract the deployed address using awk
CADE_TOKEN=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ CadeToken Deployed to: $CADE_TOKEN"

#================================ Deploying CadePoints ================================
echo "⏳ Waiting 3s for RPC nonce sync..."
sleep 3
echo "🚀 Deploying CadePoints to Base Mainnet..."
OUT=$(forge create src/CadePoints.sol:CadePoints --rpc-url $BASE_MAINNET_RPC_URL --private-key $PRIVATE_KEY --broadcast)

# Extract the deployed address using awk
CADE_POINTS=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ CadePoints Deployed to: $CADE_POINTS"

#================================ Deploying GameGuessNumber ================================
echo ""
echo "⏳ Waiting 3s for RPC nonce sync..."; sleep 3
echo "🚀 Deploying GameGuessNumber to Base Mainnet..."
GAME_OUT=$(forge create src/GameGuessNumber.sol:GameGuessNumber \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args $USDC_ADDRESS $CADE_TOKEN $CADE_POINTS)

# Extract the deployed address using awk
GAME_ADDRESS=$(echo "$GAME_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ GameGuessNumber Deployed to: $GAME_ADDRESS"

#================================ Configure Permissions ================================
echo "🔐 Configuring Game Permissions..."

# 1. Approve GameGuessNumber to spend Deployer's CadeTokens for cashback
echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Approving GameGuessNumber to spend CadeToken..."
cast send $CADE_TOKEN "approve(address,uint256)" $GAME_ADDRESS 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

# 2. Authorize GameGuessNumber to mint CadePoints for prizes
echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Authorizing GameGuessNumber to mint CadePoints..."
cast send $CADE_POINTS "addGameContract(address)" $GAME_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

#================================ Deploying CustomWhitelistPaymaster ================================
# Paymster only used in Mainnet and Mainnet, not in local
echo ""
echo "⏳ Waiting 3s for RPC nonce sync..."; sleep 3
echo "🚀 Deploying CustomWhitelistPaymaster to Base Mainnet..."
ENTRY_POINT="${ENTRY_POINT_ADDRESS:-0x0000000071727De22E5E9d8BAf0edAc6f37da032}"
PAYMASTER_OUT=$(forge create src/Paymaster/CustomWhitelistPaymaster.sol:CustomWhitelistPaymaster \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args $ENTRY_POINT)

PAYMASTER_ADDRESS=$(echo "$PAYMASTER_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ Paymaster Deployed to: $PAYMASTER_ADDRESS"

#================================ Deploying Treasury ================================
# Treasury only used in Mainnet and Mainnet, not in local (in local, it will simply use deployer's address by default)
echo ""
echo "⏳ Waiting 3s for RPC nonce sync..."; sleep 3
echo "🚀 Deploying Treasury to Base Mainnet..."

TREASURY_OUT=$(forge create src/Treasury.sol:Treasury \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args $USDC_ADDRESS $CADE_TOKEN $WETH_ADDRESS $ENTRY_POINT $PERSONAL_WALLET)

TREASURY_ADDRESS=$(echo "$TREASURY_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ Treasury Deployed to: $TREASURY_ADDRESS"

#================================ Configure Treasury & Paymaster ================================
echo ""
echo "🔐 Configuring Treasury and Paymaster Permissions..."

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Linking Paymaster to Treasury..."
cast send $TREASURY_ADDRESS "setPaymaster(address)" $PAYMASTER_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Whitelisting CadeToken in Paymaster..."
cast send $PAYMASTER_ADDRESS "addWhitelistedContract(address)" $CADE_TOKEN \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Whitelisting USDC in Paymaster..."
cast send $PAYMASTER_ADDRESS "addWhitelistedContract(address)" $USDC_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Whitelisting Treasury in Paymaster..."
cast send $PAYMASTER_ADDRESS "addWhitelistedContract(address)" $TREASURY_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Whitelisting Game in Paymaster..."
cast send $PAYMASTER_ADDRESS "addWhitelistedContract(address)" $GAME_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Setting Game Bank Account to Treasury..."
cast send $GAME_ADDRESS "setBankAccountAddress(address)" $TREASURY_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

echo "   Waiting 3s for RPC sync..."; sleep 3
echo "   Approving Game in Treasury..."
cast send $TREASURY_ADDRESS "approveGame(address)" $GAME_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY

#================================ Update the .env file in the frontend directory ================================
echo ""
echo "📝 Updating frontend/.env automatically..."
sed -i "s/^VITE_CADE_TOKEN_ADDRESS_MAINNET=.*/VITE_CADE_TOKEN_ADDRESS_MAINNET=$CADE_TOKEN/" ../frontend/.env
sed -i "s/^VITE_CADE_POINTS_ADDRESS_MAINNET=.*/VITE_CADE_POINTS_ADDRESS_MAINNET=$CADE_POINTS/" ../frontend/.env
sed -i "s/^VITE_GAME_GUESS_NUMBER_ADDRESS_MAINNET=.*/VITE_GAME_GUESS_NUMBER_ADDRESS_MAINNET=$GAME_ADDRESS/" ../frontend/.env
sed -i "s/^VITE_PAYMASTER_ADDRESS_MAINNET=.*/VITE_PAYMASTER_ADDRESS_MAINNET=$PAYMASTER_ADDRESS/" ../frontend/.env
sed -i "s/^VITE_TREASURY_ADDRESS_MAINNET=.*/VITE_TREASURY_ADDRESS_MAINNET=$TREASURY_ADDRESS/" ../frontend/.env

#================================ Copying ABI ================================
echo "📂 Copying ABI..."
cp ./out/CadeToken.sol/CadeToken.json ../frontend/src/CadeTokenABI.json
cp ./out/CadePoints.sol/CadePoints.json ../frontend/src/CadePointsABI.json
cp ./out/GameGuessNumber.sol/GameGuessNumber.json ../frontend/src/GameGuessNumberABI.json
cp ./out/Treasury.sol/Treasury.json ../frontend/src/TreasuryABI.json
cp ./out/CustomWhitelistPaymaster.sol/CustomWhitelistPaymaster.json ../frontend/src/PaymasterABI.json

echo ""
echo "🎉 All done! Mainnet deployment complete!"
