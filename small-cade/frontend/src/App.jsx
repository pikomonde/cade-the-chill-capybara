import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createPublicClient, http, parseAbiItem, parseAbi } from 'viem';
import { defineChain } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import gameArtifact from './GameGuessNumberABI.json';
import cadeTokenArtifact from './CadeTokenABI.json';
import treasuryArtifact from './TreasuryABI.json';
import { getSmartWalletClient } from './smartWalletClient.js';
import { getOrCreatePrivateKey, saveCustomPrivateKey, clearStoredPrivateKey } from './walletStorage.js';
import sdk from '@farcaster/frame-sdk';

const ERROR_MESSAGES = {
  GameIsShutdown: "Game is currently shutdown/paused!",
  GuessNumberNotInRange: "Guess number should be between 0 - 99!",
  USDCTransferFailure: "Failed to transfer USDC.",
  PrizeTransferFailure: "Failed to transfer prize.",
  UnauthorizedAccess: "Only owner can call this.",
  ETHWithdrawFailure: "ETH transfer failed.",
  InsufficientBalance: "Insufficient balance.",
  InsufficientAllowance: "Insufficient allowance."
};

const anvilChain = defineChain({
  id: 31337,
  name: 'Anvil Localhost',
  network: 'anvil',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] }, public: { http: ['http://127.0.0.1:8545'] } },
});

const isAnvil = import.meta.env.VITE_NETWORK === 'anvil';
const isMainnet = import.meta.env.VITE_NETWORK === 'mainnet';
const activeChain = isAnvil ? anvilChain : (isMainnet ? base : baseSepolia);

const getEnvVar = (name) => {
  if (isAnvil) return import.meta.env[`VITE_${name}_ANVIL`];
  if (isMainnet) return import.meta.env[`VITE_${name}_MAINNET`];
  return import.meta.env[`VITE_${name}_SEPOLIA`];
};

const CONTRACT_ADDRESS = getEnvVar('GAME_GUESS_NUMBER_ADDRESS');
const CONTRACT_ABI = gameArtifact.abi;
const USDC_ADDRESS = getEnvVar('USDC_ADDRESS');
const CADE_TOKEN_ADDRESS = getEnvVar('CADE_TOKEN_ADDRESS');
const CADE_POINTS_ADDRESS = getEnvVar('CADE_POINTS_ADDRESS');
const PAYMASTER_ADDRESS = getEnvVar('PAYMASTER_ADDRESS');
const TREASURY_ADDRESS = getEnvVar('TREASURY_ADDRESS');

const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)'
]);

const publicClient = createPublicClient({
  chain: activeChain,
  transport: isAnvil ? http('http://127.0.0.1:8545') : http(),
});

