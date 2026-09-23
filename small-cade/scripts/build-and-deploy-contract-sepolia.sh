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

#================================ Deploying CadeToken ================================
echo "🚀 Deploying CadeToken to Base Sepolia..."
OUT=$(forge create src/CadeToken.sol:CadeToken --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast)

# Extract the deployed address using awk
CADE_TOKEN=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ CadeToken Deployed to: $CADE_TOKEN"

#================================ Deploying CadePoints ================================
echo "🚀 Deploying CadePoints to Base Sepolia..."
OUT=$(forge create src/CadePoints.sol:CadePoints --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast)

# Extract the deployed address using awk
CADE_POINTS=$(echo "$OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ CadePoints Deployed to: $CADE_POINTS"

#================================ Deploying GameGuessNumber ================================
echo ""
echo "🚀 Deploying GameGuessNumber to Base Sepolia..."
GAME_OUT=$(forge create src/GameGuessNumber.sol:GameGuessNumber \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x036CbD53842c5426634e7929541eC2318f3dCF7e $CADE_TOKEN $CADE_POINTS)

# Extract the deployed address using awk
GAME_ADDRESS=$(echo "$GAME_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ GameGuessNumber Deployed to: $GAME_ADDRESS"

#================================ Configure Permissions ================================
echo "🔐 Configuring Contract Permissions..."

# 1. Approve GameGuessNumber to spend Deployer's CadeTokens for cashback
echo "   Approving GameGuessNumber to spend CadeToken..."
cast send $CADE_TOKEN "approve(address,uint256)" $GAME_ADDRESS 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# 2. Authorize GameGuessNumber to mint CadePoints for prizes
echo "   Authorizing GameGuessNumber to mint CadePoints..."
cast send $CADE_POINTS "addGameContract(address)" $GAME_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

#================================ Update the .env file in the frontend directory ================================
echo ""
echo "📝 Updating frontend/.env automatically..."
sed -i "s/^VITE_CADE_TOKEN_ADDRESS_SEPOLIA=.*/VITE_CADE_TOKEN_ADDRESS_SEPOLIA=$CADE_TOKEN/" ../frontend/.env
sed -i "s/^VITE_CADE_POINTS_ADDRESS_SEPOLIA=.*/VITE_CADE_POINTS_ADDRESS_SEPOLIA=$CADE_POINTS/" ../frontend/.env
sed -i "s/^VITE_CONTRACT_ADDRESS_SEPOLIA=.*/VITE_CONTRACT_ADDRESS_SEPOLIA=$GAME_ADDRESS/" ../frontend/.env

#================================ Copying ABI ================================
echo "📂 Copying ABI..."
cp ./out/CadeToken.sol/CadeToken.json ../frontend/src/CadeTokenABI.json
cp ./out/CadePoints.sol/CadePoints.json ../frontend/src/CadePointsABI.json
cp ./out/GameGuessNumber.sol/GameGuessNumber.json ../frontend/src/GameGuessNumberABI.json

echo ""
echo "🎉 All done! Sepolia deployment complete!"
