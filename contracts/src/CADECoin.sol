// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CADECoin
/// @notice The golden seeds of Cade the Chill Capybara. ERC-20 token earned by completing daily quests.
/// @dev Only GameReward contract can mint. No hard cap — controlled by reward contract.
contract CADECoin is ERC20, ERC20Burnable, Ownable {
    /// @notice Address of the GameReward contract (sole minter)
    address public gameRewardContract;

    event GameRewardContractUpdated(address indexed oldAddr, address indexed newAddr);

    error UnauthorizedMinter(address caller);
    error ZeroAddress();

    modifier onlyGameReward() {
        if (msg.sender != gameRewardContract) revert UnauthorizedMinter(msg.sender);
        _;
    }

    constructor(address initialOwner) ERC20("CADE Coin", "CADE") Ownable(initialOwner) {}

    /// @notice Mint CADE Coins to a player. Called only by GameReward contract.
    /// @param to Recipient wallet address
    /// @param amount Amount to mint (18 decimals)
    function mint(address to, uint256 amount) external onlyGameReward {
        _mint(to, amount);
    }

    /// @notice Set or update the GameReward contract address
    /// @param addr New GameReward contract address
    function setGameRewardContract(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        emit GameRewardContractUpdated(gameRewardContract, addr);
        gameRewardContract = addr;
    }
}
