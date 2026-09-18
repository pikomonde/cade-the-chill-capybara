import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, custom, http, parseAbiItem, parseAbi } from 'viem';
import { defineChain } from 'viem';
import { baseSepolia } from 'viem/chains';
import gameArtifact from './GameGuessNumberABI.json';

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
  ? import.meta.env.VITE_CONTRACT_ADDRESS_ANVIL 
  : import.meta.env.VITE_CONTRACT_ADDRESS_SEPOLIA;
const CONTRACT_ABI = gameArtifact.abi;

const USDC_ADDRESS = isAnvil 
  ? import.meta.env.VITE_USDC_ADDRESS_ANVIL 
  : import.meta.env.VITE_USDC_ADDRESS_SEPOLIA;
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

  const activeWallet = wallets[0] || user?.wallet;

  const handleCopyAddress = () => {
    if (activeWallet?.address) {
      navigator.clipboard.writeText(activeWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

      const betsCount = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getBetsCount',
      });

      const players = [];
      for (let i = 0; i < Number(betsCount); i++) {
        const bet = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'currentBets',
          args: [BigInt(i)],
        });
        players.push({ player: bet[0], guess: Number(bet[1]) });
      }
      setPlayersList(players);

      // Fetch History via Events
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: parseAbiItem('event RoundResolved(address indexed winner, uint8 winningNumber, uint256 prize)'),
        fromBlock: 'earliest',
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
        prize: (Number(item.totalPrize) / 10**6).toFixed(2), // Convert from 6 decimals
      }));
      setHistoryList(history);

      setLoading(false);
    } catch (err) {
      console.error("Failed to read smart contract:", err);
      setLoading(false);
    }
  };

  // Fix: Check allowance dynamically whenever activeWallet changes
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
    };
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
      toast.error(`Failed: ${err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  // Transaction 1: Place Bet / Enter Game
  const handlePlaceBet = async () => {
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
        functionName: 'placeBet',
        args: [Number(guessInput)],
      });

      console.log("Tx Hash:", hash);
      toast.success(`Successfully submitted guess ${guessInput}! Tx Hash: ${hash.slice(0, 10)}...`);
      setGuessInput('');
      await fetchContractData();
    } catch (err) {
      console.error("Failed to place bet:", err);
      toast.error(`Failed: ${err.shortMessage || err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  // Transaction 2: Resolve Round
  // REMOVED: Auto-resolve is now handled within handlePlaceBet in the smart contract

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
              Guess a number from 0-99. Entry is 0.1 USDC. The closest guess wins Cade Point (ptCADE) pot prize!
            </p>
            <button
              onClick={login}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              Login & Play
            </button>
          </div>
        ) : (
          <>
            {/* User Wallet Info with Copy Button */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Connected Wallet:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-indigo-300 font-semibold bg-slate-950 py-1 px-2.5 rounded border border-slate-800">
                  {activeWallet?.address ? `${activeWallet.address.slice(0, 6)}...${activeWallet.address.slice(-4)}` : 'No Wallet'}
                </span>
                {activeWallet?.address && (
                  <button
                    onClick={handleCopyAddress}
                    className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-1 rounded text-[11px] transition border border-indigo-500/30 cursor-pointer"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                )}
              </div>
            </div>

            {!wallets[0] && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 text-center">
                <p className="text-xs text-indigo-300 mb-2">You need a Web3 Wallet to play.</p>
                <button
                  onClick={createWallet}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg cursor-pointer"
                >
                  + Create Web3 Wallet Now
                </button>
              </div>
            )}

            {/* Round Status Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
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

              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800/80 mb-5">
                <p className="text-xs text-slate-400 mb-1">Total Prize Pot</p>
                <p className="text-3xl font-black text-indigo-400">
                  {(playersList.length * 0.1).toFixed(2)} USDC
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {playersList.length} {playersList.length === 1 ? 'Player' : 'Players'} in this round
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-300">Choose Your Guess (0 - 99):</label>
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
                      onClick={handlePlaceBet}
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
                        <span className="font-bold text-indigo-300">+{item.prize} USDC</span>
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