// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CADEBadge} from "./CADEBadge.sol";
import {CADECoin} from "./CADECoin.sol";

/// @title BadgeMarket — Meadow Market
/// @notice On-chain marketplace for Meadow Badges. Payment in CADE Coin only.
///         5% royalty on every sale goes to treasury (funds paymaster).
contract BadgeMarket is Ownable, ReentrancyGuard, IERC1155Receiver {

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 priceInCADE; // 18 decimals
        bool    active;
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    CADEBadge public cadeBadge;
    CADECoin  public cadeCoin;

    /// @notice Treasury address (receives 5% royalty)
    address public treasury;

    /// @notice Royalty in basis points (500 = 5%)
    uint256 public constant ROYALTY_BPS = 500;

    uint256 public nextListingId;
    mapping(uint256 listingId => Listing) public listings;

    // ─────────────────────────────────────────────
    // Events & Errors
    // ─────────────────────────────────────────────

    event Listed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 priceInCADE);
    event Delisted(uint256 indexed listingId, address indexed seller);
    event Sold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 priceInCADE);

    error ListingNotActive(uint256 listingId);
    error NotSeller(address caller, uint256 listingId);
    error ZeroAddress();
    error ZeroPrice();
    error InsufficientAllowance();

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(
        address initialOwner,
        address _cadeBadge,
        address _cadeCoin,
        address _treasury
    ) Ownable(initialOwner) {
        if (_cadeBadge == address(0) || _cadeCoin == address(0) || _treasury == address(0))
            revert ZeroAddress();
        cadeBadge = CADEBadge(_cadeBadge);
        cadeCoin  = CADECoin(_cadeCoin);
        treasury  = _treasury;
    }

    // ─────────────────────────────────────────────
    // Marketplace Functions
    // ─────────────────────────────────────────────

    /// @notice List a Meadow Badge for sale.
    /// @dev Badge is transferred to this contract as escrow.
    ///      Seller must setApprovalForAll(BadgeMarket, true) on CADEBadge first.
    /// @param tokenId      Badge token ID to list
    /// @param priceInCADE  Price in CADE Coin (18 decimals)
    function list(uint256 tokenId, uint256 priceInCADE) external nonReentrant returns (uint256 listingId) {
        if (priceInCADE == 0) revert ZeroPrice();

        cadeBadge.safeTransferFrom(msg.sender, address(this), tokenId, 1, "");

        listingId = nextListingId++;
        listings[listingId] = Listing({
            seller:       msg.sender,
            tokenId:      tokenId,
            priceInCADE:  priceInCADE,
            active:       true
        });

        emit Listed(listingId, msg.sender, tokenId, priceInCADE);
    }

    /// @notice Cancel a listing and return badge to seller.
    function delist(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingNotActive(listingId);
        if (l.seller != msg.sender) revert NotSeller(msg.sender, listingId);

        l.active = false;
        cadeBadge.safeTransferFrom(address(this), msg.sender, l.tokenId, 1, "");

        emit Delisted(listingId, msg.sender);
    }

    /// @notice Buy a listed Meadow Badge.
    /// @dev Buyer must approve CADE Coin spend: cadeCoin.approve(BadgeMarket, price)
    /// @param listingId  Listing to purchase
    function buy(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingNotActive(listingId);

        uint256 royalty      = (l.priceInCADE * ROYALTY_BPS) / 10_000;
        uint256 sellerAmount = l.priceInCADE - royalty;

        l.active = false;

        // Distribute CADE Coin
        cadeCoin.transferFrom(msg.sender, treasury, royalty);
        cadeCoin.transferFrom(msg.sender, l.seller, sellerAmount);

        // Transfer badge from escrow to buyer
        cadeBadge.safeTransferFrom(address(this), msg.sender, l.tokenId, 1, "");

        emit Sold(listingId, msg.sender, l.seller, l.priceInCADE);
    }

    // ─────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    // ─────────────────────────────────────────────
    // ERC1155 Receiver (required to hold badges in escrow)
    // ─────────────────────────────────────────────

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external pure override returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external pure override returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId
            || interfaceId == type(IERC165).interfaceId;
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }
}
