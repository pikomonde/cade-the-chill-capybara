.PHONY: build-and-deploy-contract-local run-chain-local run-frontend-local deploy-sepolia

# ========== local dev ==========
# privy tester wallet: 0xb68Cc176E710E18C6a0BcdC8Ed68A1b5cD12B0e5
check-balance-eth-on-anvil:
	cast balance $$USER_WALLET_ADDRESS --rpc-url http://127.0.0.1:8545 --ether
check-balance-usdc-on-anvil:
	cd frontend && . ./.env && \
	cast call $$VITE_USDC_ADDRESS_ANVIL "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url http://127.0.0.1:8545
build-and-deploy-contract-local:
	bash scripts/build-and-deploy-contract-local.sh
airdrop-eth-on-anvil:
	cast send $$USER_WALLET_ADDRESS --value 10ether --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
airdrop-usdc-on-anvil:
	cd frontend && . ./.env && \
	cast send $$VITE_USDC_ADDRESS_ANVIL "transfer(address,uint256)" $$USER_WALLET_ADDRESS 1000000000 --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
run-chain-local:
	anvil
run-frontend-local:
	cd frontend && npm run dev

# ========== sepolia testnet ==========
# metamask deployer wallet: 0x684919C697394d11e444D86B110B21545Ed1B06D
# privy tester wallet: 0xb68Cc176E710E18C6a0BcdC8Ed68A1b5cD12B0e5
check-balance-eth-on-eth-sepolia:
	cast balance $$USER_WALLET_ADDRESS --rpc-url https://ethereum-sepolia-rpc.publicnode.com --ether
check-balance-eth-on-base-sepolia:
	cast balance $$USER_WALLET_ADDRESS --rpc-url https://sepolia.base.org --ether
check-balance-usdc-on-base-sepolia:
	cd frontend && . ./.env && \
	cast call $$VITE_USDC_ADDRESS_SEPOLIA "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url https://sepolia.base.org
# bridge-eth-from-eth-sepolia-to-base-sepolia:
# 	cast send 0xfd0Bf71F60660E2f608ed56e1659C450eB113120 "depositETH(uint32,bytes)" 200000 "0x" --value 0.001ether --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $$PRIVATE_KEY
build-and-deploy-contract-sepolia:
	bash scripts/build-and-deploy-contract-sepolia.sh
