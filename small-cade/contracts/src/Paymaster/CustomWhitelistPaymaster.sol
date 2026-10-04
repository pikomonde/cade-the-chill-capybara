// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BasePaymaster} from "account-abstraction/core/BasePaymaster.sol";
import {PackedUserOperation} from "account-abstraction/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "account-abstraction/core/Helpers.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";

/**
 * @title CustomWhitelistPaymaster
 * @dev A serverless paymaster that pays gas ONLY if the player is calling our Game or Treasury contract.
 */
contract CustomWhitelistPaymaster is BasePaymaster {

    // Mapping to store multiple whitelisted games/contracts
    mapping(address => bool) public isWhitelisted;

    constructor(address _entryPoint) BasePaymaster(IEntryPoint(_entryPoint), msg.sender) {}

    // Add a contract to the whitelist
    function addWhitelistedContract(address _contract) external onlyOwner {
        isWhitelisted[_contract] = true;
    }

    // Remove a contract from the whitelist (Deletes the key to save space & get gas refund)
    function removeWhitelistedContract(address _contract) external onlyOwner {
        delete isWhitelisted[_contract];
    }

    /**
     * @dev Validates the paymaster logic WITHOUT any backend signature.
     * It decodes the callData from the Smart Wallet to see where the transaction is going.
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 requiredPreFund
    ) internal view override returns (bytes memory context, uint256 validationData) {
        
        // The userOp.callData for a standard Smart Wallet (like Privy/SimpleAccount) 
        // usually starts with the `execute(address dest, uint256 value, bytes func)` selector (4 bytes).
        // The destination address is the first argument, located from byte 4 to 36.
        require(userOp.callData.length >= 36, "Invalid callData length");

        // Decode the target address from the callData
        address targetContract = address(uint160(uint256(bytes32(userOp.callData[4:36]))));

        // Only pay gas if the target contract is whitelisted!
        if (!isWhitelisted[targetContract]) {
            return ("", SIG_VALIDATION_FAILED); // Reject gas payment
        }

        // Accept and pay gas!
        return ("", SIG_VALIDATION_SUCCESS);
    }
}
