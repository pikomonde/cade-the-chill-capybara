.PHONY: build-and-deploy-contract-local run-chain-local run-frontend-local deploy-sepolia

# ========== local dev ==========
check-balance-eth-on-anvil:
	cast balance $$USER_WALLET_ADDRESS --rpc-url http://127.0.0.1:8545 --ether
check-balance-usdc-on-anvil:
	cd frontend && . ./.env && cast call $$VITE_USDC_ADDRESS_ANVIL "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url http://127.0.0.1:8545
build-and-deploy-contract-local:
	cd contracts && forge build

	@echo "Deploying MockUSDC to Anvil..."
	@cd contracts && OUT=$$(forge create src/MockUSDC.sol:MockUSDC --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast) && \
	MOCK_USDC=$$(echo "$$OUT" | awk '/Deployed to:/ {print $$3}') && \
	echo "✅ MockUSDC Deployed to: $$MOCK_USDC" && \

	echo "Deploying GameGuessNumber..." && \
	GAME_OUT=$$(forge create src/GameGuessNumber.sol:GameGuessNumber --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --constructor-args $$MOCK_USDC) && \
	GAME_ADDRESS=$$(echo "$$GAME_OUT" | awk '/Deployed to:/ {print $$3}') && \
	echo "✅ GameGuessNumber Deployed to: $$GAME_ADDRESS" && \

	echo "Updating frontend/.env automatically..." && \
	sed -i "s/^VITE_USDC_ADDRESS_ANVIL=.*/VITE_USDC_ADDRESS_ANVIL=$$MOCK_USDC/" ../frontend/.env && \
	sed -i "s/^VITE_CONTRACT_ADDRESS_ANVIL=.*/VITE_CONTRACT_ADDRESS_ANVIL=$$GAME_ADDRESS/" ../frontend/.env

	cp ./contracts/out/GameGuessNumber.sol/GameGuessNumber.json ./frontend/src/GameGuessNumberABI.json
airdrop-usdc-on-anvil:
	cd frontend && . ./.env && cast send $$VITE_USDC_ADDRESS_ANVIL "transfer(address,uint256)" $$USER_WALLET_ADDRESS 1000000000 --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
run-chain-local:
	anvil
run-frontend-local:
	cd frontend && npm run dev

# ========== sepolia testnet ==========
check-balance-eth-on-eth-sepolia:
	cast balance 0x684919C697394d11e444D86B110B21545Ed1B06D --rpc-url https://ethereum-sepolia-rpc.publicnode.com --ether
check-balance-eth-on-base-sepolia:
	cast balance 0x684919C697394d11e444D86B110B21545Ed1B06D --rpc-url https://sepolia.base.org --ether
# bridge-eth-from-eth-sepolia-to-base-sepolia:
# 	cast send 0xfd0Bf71F60660E2f608ed56e1659C450eB113120 "depositETH(uint32,bytes)" 200000 "0x" --value 0.001ether --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $$PRIVATE_KEY
deploy-sepolia:
	cd contracts && set -a && . ./.env && set +a && forge build && forge create src/GameGuessNumber.sol:GameGuessNumber --rpc-url $$BASE_SEPOLIA_RPC_URL --private-key $$PRIVATE_KEY --broadcast --constructor-args 0x036CbD53842c5426634e7929541eC2318f3dCF7e
