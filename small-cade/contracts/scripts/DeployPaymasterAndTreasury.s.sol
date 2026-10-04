// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Treasury} from "../src/Treasury.sol";
import {CustomWhitelistPaymaster} from "../src/Paymaster/CustomWhitelistPaymaster.sol";

// Interfaces for local mock setup
interface IERC20 {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

contract DeployPaymasterAndTreasury is Script {
    function run() external {
        // Load private key from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with address:", deployerAddress);

        // Define addresses (Base Sepolia / Local)
        // If testing locally, you might need to deploy Mock ERC20s and Mock EntryPoint first.
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0)); 
        address cadeAddress = vm.envOr("CADE_ADDRESS", address(0));
        address wethAddress = vm.envOr("WETH_ADDRESS", address(0));
        address entryPointAddress = vm.envOr("ENTRY_POINT_ADDRESS", address(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789));
        address personalWallet = vm.envOr("PERSONAL_WALLET", deployerAddress);
        // verifyingSigner is no longer needed since we use WhitelistPaymaster

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy CustomWhitelistPaymaster
        CustomWhitelistPaymaster paymaster = new CustomWhitelistPaymaster(entryPointAddress);
        console.log("CustomWhitelistPaymaster deployed at:", address(paymaster));

        // 2. Deploy Treasury
        Treasury treasury = new Treasury(
            usdcAddress,
            cadeAddress,
            wethAddress,
            entryPointAddress,
            personalWallet
        );
        console.log("Treasury deployed at:", address(treasury));

        // 3. Connect Treasury with Paymaster
        treasury.setPaymaster(address(paymaster));
        console.log("Linked Paymaster to Treasury");

        // Optional: If you already deployed Uniswap, set it here
        // treasury.setDex(0x...);

        vm.stopBroadcast();
        
        console.log("Deployment Complete!");
        console.log("-----------------------------------------");
        console.log("Next Steps:");
        console.log("1. Send 1 Trillion CADE to the Treasury contract.");
        console.log("2. Call setBankAccountAddress(Treasury) on GameGuessNumber.");
        console.log("3. Call setDex(UniswapRouter) on Treasury when ready.");
    }
}
