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
# privy tester smart wallet: 0xb77fBF1e7EA84Be0EfaeF85AaB7B8d0895517993
check-balance-eth-on-eth-sepolia:
	cast balance $$USER_WALLET_ADDRESS --rpc-url https://ethereum-sepolia-rpc.publicnode.com --ether
check-balance-eth-on-base-sepolia:
	cast balance $$USER_WALLET_ADDRESS --rpc-url https://sepolia.base.org --ether
check-balance-usdc-on-base-sepolia:
	cd frontend && . ./.env && \
	cast call $$VITE_USDC_ADDRESS_SEPOLIA "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url https://sepolia.base.org
check-balance-cade-token-on-base-sepolia:
	cd frontend && . ./.env && \
	cast call $$VITE_CADE_TOKEN_ADDRESS_SEPOLIA "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url https://sepolia.base.org
# transfer-usdc-on-base-sepolia:
# 	cd frontend && . ./.env && \
# 	cast send $$VITE_USDC_ADDRESS_SEPOLIA "transfer(address,uint256)(bool)" $$USER_RECEIVER_WALLET_ADDRESS $$AMOUNT --rpc-url https://sepolia.base.org --private-key $$PRIVATE_KEY_SENDER
# transfer-cade-token-on-base-sepolia:
# 	cd frontend && . ./.env && \
# 	cast send $$VITE_CADE_TOKEN_ADDRESS_SEPOLIA "transfer(address,uint256)(bool)" $$USER_RECEIVER_WALLET_ADDRESS $$AMOUNT --rpc-url https://sepolia.base.org --private-key $$PRIVATE_KEY_SENDER
# bridge-eth-from-eth-sepolia-to-base-sepolia:
# 	cast send 0xfd0Bf71F60660E2f608ed56e1659C450eB113120 "depositETH(uint32,bytes)" 200000 "0x" --value 0.001ether --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $$PRIVATE_KEY
build-and-deploy-contract-sepolia:
	bash scripts/build-and-deploy-contract-sepolia.sh
activate-dex-sepolia:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_SEPOLIA "setDex(address)" $$VITE_UNISWAP_ROUTER_SEPOLIA --rpc-url https://sepolia.base.org --private-key $$PRIVATE_KEY && sleep 3 && \
	cast send $$VITE_TREASURY_ADDRESS_SEPOLIA "setPercentages(uint256,uint256,uint256)" 40 60 0 --rpc-url https://sepolia.base.org --private-key $$PRIVATE_KEY
activate-dex-swap-cade-sepolia:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_SEPOLIA "setPercentages(uint256,uint256,uint256)" 40 40 20 --rpc-url https://sepolia.base.org --private-key $$PRIVATE_KEY

# ========== mainnet ==========
# metamask deployer wallet: 0x4e2A196347BEFdE6B0b10760a764A8Ce5ff6478f
# privy tester wallet: 0xb68Cc176E710E18C6a0BcdC8Ed68A1b5cD12B0e5
# privy tester smart wallet: 0xb77fBF1e7EA84Be0EfaeF85AaB7B8d0895517993
check-balance-eth-on-eth-mainnet:
	cast balance $$USER_WALLET_ADDRESS --rpc-url https://ethereum-rpc.publicnode.com --ether
check-balance-eth-on-base-mainnet:
	cast balance $$USER_WALLET_ADDRESS --rpc-url https://mainnet.base.org --ether
check-balance-usdc-on-base-mainnet:
	cd frontend && . ./.env && \
	cast call $$VITE_USDC_ADDRESS_MAINNET "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url https://mainnet.base.org
check-balance-cade-token-on-base-mainnet:
	cd frontend && . ./.env && \
	cast call $$VITE_CADE_TOKEN_ADDRESS_MAINNET "balanceOf(address)(uint256)" $$USER_WALLET_ADDRESS --rpc-url https://mainnet.base.org
transfer-usdc-on-base-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_USDC_ADDRESS_MAINNET "transfer(address,uint256)(bool)" $$USER_RECEIVER_WALLET_ADDRESS $$AMOUNT --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
transfer-cade-token-on-base-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_CADE_TOKEN_ADDRESS_MAINNET "transfer(address,uint256)(bool)" $$USER_RECEIVER_WALLET_ADDRESS $$AMOUNT --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
# bridge-eth-from-eth-mainnet-to-base-mainnet:
# 	cast send 0xfd0Bf71F60660E2f608ed56e1659C450eB113120 "depositETH(uint32,bytes)" 200000 "0x" --value 0.001ether --rpc-url https://ethereum-rpc.publicnode.com --private-key $$PRIVATE_KEY
withdraw-usdc-from-treasury:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "emergencyWithdrawToken(address,uint256)" $$VITE_USDC_ADDRESS_MAINNET $$AMOUNT --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
withdraw-cade-token-from-treasury:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "emergencyWithdrawToken(address,uint256)" $$VITE_CADE_TOKEN_ADDRESS_MAINNET $$AMOUNT --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
build-and-deploy-contract-mainnet:
	bash scripts/build-and-deploy-contract-mainnet.sh
