.PHONY: build-and-deploy-contract-local run-chain-local run-frontend-local

build-and-deploy-contract-local:
	cd contracts && forge build
	cd contracts && forge create src/WagerGame.sol:WagerGame --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast --constructor-args 0x0000000000000000000000000000000000000000
	cp ./contracts/out/WagerGame.sol/WagerGame.json ./frontend/src/WagerGameABI.json
run-chain-local:
	anvil
run-frontend-local:
	cd frontend && npm run dev
