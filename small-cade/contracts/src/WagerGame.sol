// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Simple interface so we can move USDC
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract WagerGame {
    // 1. Variabel State
    uint256 public constant BET_AMOUNT = 0.1 * 10**6; // 0.1 USDC (USDC has 6 decimal)
    address public usdcToken; // Address contract USDC
    
    // Data for this round
    uint256 public roundEndTime;
    uint256 public totalGuesses; // Total guesses (will be mod 100)
    
    struct PlayerBet {
        address player;
        uint8 guess; // Number guess between 1-100
    }
    
    PlayerBet[] public currentBets; // List of player in this round

    // Event (recorded in blockchain & and read by frontend)
    event BetPlaced(address indexed player, uint8 guess);
    event RoundResolved(address indexed winner, uint8 winningNumber, uint256 prize);

    // Put USDC address here when deployed
    constructor(address _usdcToken) {
        usdcToken = _usdcToken;
        roundEndTime = block.timestamp + 5 minutes; // First round!
    }

    // 1. FUNCTION to place bet
    function placeBet(uint8 guess) external {
        // Auto-resolve previous round if time has passed
        if (block.timestamp >= roundEndTime) {
            _resolveRound();
        }

        require(guess < 100, "Guess number should be between 0 - 99!");

        // Get 0.1 USDC from player's wallet to this smart contract
        // require(IERC20(usdcToken).transferFrom(msg.sender, address(this), BET_AMOUNT), "Failed to transfer USDC");

        currentBets.push(PlayerBet({
            player: msg.sender,
            guess: guess
        }));
        
        totalGuesses += guess;

        emit BetPlaced(msg.sender, guess); // Send notification to frontend
    }

    // 2. FUNCTION to calculate winner (Internal auto-resolve)
    function _resolveRound() internal {
        if (currentBets.length == 0) {
            // No players in the last round, just reset timer
            roundEndTime = block.timestamp + 5 minutes;
            return;
        }

        uint8 winningNumber = uint8(totalGuesses % 100); 
        
        // Find whose guess is the closest
        address winner = currentBets[0].player;
        uint8 smallestDiff = _getDifference(currentBets[0].guess, winningNumber);

        for (uint256 i = 1; i < currentBets.length; i++) {
            uint8 diff = _getDifference(currentBets[i].guess, winningNumber);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                winner = currentBets[i].player;
            }
        }

        // Share prize (50% ke Winner)
        uint256 totalPrize = currentBets.length * BET_AMOUNT;
        uint256 winnerPrize = totalPrize / 2;
        
        // Another 50% on this contract (fee for paymaster)
        // require(IERC20(usdcToken).transfer(winner, winnerPrize), "Failed to transfer prize");

        emit RoundResolved(winner, winningNumber, winnerPrize); // Notify the winner

        // Reset round for next game!
        delete currentBets;
        totalGuesses = 0;
        roundEndTime = block.timestamp + 5 minutes;
    }

    // Helper function untuk read number of bets in this round
    function getBetsCount() external view returns (uint256) {
        return currentBets.length;
    }

    // Helper function
    function _getDifference(uint8 a, uint8 b) internal pure returns (uint8) {
        if (a > b) return a - b;
        return b - a;
    }
}