activate-dex-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "setDex(address)" $$VITE_UNISWAP_ROUTER_MAINNET --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY && sleep 3 && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "setPercentages(uint256,uint256,uint256)" 40 60 0 --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
activate-dex-swap-cade-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "setPercentages(uint256,uint256,uint256)" 40 40 20 --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
check-treasury-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	echo "DEX Router:" && cast call $$VITE_TREASURY_ADDRESS_MAINNET "dexRouterAddress()(address)" --rpc-url https://mainnet.base.org && \
	echo "Paymaster in Treasury:" && cast call $$VITE_TREASURY_ADDRESS_MAINNET "paymasterAddress()(address)" --rpc-url https://mainnet.base.org && \
	echo "Need Replenish Now?:" && cast call $$VITE_TREASURY_ADDRESS_MAINNET "isNeedReplenishGasNow()(bool)" --rpc-url https://mainnet.base.org && \
	echo "Replenish Interval (secs):" && cast call $$VITE_TREASURY_ADDRESS_MAINNET "replenishGasInterval()(uint256)" --rpc-url https://mainnet.base.org && \
	echo "Replenish Reward (wei):" && cast call $$VITE_TREASURY_ADDRESS_MAINNET "getReplenishReward()(uint256)" --rpc-url https://mainnet.base.org && \
	echo "ETH Balance in EntryPoint:" && cast call $$VITE_ENTRYPOINT_ADDRESS_MAINNET "balanceOf(address)(uint256)" $$VITE_PAYMASTER_ADDRESS_MAINNET --rpc-url https://mainnet.base.org && \
	echo "USDC Balance in Treasury:" && cast call $$VITE_USDC_ADDRESS_MAINNET "balanceOf(address)(uint256)" $$VITE_TREASURY_ADDRESS_MAINNET --rpc-url https://mainnet.base.org
set-replenish-interval-1min-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "setReplenishGasInterval(uint256)" 1 --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
set-replenish-interval-1day-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "setReplenishGasInterval(uint256)" 1440 --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
replenish-gas-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	cast send $$VITE_TREASURY_ADDRESS_MAINNET "replenishGas()" --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
check-paymaster-deposit-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	echo "Paymaster ETH Deposit in EntryPoint:" && \
	cast call $$VITE_ENTRYPOINT_ADDRESS_MAINNET "balanceOf(address)(uint256)" $$VITE_PAYMASTER_ADDRESS_MAINNET --rpc-url https://mainnet.base.org
check-deployer-usdc-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	DEPLOYER=$$(cast wallet address --private-key $$PRIVATE_KEY) && \
	echo "Deployer ($$DEPLOYER) USDC Balance:" && \
	cast call $$VITE_USDC_ADDRESS_MAINNET "balanceOf(address)(uint256)" $$DEPLOYER --rpc-url https://mainnet.base.org
withdraw-paymaster-deposit-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	DEPLOYER=$$(cast wallet address --private-key $$PRIVATE_KEY) && \
	DEPOSIT=$$(cast call $$VITE_PAYMASTER_ADDRESS_MAINNET "getDeposit()(uint256)" --rpc-url https://mainnet.base.org | awk '{print $$1}') && \
	echo "Withdrawing $$DEPOSIT wei from EntryPoint to Deployer ($$DEPLOYER)..." && \
	cast send $$VITE_PAYMASTER_ADDRESS_MAINNET "withdrawTo(address,uint256)" $$DEPLOYER "$$DEPOSIT" --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
# deploy-treasury-mainnet:
# 	bash scripts/deploy-treasury-mainnet.sh
deposit-paymaster-mainnet:
	. contracts/.env && cd frontend && . ./.env && \
	echo "Depositing 0.0001 ETH to EntryPoint for Paymaster ($$VITE_PAYMASTER_ADDRESS_MAINNET)..." && \
	cast send $$VITE_ENTRYPOINT_ADDRESS_MAINNET "depositTo(address)" $$VITE_PAYMASTER_ADDRESS_MAINNET --value 0.0001ether --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
# fund-treasury-cade-mainnet:
# 	. contracts/.env && cd frontend && . ./.env && \
# 	echo "Transferring 1 Trillion CADE to Treasury ($$VITE_TREASURY_ADDRESS_MAINNET)..." && \
# 	cast send $$VITE_CADE_TOKEN_ADDRESS_MAINNET "transfer(address,uint256)" $$VITE_TREASURY_ADDRESS_MAINNET 1000000000000000000000000000000 --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
# fund-treasury-usdc-mainnet:
# 	. contracts/.env && cd frontend && . ./.env && \
# 	echo "Transferring 0.5 USDC to Treasury ($$VITE_TREASURY_ADDRESS_MAINNET) for Uniswap replenish testing..." && \
# 	cast send $$VITE_USDC_ADDRESS_MAINNET "transfer(address,uint256)" $$VITE_TREASURY_ADDRESS_MAINNET 500000 --rpc-url https://mainnet.base.org --private-key $$PRIVATE_KEY
