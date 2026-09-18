.PHONY: build-and-deploy-contract-local run-chain-local run-frontend-local deploy-sepolia

build-and-deploy-contract-local:
	cd contracts && forge build
	cd contracts && forge create src/WagerGame.sol:WagerGame --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --constructor-args 0x0000000000000000000000000000000000000000
	cp ./contracts/out/WagerGame.sol/WagerGame.json ./frontend/src/WagerGameABI.json
run-chain-local:
	anvil
run-frontend-local:
	cd frontend && npm run dev

# bridge-eth-from-eth-sepolia-to-base-sepolia:
# 	cast send 0xfd0Bf71F60660E2f608ed56e1659C450eB113120 "depositETH(uint32,bytes)" 200000 "0x" --value 0.001ether --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $$PRIVATE_KEY
deploy-sepolia:
	cd contracts && set -a && . ./.env && set +a && forge build && forge create src/WagerGame.sol:WagerGame --rpc-url $$BASE_SEPOLIA_RPC_URL --private-key $$PRIVATE_KEY --broadcast --constructor-args 0x036CbD53842c5426634e7929541eC2318f3dCF7e
