import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, custom, http, parseAbiItem, parseAbi } from 'viem';
import { defineChain } from 'viem';
import { baseSepolia } from 'viem/chains';
import gameArtifact from './GameGuessNumberABI.json';
import cadeTokenArtifact from './CadeTokenABI.json';

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
const activeChain = isAnvil ? anvilChain : baseSepolia;

const CONTRACT_ADDRESS = isAnvil 
  ? import.meta.env.VITE_GAME_GUESS_NUMBER_ADDRESS_ANVIL 
  : import.meta.env.VITE_GAME_GUESS_NUMBER_ADDRESS_SEPOLIA;
const CONTRACT_ABI = gameArtifact.abi;

const USDC_ADDRESS = isAnvil 
  ? import.meta.env.VITE_USDC_ADDRESS_ANVIL 
  : import.meta.env.VITE_USDC_ADDRESS_SEPOLIA;

const CADE_TOKEN_ADDRESS = isAnvil 
  ? import.meta.env.VITE_CADE_TOKEN_ADDRESS_ANVIL 
  : import.meta.env.VITE_CADE_TOKEN_ADDRESS_SEPOLIA;

const CADE_POINTS_ADDRESS = isAnvil 
  ? import.meta.env.VITE_CADE_POINTS_ADDRESS_ANVIL 
  : import.meta.env.VITE_CADE_POINTS_ADDRESS_SEPOLIA;

const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)'
]);

const publicClient = createPublicClient({
  chain: activeChain,
  transport: isAnvil ? http('http://127.0.0.1:8545') : http(),
});

