// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract CadeToken is ERC20, Ownable {
    // Deployer automatically receives all supply (Acts as a temporary Bank/Treasury)
    constructor() ERC20("Cade the Chill Capybara", "CADE") Ownable(msg.sender) {
        // Mint 1773.420 Million CADE
        // Do you know that Capybara first Discovered in 1773 in South America?
        // 420 means chill. Yeah, you (CADE) are a chill capybara, right?
        _mint(msg.sender, 1_773_420_888 * 10 ** decimals() + 888_888_888_888_888_888);
    }

    // --- FUN MEME FEATURES ---

    // A-Z Modifier (Index 0 = A, 1 = B, ... 25 = Z)
    string[26] public modifiers = ["Angry", "Blue", "Chill", "Dope", "Epic", "Fast", "Golden", "Happy", "Icy", "Jolly", "Kind", "Lucky", "Mad", "Nice", "Old", "Poor", "Quick", "Red", "Silver", "Tall", "Ugly", "Vast", "Wild", "Xenon", "Yellow", "Zen"];
    
    // A-Z Subject (Index 0 = A, 1 = B, ... 25 = Z)
    string[26] public subjects = ["Ant", "Bear", "Capybara", "Dog", "Eagle", "Frog", "Goat", "Hawk", "Iguana", "Jaguar", "Koala", "Lion", "Mamba", "Newt", "Owl", "Panda", "Quail", "Rat", "Shark", "Tiger", "Unicorn", "Viper", "Whale", "X-Ray", "Yak", "Zebra"];

    struct VibeData {
        bytes1 modCode; // Example: "C"
        bytes1 subCode; // Example: "C"
        string text;    // Custom Text (Max: 30 characters)
    }

    mapping(address => VibeData) public vibes;

    // Set Function
    function setVibe(bytes1 _mod, bytes1 _sub, string calldata _text) external {
        require(bytes(_text).length <= 30, "Text too long! Max 30 chars.");
        
        vibes[msg.sender] = VibeData({
            modCode: _mod,
            subCode: _sub,
            text: _text
        });
    }

    // Helper functions
    function _decodeChar(bytes1 char, string[26] storage dict) internal view returns (string memory) {
        uint8 asciiVal = uint8(char);
        
        // Is character A-Z uppercase (ASCII 65 - 90)
        if (asciiVal >= 65 && asciiVal <= 90) {
            uint8 index = asciiVal - 65;
            return dict[index];
        }
        
        // Is character a-z lowercase (ASCII 97 - 122)
        if (asciiVal >= 97 && asciiVal <= 122) {
            uint8 index = asciiVal - 97;
            return dict[index];
        }

        // For other symbol (like ^, *, etc), return char as is
        bytes memory rawChar = new bytes(1);
        rawChar[0] = char;
        return string(rawChar);
    }

    // Get Function
    function getVibe(address user) external view returns (string memory combo, string memory customText) {
        VibeData memory v = vibes[user];
        
        // Validate if never set vibe, return default
        if (v.modCode == 0 && v.subCode == 0) {
            return ("", "");
        }

        string memory modString = _decodeChar(v.modCode, modifiers);
        string memory subString = _decodeChar(v.subCode, subjects);

        combo = string.concat(modString, " ", subString);
        customText = v.text;
    }

    // Check someone's vibe based on their balance!
    function vibeCheck(address user) external view returns (string memory) {
        uint256 bal = balanceOf(user);
        
        if (bal == 0) {
            return "No chill at all. You need a yuzu bath.";
        } else if (bal < 10_000 * 10**decimals()) {
            return "Baby Capybara just woke up.";
        } else if (bal < 10_000_000 * 10**decimals()) {
            return "Chilling in the hot springs.";
        } else {
            return "Maximum Zen Mode Achieved! Ultimate Capybara.";
        }
    }
}
