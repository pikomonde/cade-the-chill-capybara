// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// Basic interface for Uniswap V3 Router
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

// Interface for WETH to unwrap to ETH
interface IWETH {
    function withdraw(uint wad) external;
}

// Interface for EntryPoint to deposit ETH for Paymaster
interface IEntryPoint {
    function depositTo(address account) external payable;
    function balanceOf(address account) external view returns (uint256);
}

contract Treasury {
    address public owner;
    
    // Tokens
    address public usdcToken;
    address public cadeToken;
    address public wethToken;
    
    // Core Addresses
    address public paymasterAddress;
    address public entryPointAddress;
    address public dexRouterAddress; // Uniswap Router
    address public personalWallet; // Wallet for 40% profit

    // Configs
    uint256 public replenishGasInterval = 1 days; // Default 1 day
    uint256 public lastReplenishTime;
    uint256 public constant DENOMINATOR = 10_000_000; // Formula: balance / 10m

    // Percentage splits (must sum to 100)
    uint256 public gasPercentage = 40;
    uint256 public profitPercentage = 40;
    uint256 public buybackPercentage = 20;
    
    // Pool Fee (Uniswap usually 0.3% -> 3000)
    uint24 public poolFee = 3000; 

    event DexActivated(address router);
    event GasReplenished(address caller, uint256 usdcSwapped, uint256 ethDeposited);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address _usdc, 
        address _cade, 
        address _weth, 
        address _entryPoint,
        address _personalWallet
    ) {
        owner = msg.sender;
        usdcToken = _usdc;
        cadeToken = _cade;
        wethToken = _weth;
        entryPointAddress = _entryPoint;
        personalWallet = _personalWallet;
        lastReplenishTime = block.timestamp; // Start timer on deploy
    }

    // Needed to receive unwrapped ETH from WETH contract
    receive() external payable {}

    // --- OWNERSHIP ---
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --- DYNAMIC PRICING ---
    
    // Game will call this to know how much cashback to give for 0.1 USDC
    function getPlayCashback() public view returns (uint256) {
        uint256 balance = IERC20(cadeToken).balanceOf(address(this));
        if (balance == 0) return 0;
        
        return balance / DENOMINATOR; 
    }

    // Reward for the player who clicks replenishGas
    function getReplenishReward() public view returns (uint256) {
        return getPlayCashback() * 500; 
    }

    // --- REPLENISH LOGIC ---

    function isNeedReplenishGasNow() public view returns (bool) {
        // Can only run if DEX is activated and interval has passed
        if (dexRouterAddress == address(0)) return false;
        return block.timestamp >= lastReplenishTime + replenishGasInterval;
    }

    function replenishGas() external {
        require(isNeedReplenishGasNow(), "Not ready yet or DEX off");
        
        uint256 usdcBalance = IERC20(usdcToken).balanceOf(address(this));
        require(usdcBalance > 0, "No USDC to process");

        lastReplenishTime = block.timestamp; // Reset timer

        // Calculate Splits
        uint256 gasAmount = (usdcBalance * gasPercentage) / 100;
        uint256 profitAmount = (usdcBalance * profitPercentage) / 100;
        uint256 buybackAmount = usdcBalance - gasAmount - profitAmount; // Remaining 20%

        // 1. Send Profit to Personal Wallet
        if (profitAmount > 0 && personalWallet != address(0)) {
            IERC20(usdcToken).transfer(personalWallet, profitAmount);
        }

        // Allow Router to spend USDC
        if (dexRouterAddress != address(0)) {
            IERC20(usdcToken).approve(dexRouterAddress, gasAmount + buybackAmount);
        }

        // 2. Swap for Gas (USDC -> WETH -> ETH -> EntryPoint)
        if (gasAmount > 0 && paymasterAddress != address(0) && dexRouterAddress != address(0)) {
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: usdcToken,
                tokenOut: wethToken,
                fee: poolFee,
                recipient: address(this), // Receive WETH to this treasury
                deadline: block.timestamp,
                amountIn: gasAmount,
                amountOutMinimum: 0, // In production, add slippage protection here!
                sqrtPriceLimitX96: 0
            });

            // Swap USDC for WETH
            uint256 wethReceived = ISwapRouter(dexRouterAddress).exactInputSingle(params);
            
            // Unwrap WETH to ETH
            IWETH(wethToken).withdraw(wethReceived);
            
            // Deposit ETH to EntryPoint for Paymaster
            IEntryPoint(entryPointAddress).depositTo{value: wethReceived}(paymasterAddress);
        }

        // 3. Swap for Buyback (USDC -> CADE)
        if (buybackAmount > 0 && dexRouterAddress != address(0)) {
            ISwapRouter.ExactInputSingleParams memory paramsCade = ISwapRouter.ExactInputSingleParams({
                tokenIn: usdcToken,
                tokenOut: cadeToken,
                fee: poolFee,
                recipient: address(this), // CADE stays in Treasury!
                deadline: block.timestamp,
                amountIn: buybackAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
            // Execute swap
            ISwapRouter(dexRouterAddress).exactInputSingle(paramsCade);
        }

        // 4. Reward the Caller!
        uint256 reward = getReplenishReward();
        uint256 cadeBal = IERC20(cadeToken).balanceOf(address(this));
        if (cadeBal >= reward) {
            IERC20(cadeToken).transfer(msg.sender, reward);
        }

        emit GasReplenished(msg.sender, gasAmount, 0); // Event
    }

    // --- ADMIN SETUP ---

    function setDex(address _router) external onlyOwner {
        dexRouterAddress = _router;
        emit DexActivated(_router);
    }

    function setPaymaster(address _paymaster) external onlyOwner {
        paymasterAddress = _paymaster;
    }

    function setReplenishGasInterval(uint256 minutesInterval) external onlyOwner {
        replenishGasInterval = minutesInterval * 1 minutes;
    }

    function setPercentages(uint256 _gas, uint256 _profit, uint256 _buyback) external onlyOwner {
        require(_gas + _profit + _buyback == 100, "Must sum to 100");
        gasPercentage = _gas;
        profitPercentage = _profit;
        buybackPercentage = _buyback;
    }

    // --- EMERGENCY ---
    
    // Emergency withdraw logic (V1 only, can transfer ownership to timelock later)
    // TODO: transfer ownership to timelock
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    function emergencyWithdrawETH(uint256 amount) external onlyOwner {
        (bool success, ) = owner.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}
