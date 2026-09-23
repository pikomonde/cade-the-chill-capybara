// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract CadePoints is ERC20, Ownable {
    // Mapping to store authorized game contracts
    mapping(address => bool) public isGameContract;

    error TransferNotAllowed();
    error OnlyGameContractCanMint();

    constructor() ERC20("Cade Points", "CADE-PT") Ownable(msg.sender) {}

    // Add a new game contract that is allowed to mint points
    function addGameContract(address _game) external onlyOwner {
        isGameContract[_game] = true;
    }

    // Remove a game contract's permission to mint points
    function removeGameContract(address _game) external onlyOwner {
        isGameContract[_game] = false;
    }

    // Only authorized Game contracts can mint points for the winners
    function mint(address to, uint256 amount) external {
        require(isGameContract[msg.sender], OnlyGameContractCanMint());
        _mint(to, amount);
    }

    // DISABLE TRANSFER FUNCTION (Soulbound Mechanism)
    function transfer(address to, uint256 value) public override returns (bool) {
        revert TransferNotAllowed();
    }

    // DISABLE TRANSFER FROM FUNCTION (Soulbound Mechanism)
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        revert TransferNotAllowed();
    }
}