function App() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
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
  const [cadeBalance, setCadeBalance] = useState('0');
  const [cadePtBalance, setCadePtBalance] = useState('0');

  // Vibe State
  const [vibeStatus, setVibeStatus] = useState('');
  const [vibeCombo, setVibeCombo] = useState('');
  const [vibeText, setVibeText] = useState('');
  const [inputMod, setInputMod] = useState('C');
  const [inputSub, setInputSub] = useState('C');
  const [inputCustomText, setInputCustomText] = useState('');

  const activeWallet = wallets[0] || user?.wallet;

  const handleCopyAddress = () => {
    if (activeWallet?.address) {
      navigator.clipboard.writeText(activeWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchTokenBalances = async () => {
    if (!activeWallet?.address) return;
    try {
      if (CADE_TOKEN_ADDRESS && CADE_TOKEN_ADDRESS !== '') {
        const cadeBal = await publicClient.readContract({
          address: CADE_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [activeWallet.address],
        });
        setCadeBalance((Number(cadeBal) / 10**18).toFixed(2));
  
        // Fetch Vibe
        const checkResult = await publicClient.readContract({
          address: CADE_TOKEN_ADDRESS,
          abi: cadeTokenArtifact.abi,
          functionName: 'vibeCheck',
          args: [activeWallet.address],
        });
        setVibeStatus(checkResult);
  
        const vibeData = await publicClient.readContract({
          address: CADE_TOKEN_ADDRESS,
          abi: cadeTokenArtifact.abi,
          functionName: 'getVibe',
          args: [activeWallet.address],
        });
        setVibeCombo(vibeData[0]);
        setVibeText(vibeData[1]);
      }

      if (CADE_POINTS_ADDRESS && CADE_POINTS_ADDRESS !== '') {
        const ptBal = await publicClient.readContract({
          address: CADE_POINTS_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [activeWallet.address],
        });
        setCadePtBalance((Number(ptBal) / 10**18).toFixed(2));
      }
      
    } catch (err) {
      console.error("Failed to fetch balances or vibes:", err);
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
      const fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;

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
      if (activeWallet?.address) {
        try {
          const allowance = await publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [activeWallet.address, CONTRACT_ADDRESS],
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
  }, [activeWallet?.address]);

  useEffect(() => {
    const loadData = async () => {
      await fetchContractData();
      await fetchTokenBalances();
    };
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWallet?.address]);

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
    const currentWallet = wallets[0];
    if (!currentWallet) {
      toast.error("Wallet not connected!");
      return;
    }

    try {
      setTxPending(true);
      const provider = await currentWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: currentWallet.address,
        chain: activeChain,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, BigInt(1000000000)], // Approve a large amount so they don't have to do it every time
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
    if (!guessInput || guessInput < 0 || guessInput > 99) {
      toast.error("Please enter a number between 0 and 99!");
      return;
    }

    const currentWallet = wallets[0];
    if (!currentWallet) {
      toast.error("Wallet not connected!");
      return;
    }

    try {
      setTxPending(true);
      const provider = await currentWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: currentWallet.address,
        chain: activeChain,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
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

    const currentWallet = wallets[0];
    if (!currentWallet) {
      toast.error("Wallet not connected!");
      return;
    }

    try {
      setTxPending(true);
      const provider = await currentWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: currentWallet.address,
        chain: activeChain,
        transport: custom(provider),
      });

      // Convert chars to bytes1 (e.g. "C" -> 0x43)
      const modHex = '0x' + inputMod.charCodeAt(0).toString(16).padStart(2, '0');
      const subHex = '0x' + inputSub.charCodeAt(0).toString(16).padStart(2, '0');

      const hash = await walletClient.writeContract({
        address: CADE_TOKEN_ADDRESS,
        abi: cadeTokenArtifact.abi,
        functionName: 'setVibe',
        args: [modHex, subHex, inputCustomText],
      });

      console.log("Tx Hash:", hash);
      toast.success(`Successfully updated Vibe! Tx Hash: ${hash.slice(0, 10)}...`);
      setTimeout(() => fetchTokenBalances(), 3000);
    } catch (err) {
      console.error("Failed to set vibe:", err);
      toast.error(`Failed: ${err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  // Helper for A-Z options
  const MODIFIERS = ["Angry", "Blue", "Chill", "Dope", "Epic", "Fast", "Golden", "Happy", "Icy", "Jolly", "Kind", "Lucky", "Mad", "Nice", "Old", "Poor", "Quick", "Red", "Silver", "Tall", "Ugly", "Vast", "Wild", "Xenon", "Yellow", "Zen"];
  const SUBJECTS = ["Ant", "Bear", "Capybara", "Dog", "Eagle", "Frog", "Goat", "Hawk", "Iguana", "Jaguar", "Koala", "Lion", "Mamba", "Newt", "Owl", "Panda", "Quail", "Rat", "Shark", "Tiger", "Unicorn", "Viper", "Whale", "X-Ray", "Yak", "Zebra"];


  // Transaction 2: Resolve Round

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="animate-pulse font-medium text-slate-400">Loading Small-Cade...</p>
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
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦫</span>
          <h1 className="font-extrabold text-lg text-indigo-400">Small-Cade</h1>
        </div>
        {authenticated && (
          <button
            onClick={logout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1.5 px-3 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Logout
          </button>
        )}
      </header>

      <main className="w-full max-w-md flex flex-col gap-5">
        {!authenticated ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-indigo-500/20">
              🎯
            </div>
            <h2 className="text-xl font-bold mb-2">Chill Capybara Guess Number Game</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Guess a number from 0-99. Entry is 0.1 USDC. Get 100 CADE cashback per play! The closest guess wins Cade Points (CADE-PT) pot prize!
            </p>
            <button
              onClick={login}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              Login & Play
            </button>
          </div>
        ) : !activeWallet?.address ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
            <h2 className="text-xl font-bold mb-4">You need a Wallet</h2>
            <p className="text-slate-400 text-sm mb-6">
              It looks like you logged in without a wallet. Please create an embedded wallet to play.
            </p>
            <button
              onClick={createWallet}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg cursor-pointer"
            >
              Create Embedded Wallet
            </button>
          </div>
        ) : (
          <>
            {/* User Wallet Info & Balances */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-sm flex flex-col gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Wallet</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-300 font-semibold bg-slate-950 py-1 px-2.5 rounded border border-slate-800">
                    {activeWallet?.address ? `${activeWallet.address.slice(0, 6)}...${activeWallet.address.slice(-4)}` : 'No Wallet'}
                  </span>
                  {activeWallet?.address && (
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
                <span className="text-slate-400">CADE Token:</span>
                <span className="font-bold text-amber-400">{cadeBalance} CADE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cade Points:</span>
                <span className="font-bold text-emerald-400">{cadePtBalance} CADE-PT</span>
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
                  <button
                    onClick={handleSetVibe}
                    disabled={txPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg disabled:opacity-50 text-sm"
                  >
                    {txPending ? 'Updating...' : 'Set Identity On-Chain'}
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
                      Guess (0 - 99) • Entry: 0.1 USDC • Cashback: 100 CADE
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={guessInput}
                        onChange={(e) => setGuessInput(e.target.value)}
                        disabled={txPending}
                        placeholder="e.g. 42"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-bold text-white focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                      />
                      {hasAllowance ? (
                        <button
                          onClick={handleSubmitGuess}
                          disabled={!guessInput || txPending || !wallets[0]}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {txPending ? 'Sending...' : "I'm feeling lucky"}
                        </button>
                      ) : (
                        <button
                          onClick={handleApprove}
                          disabled={txPending || !wallets[0]}
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

          </>
        )}
      </main>
    </div>
  );
}

export default App;
