#!/bin/bash
# Stop execution if any command fails
set -e

echo "🛠️  Building contracts..."
cd contracts
forge build

#================================ Deploying MockUSDC ================================
echo "🚀 Deploying MockUSDC to Anvil..."
OUT=$(forge create src/MockUSDC.sol:MockUSDC --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast)

# Extract the deployed address using awk
MOCK_USDC=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ MockUSDC Deployed to: $MOCK_USDC"

#================================ Deploying CadeToken ================================
echo "🚀 Deploying CadeToken to Anvil..."
OUT=$(forge create src/CadeToken.sol:CadeToken --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast)

# Extract the deployed address using awk
CADE_TOKEN=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ CadeToken Deployed to: $CADE_TOKEN"

#================================ Deploying CadePoints ================================
echo "🚀 Deploying CadePoints to Anvil..."
OUT=$(forge create src/CadePoints.sol:CadePoints --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast)

# Extract the deployed address using awk
CADE_POINTS=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ CadePoints Deployed to: $CADE_POINTS"

#================================ Deploying GameGuessNumber ================================
echo ""
echo "🚀 Deploying GameGuessNumber to Anvil..."
GAME_OUT=$(forge create src/GameGuessNumber.sol:GameGuessNumber \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast \
  --constructor-args $MOCK_USDC $CADE_TOKEN $CADE_POINTS)

# Extract the deployed address using awk
GAME_ADDRESS=$(echo "$GAME_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ GameGuessNumber Deployed to: $GAME_ADDRESS"

#================================ Configure Permissions ================================
echo "🔐 Configuring Contract Permissions..."

# 1. Approve GameGuessNumber to spend Deployer's CadeTokens for cashback
echo "   Approving GameGuessNumber to spend CadeToken..."
cast send $CADE_TOKEN "approve(address,uint256)" $GAME_ADDRESS 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 2. Authorize GameGuessNumber to mint CadePoints for prizes
echo "   Authorizing GameGuessNumber to mint CadePoints..."
cast send $CADE_POINTS "addGameContract(address)" $GAME_ADDRESS \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

#================================ Update the .env file in the frontend directory ================================
echo ""
echo "📝 Updating frontend/.env automatically..."
sed -i "s/^VITE_USDC_ADDRESS_ANVIL=.*/VITE_USDC_ADDRESS_ANVIL=$MOCK_USDC/" ../frontend/.env
sed -i "s/^VITE_CADE_TOKEN_ADDRESS_ANVIL=.*/VITE_CADE_TOKEN_ADDRESS_ANVIL=$CADE_TOKEN/" ../frontend/.env
sed -i "s/^VITE_CADE_POINTS_ADDRESS_ANVIL=.*/VITE_CADE_POINTS_ADDRESS_ANVIL=$CADE_POINTS/" ../frontend/.env
sed -i "s/^VITE_CONTRACT_ADDRESS_ANVIL=.*/VITE_CONTRACT_ADDRESS_ANVIL=$GAME_ADDRESS/" ../frontend/.env

#================================ Copying ABI ================================
echo "📂 Copying ABI..."
cp ./out/CadeToken.sol/CadeToken.json ../frontend/src/CadeTokenABI.json
cp ./out/CadePoints.sol/CadePoints.json ../frontend/src/CadePointsABI.json
cp ./out/GameGuessNumber.sol/GameGuessNumber.json ../frontend/src/GameGuessNumberABI.json

echo ""
echo "🎉 All done! Local deployment complete!"
