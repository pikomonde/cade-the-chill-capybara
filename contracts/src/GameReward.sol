// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {CADECoin} from "./CADECoin.sol";
import {CADEBadge} from "./CADEBadge.sol";

/// @title GameReward
/// @notice Verifies backend-signed reward vouchers and distributes CADE Coin + Meadow Badges.
///         Backend (trusted signer) signs results off-chain; this contract verifies on-chain.
contract GameReward is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    CADECoin  public cadeCoin;
    CADEBadge public cadeBadge;

    /// @notice The backend's signing key address (trusted signer)
    address public trustedSigner;

    /// @notice Prevents replay attacks: tracks used voucher hashes
    mapping(bytes32 => bool) public usedVouchers;

    event RewardClaimed(address indexed player, uint256 coinAmount, uint256 nonce);
    event BadgeClaimed(address indexed player, uint256 indexed tokenId, uint256 nonce);
    event TrustedSignerUpdated(address indexed oldSigner, address indexed newSigner);

    error InvalidSignature();
    error VoucherAlreadyUsed(bytes32 voucherHash);
    error ZeroAddress();
    error ZeroAmount();

    constructor(
        address initialOwner,
        address _cadeCoin,
        address _cadeBadge,
        address _trustedSigner
    ) Ownable(initialOwner) {
        if (_cadeCoin == address(0) || _cadeBadge == address(0) || _trustedSigner == address(0))
            revert ZeroAddress();
        cadeCoin      = CADECoin(_cadeCoin);
        cadeBadge     = CADEBadge(_cadeBadge);
        trustedSigner = _trustedSigner;
    }

    // ─────────────────────────────────────────────
    // Claim Functions (called by player)
    // ─────────────────────────────────────────────

    /// @notice Claim pending CADE Coins with a backend-signed voucher.
    /// @param amount     CADE Coins to mint (18 decimals)
    /// @param nonce      Unique nonce from backend (prevents replay)
    /// @param signature  ECDSA signature from trustedSigner
    function claimCoins(
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external {
        if (amount == 0) revert ZeroAmount();

        bytes32 voucherHash = keccak256(
            abi.encodePacked(msg.sender, amount, nonce, block.chainid)
        );
        _verifyAndConsume(voucherHash, signature);

        cadeCoin.mint(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount, nonce);
    }

    /// @notice Claim a Meadow Badge with a backend-signed voucher.
    /// @param tokenId   Badge token ID (keccak256 of gameName + dateUTC)
    /// @param nonce     Unique nonce from backend
    /// @param signature ECDSA signature from trustedSigner
    function claimBadge(
        uint256 tokenId,
        uint256 nonce,
        bytes calldata signature
    ) external {
        bytes32 voucherHash = keccak256(
            abi.encodePacked(msg.sender, tokenId, nonce, block.chainid, "badge")
        );
        _verifyAndConsume(voucherHash, signature);

        cadeBadge.mint(msg.sender, tokenId);
        emit BadgeClaimed(msg.sender, tokenId, nonce);
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    function _verifyAndConsume(bytes32 voucherHash, bytes calldata signature) internal {
        if (usedVouchers[voucherHash]) revert VoucherAlreadyUsed(voucherHash);

        bytes32 ethHash = voucherHash.toEthSignedMessageHash();
        address recovered = ethHash.recover(signature);
        if (recovered != trustedSigner) revert InvalidSignature();

        usedVouchers[voucherHash] = true;
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setTrustedSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        emit TrustedSignerUpdated(trustedSigner, signer);
        trustedSigner = signer;
    }

    function setCadeCoin(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        cadeCoin = CADECoin(addr);
    }

    function setCadeBadge(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        cadeBadge = CADEBadge(addr);
    }
}
