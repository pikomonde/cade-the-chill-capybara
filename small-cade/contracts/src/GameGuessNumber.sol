// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Simple interface so we can move USDC
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ICadePoints {
    function mint(address to, uint256 amount) external;
}

contract GameGuessNumber {
    error GameIsShutdown();
    error GuessNumberNotInRange();
    error USDCTransferFailure();
    error PrizeTransferFailure();
    error UnauthorizedAccess();
    error ETHWithdrawFailure();

    // Variabel State
    uint256 public constant BET_AMOUNT = 0.1 * 10**6; // 0.1 USDC (USDC has 6 decimal)
    address public usdcToken;   // Address contract USDC
    address public cadeToken;   // Address for CADE cashback
    address public cadePoints;  // Address for CADE-PT prizes
    address public bankAddress; // Treasury address holding CADE
    address public owner;       // Owner/Admin of the contract
    bool public isGameActive; // Status of the game
    
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
    constructor(address _usdcToken, address _cadeToken, address _cadePoints) {
        usdcToken = _usdcToken;
        cadeToken = _cadeToken;
        cadePoints = _cadePoints;
        bankAddress = msg.sender;
        owner = msg.sender;
        isGameActive = true;
        roundEndTime = block.timestamp + 5 minutes; // First round!
    }

    // 1. FUNCTION to place bet
    function placeBet(uint8 guess) external {
        require(isGameActive, GameIsShutdown());
        
        // Auto-resolve previous round if time has passed
        if (block.timestamp >= roundEndTime) {
            _resolveRound();
        }

        require(guess < 100, GuessNumberNotInRange());

        // Get 0.1 USDC from player's wallet to this smart contract
        if (usdcToken != address(0)) {
            require(IERC20(usdcToken).transferFrom(msg.sender, bankAddress, BET_AMOUNT), USDCTransferFailure());
        }

        // Give 0.1 CADE cashback to player
        if (cadeToken != address(0)) {
            uint256 cashbackAmount = 100 * 10**18;
            require(IERC20(cadeToken).transferFrom(bankAddress, msg.sender, cashbackAmount), "Failed CADE cashback");
        }

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
        
        // 1. Find the smallest diff
        uint8 smallestDiff = _getDifference(currentBets[0].guess, winningNumber);
        for (uint256 i = 1; i < currentBets.length; i++) {
            uint8 diff = _getDifference(currentBets[i].guess, winningNumber);
            if (diff < smallestDiff) {
                smallestDiff = diff;
            }
        }

        // 2. Count how many players share this smallest diff
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < currentBets.length; i++) {
            if (_getDifference(currentBets[i].guess, winningNumber) == smallestDiff) {
                winnerCount++;
            }
        }

        // 3. Share prize (50% ke Winners)
        uint256 totalPrize = currentBets.length * BET_AMOUNT;
        uint256 totalWinnerPrize = totalPrize / 2;
        uint256 prizePerWinner = totalWinnerPrize / winnerCount;

        // 4. Distribute to all tied winners
        for (uint256 i = 0; i < currentBets.length; i++) {
            if (_getDifference(currentBets[i].guess, winningNumber) == smallestDiff) {
                address winner = currentBets[i].player;
                if (cadePoints != address(0)) {
                    ICadePoints(cadePoints).mint(winner, prizePerWinner);
                }
                emit RoundResolved(winner, winningNumber, prizePerWinner); // Notify each winner
            }
        }

        // Reset round for next game!
        delete currentBets;
        totalGuesses = 0;
        roundEndTime = block.timestamp + 5 minutes;
    }

    // Helper function to read number of bets in this round
    function getBetsCount() external view returns (uint256) {
        return currentBets.length;
    }

    // Helper function
    function _getDifference(uint8 a, uint8 b) internal pure returns (uint8) {
        if (a > b) return a - b;
        return b - a;
    }
    
    // --- ADMIN FUNCTIONS ---
    
    modifier onlyOwner() {
        require(msg.sender == owner, UnauthorizedAccess());
        _;
    }

    // Stop people from playing
    function shutdownGame() external onlyOwner {
        isGameActive = false;
    }

    // Start the game again
    function startGame() external onlyOwner {
        isGameActive = true;
        roundEndTime = block.timestamp + 5 minutes; // reset timer
    }

    // --- SETTER FUNCTIONS FOR UPGRADABILITY ---
    
    function setUSDCToken(address _usdcToken) external onlyOwner {
        usdcToken = _usdcToken;
    }

    function setCadeToken(address _cadeToken) external onlyOwner {
        cadeToken = _cadeToken;
    }

    function setCadePoints(address _cadePoints) external onlyOwner {
        cadePoints = _cadePoints;
    }

    function setBankAddress(address _bankAddress) external onlyOwner {
        bankAddress = _bankAddress;
    }

    // Emergency rescue for trapped USDC or any other token
    function emergencyWithdraw(address tokenAddress) external onlyOwner {
        if (tokenAddress == address(0)) {
            (bool success, ) = payable(owner).call{value: address(this).balance}("");
            require(success, ETHWithdrawFailure());
        } else {
            uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
            IERC20(tokenAddress).transfer(owner, balance);
        }
    }
}
