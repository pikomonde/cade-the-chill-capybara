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

#================================ Deploying GameGuessNumber ================================
echo ""
echo "🚀 Deploying GameGuessNumber to Base Sepolia..."
GAME_OUT=$(forge create src/GameGuessNumber.sol:GameGuessNumber \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x036CbD53842c5426634e7929541eC2318f3dCF7e)

# Extract the deployed address using awk
GAME_ADDRESS=$(echo "$GAME_OUT" | awk '/Deployed to:/ {print $3}')
echo "✅ GameGuessNumber Deployed to: $GAME_ADDRESS"

# Update the .env file in the frontend directory
echo ""
echo "📝 Updating frontend/.env automatically..."
sed -i "s/^VITE_CONTRACT_ADDRESS_SEPOLIA=.*/VITE_CONTRACT_ADDRESS_SEPOLIA=$GAME_ADDRESS/" ../frontend/.env

#================================ Copying ABI ================================
echo "📂 Copying ABI..."
cp ./out/GameGuessNumber.sol/GameGuessNumber.json ../frontend/src/GameGuessNumberABI.json

echo ""
echo "🎉 All done! Sepolia deployment complete!"
