// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Subscription — Meadow Pass
/// @notice Manages Cade the Chill Capybara subscription tiers.
///         Subscribers get on-chain reward settlement + badges + multipliers.
///         Payment in USDC. Not transferable. Stackable (extends expiry).
contract Subscription is Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    /// @notice Meadow Pass tiers
    enum Tier {
        None,        // 0 — Wanderer (free)
        Explorer,    // 1 — Settler   (1.5 USDC / 30 days)
        Adventurer,  // 2 — Adventurer (8 USDC / 180 days)
        Legend,      // 3 — Guardian  (15 USDC / 365 days)
        Eternal      // 4 — Ancient Capybara (40 USDC / 3 years)
    }

    struct Sub {
        Tier    tier;
        uint256 expiry; // Unix timestamp
    }

    // ─────────────────────────────────────────────
    // Constants (USDC has 6 decimals)
    // ─────────────────────────────────────────────

    uint256 public constant PRICE_EXPLORER   = 1_500_000;  // 1.5 USDC
    uint256 public constant PRICE_ADVENTURER = 8_000_000;  // 8.0 USDC
    uint256 public constant PRICE_LEGEND     = 15_000_000; // 15.0 USDC
    uint256 public constant PRICE_ETERNAL    = 40_000_000; // 40.0 USDC

    uint256 public constant DUR_EXPLORER    = 30 days;
    uint256 public constant DUR_ADVENTURER  = 180 days;
    uint256 public constant DUR_LEGEND      = 365 days;
    uint256 public constant DUR_ETERNAL     = 3 * 365 days;

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    /// @notice USDC token contract
    IERC20 public usdc;

    /// @notice Treasury / GameVault address (receives subscription fees)
    address public treasury;

    /// @notice Subscription state per wallet
    mapping(address => Sub) public subscriptions;

    // ─────────────────────────────────────────────
    // Events & Errors
    // ─────────────────────────────────────────────

    event Subscribed(address indexed user, Tier tier, uint256 expiry);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error InvalidTier();
    error ZeroAddress();
    error DowngradeNotAllowed(Tier current, Tier requested);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(address initialOwner, address _usdc, address _treasury)
        Ownable(initialOwner)
    {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc     = IERC20(_usdc);
        treasury = _treasury;
    }

    // ─────────────────────────────────────────────
    // Subscribe
    // ─────────────────────────────────────────────

    /// @notice Purchase or extend a Meadow Pass subscription.
    /// @dev    Caller must approve USDC spend first.
    ///         Subscribing while active extends expiry from current expiry date.
    ///         Downgrade (e.g. Legend → Explorer) is not allowed.
    /// @param tier The desired subscription tier
    function subscribe(Tier tier) external {
        if (tier == Tier.None) revert InvalidTier();

        Sub storage current = subscriptions[msg.sender];

        // Prevent downgrade while active
        if (isActive(msg.sender) && uint8(tier) < uint8(current.tier)) {
            revert DowngradeNotAllowed(current.tier, tier);
        }

        uint256 price    = _getPrice(tier);
        uint256 duration = _getDuration(tier);

        usdc.safeTransferFrom(msg.sender, treasury, price);

        // Extend from current expiry (if active), otherwise from now
        uint256 startFrom = (isActive(msg.sender)) ? current.expiry : block.timestamp;
        uint256 newExpiry  = startFrom + duration;

        subscriptions[msg.sender] = Sub({ tier: tier, expiry: newExpiry });

        emit Subscribed(msg.sender, tier, newExpiry);
    }

    // ─────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────

    /// @notice Check if a wallet has an active Meadow Pass
    function isActive(address user) public view returns (bool) {
        return subscriptions[user].expiry > block.timestamp;
    }

    /// @notice Get current tier (returns None if expired)
    function getTier(address user) external view returns (Tier) {
        if (!isActive(user)) return Tier.None;
        return subscriptions[user].tier;
    }

    /// @notice Get CADE Coin multiplier for a wallet (basis points, 100 = 1x)
    function getMultiplierBps(address user) external view returns (uint256) {
        if (!isActive(user)) return 100; // 1x for free/expired
        Tier t = subscriptions[user].tier;
        if (t == Tier.Adventurer) return 200; // 2x
        if (t == Tier.Legend || t == Tier.Eternal) return 300; // 3x
        return 100; // Explorer = 1x
    }

    /// @notice Get subscription expiry timestamp
    function getExpiry(address user) external view returns (uint256) {
        return subscriptions[user].expiry;
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    function _getPrice(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Explorer)   return PRICE_EXPLORER;
        if (tier == Tier.Adventurer) return PRICE_ADVENTURER;
        if (tier == Tier.Legend)     return PRICE_LEGEND;
        if (tier == Tier.Eternal)    return PRICE_ETERNAL;
        revert InvalidTier();
    }

    function _getDuration(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Explorer)   return DUR_EXPLORER;
        if (tier == Tier.Adventurer) return DUR_ADVENTURER;
        if (tier == Tier.Legend)     return DUR_LEGEND;
        if (tier == Tier.Eternal)    return DUR_ETERNAL;
        revert InvalidTier();
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setUsdc(address _usdc) external onlyOwner {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }
}
