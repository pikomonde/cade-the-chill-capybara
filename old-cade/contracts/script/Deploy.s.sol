// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CADECoin} from "../src/CADECoin.sol";
import {CADEBadge} from "../src/CADEBadge.sol";
import {GameReward} from "../src/GameReward.sol";
import {Subscription} from "../src/Subscription.sol";
import {BadgeMarket} from "../src/BadgeMarket.sol";

/// @notice Deploys all Cade the Chill Capybara contracts.
/// @dev Run:
///   forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
///
/// Required env vars:
///   PRIVATE_KEY         — deployer/owner private key
///   TRUSTED_SIGNER      — backend signing wallet address
///   USDC_ADDRESS        — USDC contract on target chain
///   BADGE_BASE_URI      — IPFS base URI for badge metadata (e.g. "ipfs://Qm.../")
contract Deploy is Script {
    function run() external {
        uint256 deployerKey   = vm.envUint("PRIVATE_KEY");
        address deployerAddr  = vm.addr(deployerKey);
        address trustedSigner = vm.envAddress("TRUSTED_SIGNER");
        address usdcAddr      = vm.envAddress("USDC_ADDRESS");
        string  memory baseURI = vm.envString("BADGE_BASE_URI");

        console.log("Deploying Cade the Chill Capybara contracts...");
        console.log("Deployer:      ", deployerAddr);
        console.log("Trusted Signer:", trustedSigner);

        vm.startBroadcast(deployerKey);

        // 1. Deploy CADECoin
        CADECoin cadeCoin = new CADECoin(deployerAddr);
        console.log("CADECoin:     ", address(cadeCoin));

        // 2. Deploy CADEBadge
        CADEBadge cadeBadge = new CADEBadge(deployerAddr, baseURI);
        console.log("CADEBadge:    ", address(cadeBadge));

        // 3. Deploy GameReward (treasury = deployer for now, update to GameVault later)
        GameReward gameReward = new GameReward(
            deployerAddr,
            address(cadeCoin),
            address(cadeBadge),
            trustedSigner
        );
        console.log("GameReward:   ", address(gameReward));

        // 4. Deploy Subscription (treasury = deployer for now)
        Subscription subscription = new Subscription(
            deployerAddr,
            usdcAddr,
            deployerAddr // treasury — update to multisig/GameVault later
        );
        console.log("Subscription: ", address(subscription));

        // 5. Deploy BadgeMarket (treasury = deployer for now)
        BadgeMarket badgeMarket = new BadgeMarket(
            deployerAddr,
            address(cadeBadge),
            address(cadeCoin),
            deployerAddr // treasury — update later
        );
        console.log("BadgeMarket:  ", address(badgeMarket));

        // ── Wire up permissions ──────────────────────────────
        // Allow GameReward to mint CADECoin
        cadeCoin.setGameRewardContract(address(gameReward));

        // Allow GameReward to mint CADEBadge
        cadeBadge.setGameRewardContract(address(gameReward));

        // Allow BadgeMarket to transfer badges (setApprovalForAll done by users individually)

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("CADECoin:     ", address(cadeCoin));
        console.log("CADEBadge:    ", address(cadeBadge));
        console.log("GameReward:   ", address(gameReward));
        console.log("Subscription: ", address(subscription));
        console.log("BadgeMarket:  ", address(badgeMarket));
        console.log("\nSave these addresses in .env and backend config!");
    }
}
