// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title CADEBadge — Meadow Badges
/// @notice Date-stamped achievement badges from Cade's daily quests.
///         Each badge is tied to a specific game + UTC date. Mintable only on that date.
///         firstOwner is permanently recorded even if the badge is later sold.
contract CADEBadge is ERC1155, Ownable {
    using Strings for uint256;

    /// @notice Base URI for badge metadata (IPFS)
    string public baseURI;

    /// @notice Address of the GameReward contract (sole minter)
    address public gameRewardContract;

    struct BadgeInfo {
        string  gameName;
        uint256 dateUTC;      // Unix timestamp: start of the UTC day
        uint256 mintDeadline; // Unix timestamp: end of the UTC day
        bool    initialized;
    }

    /// @notice Token metadata per badge type
    mapping(uint256 tokenId => BadgeInfo) public badgeInfo;

    /// @notice Permanently records first owner per badge per wallet
    /// @dev Survives transfers — firstOwner[tokenId][wallet] is set on first mint only
    mapping(uint256 tokenId => mapping(address wallet => address firstOwner)) public firstOwner;

    /// @notice Soulbound token IDs (cannot be transferred)
    mapping(uint256 tokenId => bool) public isSoulbound;

    event BadgeRegistered(uint256 indexed tokenId, string gameName, uint256 dateUTC);
    event BadgeMinted(uint256 indexed tokenId, address indexed to);
    event SoulboundSet(uint256 indexed tokenId);

    error UnauthorizedMinter(address caller);
    error BadgeNotRegistered(uint256 tokenId);
    error MintingPeriodEnded(uint256 tokenId, uint256 deadline);
    error AlreadyMinted(address wallet, uint256 tokenId);
    error SoulboundToken(uint256 tokenId);
    error ZeroAddress();

    modifier onlyGameReward() {
        if (msg.sender != gameRewardContract) revert UnauthorizedMinter(msg.sender);
        _;
    }

    constructor(address initialOwner, string memory _baseURI)
        ERC1155(_baseURI)
        Ownable(initialOwner)
    {
        baseURI = _baseURI;
    }

    // ─────────────────────────────────────────────
    // Admin Functions
    // ─────────────────────────────────────────────

    /// @notice Register a new badge type for a specific game + UTC date
    /// @param gameName  e.g. "sudoku"
    /// @param dateUTC   Unix timestamp of the start of the UTC day
    function registerBadge(string calldata gameName, uint256 dateUTC)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        tokenId = uint256(keccak256(abi.encodePacked(gameName, dateUTC)));
        badgeInfo[tokenId] = BadgeInfo({
            gameName:     gameName,
            dateUTC:      dateUTC,
            mintDeadline: dateUTC + 1 days,
            initialized:  true
        });
        emit BadgeRegistered(tokenId, gameName, dateUTC);
    }

    /// @notice Mark a badge as soulbound (non-transferable). E.g. "Founding Capybara"
    function setSoulbound(uint256 tokenId) external onlyOwner {
        isSoulbound[tokenId] = true;
        emit SoulboundSet(tokenId);
    }

    function setGameRewardContract(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        gameRewardContract = addr;
    }

    function setBaseURI(string calldata _baseURI) external onlyOwner {
        baseURI = _baseURI;
        _setURI(_baseURI);
    }

    // ─────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────

    /// @notice Mint a Meadow Badge to a player. Called by GameReward.
    /// @param to      Player wallet
    /// @param tokenId Badge token ID (keccak256 of gameName + dateUTC)
    function mint(address to, uint256 tokenId) external onlyGameReward {
        BadgeInfo storage info = badgeInfo[tokenId];
        if (!info.initialized)            revert BadgeNotRegistered(tokenId);
        if (block.timestamp > info.mintDeadline) revert MintingPeriodEnded(tokenId, info.mintDeadline);
        if (firstOwner[tokenId][to] != address(0)) revert AlreadyMinted(to, tokenId);

        // Record first owner permanently — never overwritten
        firstOwner[tokenId][to] = to;

        _mint(to, tokenId, 1, "");
        emit BadgeMinted(tokenId, to);
    }

    // ─────────────────────────────────────────────
    // Soulbound Transfer Guard
    // ─────────────────────────────────────────────

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        if (isSoulbound[id]) revert SoulboundToken(id);
        super.safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        for (uint256 i = 0; i < ids.length; i++) {
            if (isSoulbound[ids[i]]) revert SoulboundToken(ids[i]);
        }
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    // ─────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }
}