const formatBalance = (val) => {
  const num = typeof val === 'number' ? val : Number(String(val || 0).replace(/,/g, ''));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function App() {
  // Native Zero-Privy Wallet State
  const [privateKey, setPrivateKey] = useState(null);
  const [eoaAddress, setEoaAddress] = useState(null);
  const [smartWalletAddress, setSmartWalletAddress] = useState(null);
  const [smartAccountClient, setSmartAccountClient] = useState(null);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [keySource, setKeySource] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  const [guessInput, setGuessInput] = useState('');
  const [roundEndTime, setRoundEndTime] = useState(0);
  const [playersList, setPlayersList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [timeLeft, setTimeLeft] = useState('00:00');
  const [isRoundEnded, setIsRoundEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const [hasAllowance, setHasAllowance] = useState(false);
  const [activeTab, setActiveTab] = useState('game'); // 'game' or 'profile'

  // Token Balances
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [cadeBalance, setCadeBalance] = useState('0');
  const [cadePtBalance, setCadePtBalance] = useState('0');

  // Vibe State
  const [vibeStatus, setVibeStatus] = useState('');
  const [vibeCombo, setVibeCombo] = useState('');
  const [vibeText, setVibeText] = useState('');
  const [inputMod, setInputMod] = useState('C');
  const [inputSub, setInputSub] = useState('C');
  const [inputCustomText, setInputCustomText] = useState('');

  // Treasury & Gas Replenish State
  const [isNeedReplenish, setIsNeedReplenish] = useState(false);
  const [replenishReward, setReplenishReward] = useState('0');
  const [playCashback, setPlayCashback] = useState('...');

  // 1. Initialize Farcaster Frame v2
  useEffect(() => {
    // Notify Farcaster Frame v2 host that the Mini App is ready to display
    const initFarcasterFrame = async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        // Safely ignore if not running inside a Farcaster client
        console.debug("Not in Farcaster Frame context:", e);
      }
    };
    initFarcasterFrame();
  }, []);

  // 2. Initialize Native Wallet (Telegram CloudStorage / LocalStorage / Imported)
  const initWallet = async (overrideKey = null) => {
    try {
      let keyData;
      if (overrideKey) {
        const formattedKey = await saveCustomPrivateKey(overrideKey);
        keyData = { key: formattedKey, isNew: false, source: 'imported' };
      } else {
        keyData = await getOrCreatePrivateKey();
      }

      setPrivateKey(keyData.key);
      setKeySource(keyData.source);

      const { smartAccountClient: client, ownerAccount, smartWalletAddress: swAddr } = 
        await getSmartWalletClient(keyData.key, activeChain, PAYMASTER_ADDRESS);

      setSmartAccountClient(client);
      setEoaAddress(ownerAccount.address);
      setSmartWalletAddress(swAddr);
      setIsWalletReady(true);
      return { client, ownerAccount, swAddr };
    } catch (err) {
      console.error("Failed to init smart wallet:", err);
      toast.error("Wallet error: " + (err.shortMessage || err.message));
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const keyData = await getOrCreatePrivateKey();
        if (!active) return;
        setPrivateKey(keyData.key);
        setKeySource(keyData.source);

        const { smartAccountClient: client, ownerAccount, smartWalletAddress: swAddr } = 
          await getSmartWalletClient(keyData.key, activeChain, PAYMASTER_ADDRESS);

        if (!active) return;
        setSmartAccountClient(client);
        setEoaAddress(ownerAccount.address);
        setSmartWalletAddress(swAddr);
        setIsWalletReady(true);
      } catch (err) {
        console.error("Failed to init smart wallet:", err);
        if (active) toast.error("Wallet error: " + (err.shortMessage || err.message));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCopyAddress = () => {
    if (smartWalletAddress) {
      navigator.clipboard.writeText(smartWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyKey = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      toast.success("Secret Key copied to clipboard! Keep it safe.");
    }
  };

  const handleImportKey = async () => {
    if (!importInput.trim()) {
      toast.error("Please enter a private key.");
      return;
    }
    try {
      await initWallet(importInput.trim());
      setImportInput('');
      setShowImportBox(false);
      toast.success("Successfully switched wallet!");
    } catch (e) {
      toast.error("Failed to import key: " + e.message);
    }
  };

  const handleResetWallet = async () => {
    if (window.confirm("Make sure you have copied your Secret Key first, or your funds will be lost! Generate a new wallet?")) {
      await clearStoredPrivateKey();
      await initWallet();
      toast.success("Generated fresh wallet!");
    }
  };

  const fetchTokenBalances = async () => {
    if (!smartWalletAddress) return;
    try {
      // 1. USDC Balance (6 decimals)
      if (USDC_ADDRESS && USDC_ADDRESS !== '') {
        const usdcBal = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [smartWalletAddress],
        });
        setUsdcBalance((Number(usdcBal) / 10**6).toFixed(2));
      }

      // 2. CADE Token Balance (18 decimals)
      if (CADE_TOKEN_ADDRESS && CADE_TOKEN_ADDRESS !== '') {
        const cadeBal = await publicClient.readContract({
          address: CADE_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [smartWalletAddress],
        });
        setCadeBalance((Number(cadeBal) / 10**18).toFixed(2));

        // Read Vibe Status & Identity
        try {
          const status = await publicClient.readContract({
            address: CADE_TOKEN_ADDRESS,
            abi: cadeTokenArtifact.abi,
            functionName: 'vibeCheck',
            args: [smartWalletAddress],
          });
          setVibeStatus(status);

          const [combo, customTxt] = await publicClient.readContract({
            address: CADE_TOKEN_ADDRESS,
            abi: cadeTokenArtifact.abi,
            functionName: 'getVibe',
            args: [smartWalletAddress],
          });
          setVibeCombo(combo || 'Default Capybara');
          setVibeText(customTxt || '');
        } catch (vibeErr) {
          console.error("Failed to read vibe:", vibeErr);
        }
      }

      // 3. CADE Points Balance (18 decimals)
      if (CADE_POINTS_ADDRESS && CADE_POINTS_ADDRESS !== '') {
        const cadePtBal = await publicClient.readContract({
          address: CADE_POINTS_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [smartWalletAddress],
        });
        setCadePtBalance((Number(cadePtBal) / 10**18).toFixed(2));
      }
    } catch (err) {
      console.error("Failed to read token balances:", err);
    }
  };

  const fetchContractData = async () => {
    try {
      const endTime = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'roundEndTime',
      });
      setRoundEndTime(Number(endTime));

      const guessesCount = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getGuessesCount',
      });
      
      const players = [];
      for (let i = 0; i < Number(guessesCount); i++) {
        const guessEntry = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'currentGuesses',
          args: [BigInt(i)],
        });
        players.push({ player: guessEntry[0], guess: Number(guessEntry[1]) });
      }
      setPlayersList(players);

      // Fetch History via Events
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 199n ? currentBlock - 199n : 0n;

      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: parseAbiItem('event RoundResolved(address indexed winner, uint8 winningNumber, uint256 prize)'),
        fromBlock: fromBlock,
        toBlock: 'latest',
      });
      
      const groupedHistory = [];
      for (const log of logs) {
        const txHash = log.transactionHash;
        const existingRound = groupedHistory.find(h => h.txHash === txHash);
        
        if (existingRound) {
          existingRound.winners.push(log.args.winner);
          existingRound.totalPrize += log.args.prize;
        } else {
          groupedHistory.push({
            txHash: log.transactionHash,
            winners: [log.args.winner],
            winningNumber: Number(log.args.winningNumber),
            totalPrize: log.args.prize,
          });
        }
      }

      // Get the last 5 resolved rounds
      const fetchedHistory = groupedHistory.reverse().slice(0, 5);
      const history = fetchedHistory.map(item => ({
        winners: item.winners,
        winningNumber: item.winningNumber,
        prize: (Number(item.totalPrize) / 10**18).toFixed(2), 
      }));
      setHistoryList(history);

      setLoading(false);
    } catch (err) {
      console.error("Failed to read smart contract:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAllowance = async () => {
      if (smartWalletAddress) {
        try {
          const allowance = await publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [smartWalletAddress, CONTRACT_ADDRESS],
          });
          setHasAllowance(allowance >= BigInt(100000));
        } catch (err) {
          console.error("Failed to check allowance:", err);
        }
      }
    };
    
    checkAllowance();
    const interval = setInterval(checkAllowance, 3000);
    return () => clearInterval(interval);
  }, [smartWalletAddress]);

  const checkTreasuryStatus = async () => {
    if (!TREASURY_ADDRESS || TREASURY_ADDRESS === '') return;
    try {
      const need = await publicClient.readContract({
        address: TREASURY_ADDRESS,
        abi: treasuryArtifact.abi,
        functionName: 'isNeedReplenishGasNow',
      });
      setIsNeedReplenish(Boolean(need));

      const reward = await publicClient.readContract({
        address: TREASURY_ADDRESS,
        abi: treasuryArtifact.abi,
        functionName: 'getReplenishReward',
      });
      const rewardNum = Number(BigInt(reward) / 10n**16n) / 100;
      setReplenishReward(rewardNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

      const cb = await publicClient.readContract({
        address: TREASURY_ADDRESS,
        abi: treasuryArtifact.abi,
        functionName: 'getPlayCashback',
      });
      const cbNum = Number(BigInt(cb) / 10n**16n) / 100;
      setPlayCashback(cbNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch (e) {
      console.debug("Failed checking treasury status:", e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchContractData();
      await fetchTokenBalances();
      await checkTreasuryStatus();
    };
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartWalletAddress]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (!roundEndTime) return;
      const now = Math.floor(Date.now() / 1000);
      const diff = roundEndTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        setIsRoundEnded(true);
      } else {
        setIsRoundEnded(false);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        setTimeLeft(`${mins}:${secs}`);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [roundEndTime]);

  const handleApprove = async () => {
    if (!smartAccountClient) {
      toast.error("Smart Wallet not ready!");
      return;
    }
    try {
      setTxPending(true);
      const hash = await smartAccountClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, BigInt(1000000000)],
      });

      console.log("Approve Tx Hash:", hash);
      toast.success(`Approving USDC... Tx Hash: ${hash.slice(0, 10)}...`);
      // Wait a bit, then refresh
      setTimeout(() => fetchContractData(), 3000);
    } catch (err) {
      console.error("Failed to approve:", err);
      const errorKey = err.cause?.name || err.name;
      toast.error(`Failed: ${ERROR_MESSAGES[errorKey] || err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  // Transaction 1: Submit Guess / Enter Game
  const handleSubmitGuess = async () => {
    if (Number(usdcBalance) < 0.1) {
      toast.error(`Insufficient USDC! You have ${usdcBalance} USDC, but need at least 0.1 USDC to play.`);
      return;
    }

    if (!guessInput || guessInput < 0 || guessInput > 99) {
      toast.error("Please enter a number between 0 and 99!");
      return;
    }

    if (!smartAccountClient) {
      toast.error("Smart Wallet not ready!");
      return;
    }

    try {
      setTxPending(true);

      const hash = await smartAccountClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'submitGuess',
        args: [Number(guessInput)],
      });

      console.log("Tx Hash:", hash);
      toast.success(`Successfully submitted guess ${guessInput}! Tx Hash: ${hash.slice(0, 10)}...`);
      setGuessInput('');
      await fetchContractData();
      await fetchTokenBalances();
    } catch (err) {
      console.error("Failed to submit guess:", err);
      const errorKey = err.cause?.name || err.name;
      toast.error(`Failed: ${ERROR_MESSAGES[errorKey] || err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  const handleSetVibe = async () => {
    if (inputCustomText.length > 30) {
      toast.error("Text cannot exceed 30 characters!");
      return;
    }

    if (Number(usdcBalance) < 0.01) {
      toast.error(`Need at least 0.01 USDC to set identity on-chain! (Balance: ${usdcBalance} USDC)`);
      return;
    }

    if (!smartAccountClient) {
      toast.error("Smart Wallet not ready!");
      return;
    }

    try {
      setTxPending(true);

      // 1. Auto-approve CadeToken to pull 0.01 USDC fee if allowance not yet granted
      if (USDC_ADDRESS && CADE_TOKEN_ADDRESS) {
        const allowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [smartWalletAddress, CADE_TOKEN_ADDRESS],
        });
        if (allowance < BigInt(10000)) {
          toast.loading("Approving 0.01 USDC for identity...", { id: 'vibe-approve' });
          const appHash = await smartAccountClient.writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CADE_TOKEN_ADDRESS, BigInt(1000000000)],
          });
          console.log("Approve Vibe Tx Hash:", appHash);
          await publicClient.waitForTransactionReceipt({ hash: appHash });
          toast.dismiss('vibe-approve');
        }
      }

      // 2. Convert chars to bytes1 (e.g. "C" -> 0x43)
      const modHex = '0x' + inputMod.charCodeAt(0).toString(16).padStart(2, '0');
      const subHex = '0x' + inputSub.charCodeAt(0).toString(16).padStart(2, '0');
      
      const hash = await smartAccountClient.writeContract({
        address: CADE_TOKEN_ADDRESS,
        abi: cadeTokenArtifact.abi,
        functionName: 'setVibe',
        args: [modHex, subHex, inputCustomText],
      });

      console.log("Tx Hash:", hash);
      toast.success(`Identity updated on-chain (0.01 USDC)! Tx Hash: ${hash.slice(0, 10)}...`);
      setTimeout(() => fetchTokenBalances(), 3000);
    } catch (err) {
      console.error("Failed to set vibe:", err);
      const errorKey = err.cause?.name || err.name;
      toast.error(`Failed: ${ERROR_MESSAGES[errorKey] || err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  const handleReplenishGas = async () => {
    if (!smartAccountClient) {
      toast.error("Smart Wallet not ready!");
      return;
    }
    if (!TREASURY_ADDRESS) {
      toast.error("Treasury address not configured!");
      return;
    }
    try {
      setTxPending(true);
      const hash = await smartAccountClient.writeContract({
        address: TREASURY_ADDRESS,
        abi: treasuryArtifact.abi,
        functionName: 'replenishGas',
      });
      console.log("Replenish Gas Hash:", hash);
      toast.success(`Gas Refueled! Claimed +${replenishReward} CADE reward. Tx: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        fetchContractData();
        fetchTokenBalances();
        checkTreasuryStatus();
      }, 3000);
    } catch (err) {
      console.error("Failed to replenish gas:", err);
      const errorKey = err.cause?.name || err.name;
      toast.error(`Replenish failed: ${ERROR_MESSAGES[errorKey] || err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  // Helper for A-Z options
  const MODIFIERS = ["Angry", "Blue", "Chill", "Dope", "Epic", "Fast", "Golden", "Happy", "Icy", "Jolly", "Kind", "Lucky", "Mad", "Nice", "Old", "Poor", "Quick", "Red", "Silver", "Tall", "Ugly", "Vast", "Wild", "Xenon", "Yellow", "Zen"];
  const SUBJECTS = ["Ant", "Bear", "Capybara", "Dog", "Eagle", "Frog", "Goat", "Hawk", "Iguana", "Jaguar", "Koala", "Lion", "Mamba", "Newt", "Owl", "Panda", "Quail", "Rat", "Shark", "Tiger", "Unicorn", "Viper", "Whale", "X-Ray", "Yak", "Zebra"];

  // Transaction 2: Resolve Round
  if (!isWalletReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <img src="./favicon.svg" alt="Cade" className="w-16 h-16 animate-bounce" />
        <p className="font-semibold text-slate-300">Waking up Cade & your wallet...</p>
        <p className="text-xs text-slate-500">100% serverless, zero-gas on Base</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-6 font-sans">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #334155',
        },
      }} />
      <header className="w-full max-w-md flex items-center justify-between py-3 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-2.5">
          <img src="./favicon.svg" alt="Cade" className="w-8 h-8 rounded-full shadow-md" />
          <h1 className="font-extrabold text-lg text-indigo-400 tracking-tight">Cade <span className="text-xs text-slate-500 font-normal">the Chill Capybara</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-slate-900 border border-slate-800 text-emerald-400 py-1 px-2.5 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {keySource === 'telegram_cloud' ? '☁️ TG Cloud' : keySource === 'imported' ? '📥 Imported' : '📱 Local'}
          </span>
        </div>
      </header>

      <main className="w-full max-w-md flex flex-col gap-5">
        {/* User Wallet Info & Balances */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-slate-400">Smart Wallet</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-indigo-300 font-semibold bg-slate-950 py-1 px-2.5 rounded border border-slate-800">
                {smartWalletAddress ? `${smartWalletAddress.slice(0, 6)}...${smartWalletAddress.slice(-4)}` : 'Loading...'}
              </span>
              {smartWalletAddress && (
                <button
                  onClick={handleCopyAddress}
                  className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-1 rounded text-xs transition border border-indigo-500/30 cursor-pointer"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">USDC Balance:</span>
            <span className={`font-bold ${Number(usdcBalance) < 0.1 ? 'text-rose-400' : 'text-blue-400'}`}>
              {formatBalance(usdcBalance)} USDC {Number(usdcBalance) < 0.1 && <span className="text-[10px] font-medium text-rose-300 ml-1 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">Min: 0.1</span>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">CADE Token:</span>
            <span className="font-bold text-amber-400">{formatBalance(cadeBalance)} CADE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cade Points:</span>
            <span className="font-bold text-emerald-400">{formatBalance(cadePtBalance)} CADE-PT</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('game')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'game' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            🎮 Play Game
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            🦫 Capy Profile
          </button>
        </div>

        {/* TAB: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Your Vibe Status</p>
              <p className="text-sm italic text-amber-300">"{vibeStatus}"</p>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-center">
              <p className="text-xs text-slate-400 mb-1">Current Identity</p>
              <p className="text-xl font-black text-indigo-400">{vibeCombo}</p>
              {vibeText && <p className="text-sm mt-2 text-slate-300">"{vibeText}"</p>}
            </div>

            <div className="border-t border-slate-800 pt-5">
              <p className="text-sm font-bold mb-3 text-slate-300">Update Your Identity (A-Z)</p>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Modifier (A-Z)</label>
                  <select 
                    value={inputMod} 
                    onChange={(e) => setInputMod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                  >
                    {MODIFIERS.map((word, i) => { const letter = String.fromCharCode(65 + i); return <option key={`mod-${letter}`} value={letter}>{letter} - {word}</option>; })}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Subject (A-Z)</label>
                  <select 
                    value={inputSub} 
                    onChange={(e) => setInputSub(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                  >
                    {SUBJECTS.map((word, i) => { const letter = String.fromCharCode(65 + i); return <option key={`sub-${letter}`} value={letter}>{letter} - {word}</option>; })}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[10px] uppercase text-slate-500 mb-1 block">Custom Text (Max 30 chars)</label>
                <input 
                  type="text" 
                  maxLength="30"
                  value={inputCustomText}
                  onChange={(e) => setInputCustomText(e.target.value)}
                  placeholder="e.g. loves yuzu bath"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                />
              </div>
              {Number(usdcBalance) < 0.01 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-300 mb-3 flex items-center justify-between gap-2">
                  <span>⚠️ Need at least 0.01 USDC to update identity (Balance: {formatBalance(usdcBalance)} USDC)</span>
                </div>
              )}
              <button
                onClick={handleSetVibe}
                disabled={txPending || Number(usdcBalance) < 0.01}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg disabled:opacity-50 text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {txPending ? 'Updating...' : 'Set Identity On-Chain (0.01 USDC)'}
              </button>
            </div>

            {/* KEY MANAGEMENT & CROSS-DEVICE SYNC */}
            <div className="border-t border-slate-800 pt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-300">🔑 Secret Key & Device Sync</p>
                  <p className="text-xs text-slate-400">
                    {keySource === 'telegram_cloud' 
                      ? '☁️ Automatically synced to your Telegram Cloud Storage' 
                      : '📱 Stored in this device / browser'}
                  </p>
                </div>
              </div>

              {/* Signer EOA & Private Key Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-medium">Signer (EOA):</span>
                  <span className="font-mono text-[11px] text-indigo-300 select-all">
                    {eoaAddress ? `${eoaAddress.slice(0, 6)}...${eoaAddress.slice(-4)}` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Your Private Key:</span>
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="text-indigo-400 hover:text-indigo-300 transition text-[11px]"
                  >
                    {showKey ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <p className="font-mono text-xs text-slate-300 break-all bg-slate-900/60 p-2 rounded border border-slate-800 select-all">
                  {showKey && privateKey ? privateKey : (privateKey ? `${privateKey.slice(0, 10)}••••••••••••••••••••••••••••••••${privateKey.slice(-8)}` : '')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyKey}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold py-2 px-3 rounded-lg text-xs transition border border-amber-500/20"
                  >
                    📋 Copy Secret Key
                  </button>
                  <button
                    onClick={() => setShowImportBox(!showImportBox)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-3 rounded-lg text-xs transition border border-slate-700"
                  >
                    {showImportBox ? 'Close Import' : '📥 Import Key'}
                  </button>
                </div>
              </div>

              {/* Import Custom Key Box */}
              {showImportBox && (
                <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in duration-150">
                  <label className="text-xs text-indigo-300 font-semibold">Paste Your Private Key:</label>
                  <input
                    type="password"
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleImportKey}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition"
                  >
                    📥 Switch / Import Wallet
                  </button>
                </div>
              )}

              {/* Treasury & Paymaster Gas Status */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">⛽ Treasury Gas Status:</span>
                  <span className={`font-semibold ${isNeedReplenish ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isNeedReplenish ? '⚡ Refuel Needed!' : '🟢 Fully Fueled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Refuel Bounty:</span>
                  <span className="font-bold text-amber-300">+{replenishReward} CADE</span>
                </div>
                {isNeedReplenish && (
                  <button
                    onClick={handleReplenishGas}
                    disabled={txPending}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-xs transition mt-1"
                  >
                    {txPending ? 'Refueling...' : '⚡ Trigger Replenish Gas Now'}
                  </button>
                )}
              </div>

              <button
                onClick={handleResetWallet}
                className="text-[11px] text-rose-400/80 hover:text-rose-300 self-center mt-1 transition"
              >
                🔄 Reset / Generate Brand New Account
              </button>
            </div>
          </div>
        )}

        {/* TAB: GAME */}
        {activeTab === 'game' && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Round Status</p>
                  <p className={`text-sm font-semibold flex items-center gap-1.5 mt-0.5 ${isRoundEnded ? 'text-amber-400' : 'text-emerald-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isRoundEnded ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`}></span>
                    {isRoundEnded ? 'Ended (Awaiting Resolve)' : 'In Progress'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Time Left</p>
                  <p className="text-lg font-mono font-bold text-amber-400">{timeLeft}</p>
                </div>
              </div>

              {/* Replenish Gas Banner / Action */}
              {isNeedReplenish && (
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3 animate-pulse">
                  <div>
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>⛽</span> Refuel Paymaster Gas!
                    </p>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Earn <strong className="text-white">+{replenishReward} CADE</strong> reward for refueling!
                    </p>
                  </div>
                  <button
                    onClick={handleReplenishGas}
                    disabled={txPending}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {txPending ? 'Refueling...' : '⚡ Refuel Gas'}
                  </button>
                </div>
              )}

              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800/80 mb-5 relative overflow-hidden">
                <div className="absolute -top-3 -right-3 text-4xl opacity-10">🦫</div>
                <p className="text-xs text-slate-400 mb-1">Total Prize Pot (CADE-PT)</p>
                <p className="text-3xl font-black text-emerald-400">
                  {(playersList.length * 0.1).toFixed(2)} PT
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {playersList.length} {playersList.length === 1 ? 'Player' : 'Players'} in this round
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-300">
                  Guess (0 - 99) • Entry: 0.1 USDC • Cashback: {playCashback} CADE
                </label>

                {Number(usdcBalance) < 0.1 && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center justify-between gap-2">
                    <span>⚠️ Need at least 0.1 USDC (Balance: {formatBalance(usdcBalance)} USDC)</span>
                    <button
                      onClick={handleCopyAddress}
                      className="bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition cursor-pointer"
                    >
                      {copied ? '✓ Copied' : '📋 Copy Smart Wallet'}
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    disabled={txPending || Number(usdcBalance) < 0.1}
                    placeholder="e.g. 42"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-bold text-white focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                  />
                  {hasAllowance ? (
                    <button
                      onClick={handleSubmitGuess}
                      disabled={!guessInput || txPending || Number(usdcBalance) < 0.1}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {txPending ? 'Sending...' : "I'm feeling lucky"}
                    </button>
                  ) : (
                    <button
                      onClick={handleApprove}
                      disabled={txPending}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {txPending ? 'Approving...' : "Approve USDC"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isRoundEnded && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-center text-center">
                <div>
                  <p className="text-sm font-semibold text-emerald-400 mb-1">Time's Up for this Round! ⏳</p>
                  <p className="text-xs text-emerald-200/70">The next person to play will automatically resolve the winner and start a fresh pot!</p>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span>Active Players</span>
                <span className="text-xs font-normal text-slate-500">{playersList.length} Players</span>
              </h3>
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-4">Reading blockchain data...</p>
              ) : playersList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No players yet. Be the first!</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {playersList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg text-xs border border-slate-800/50">
                      <span className="font-mono text-slate-400">
                        {item.player.slice(0, 6)}...{item.player.slice(-4)}
                      </span>
                      <span className="font-bold text-indigo-300">Guess: {item.guess}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Match History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span>Recent Winners</span>
                <span className="text-xs font-normal text-slate-500">History</span>
              </h3>
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-4">Fetching history logs...</p>
              ) : historyList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No rounds have been resolved yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historyList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg text-xs border border-slate-800/50">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-emerald-400 mb-0.5">
                          {item.winners.length > 1 
                            ? <span className="text-amber-400">{item.winners.length} Winners (Tie!)</span>
                            : `Winner: ${item.winners[0].slice(0, 6)}...${item.winners[0].slice(-4)}`
                          }
                        </span>
                        <span className="text-slate-400">
                          Winning #: <span className="font-bold text-white">{item.winningNumber}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block mb-0.5">Prize</span>
                        <span className="font-bold text-emerald-300">+{item.prize} CADE-PT</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
