import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

function App() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const [guessInput, setGuessInput] = useState('');

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="animate-pulse font-medium text-slate-400">Loading Small-Cade...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-6 font-sans">
      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between py-3 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦫</span>
          <h1 className="font-extrabold text-lg text-indigo-400">Small-Cade</h1>
        </div>
        {authenticated && (
          <button
            onClick={logout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1.5 px-3 rounded-lg border border-slate-700 transition"
          >
            Logout
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md flex flex-col gap-5">
        {!authenticated ? (
          /* Login Card */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-indigo-500/20">
              🎯
            </div>
            <h2 className="text-xl font-bold mb-2">Chill Capybara Wager Game</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Guess number 0 - 99. Fee to join 0.1 USDC per round. The closest guess win 50% of the Pot Prize!
            </p>
            <button
              onClick={login}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              Login & Play Game
            </button>
          </div>
        ) : (
          /* Game Interface */
          <>
            {/* User Wallet Info */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Connected Wallet:</span>
              <span className="font-mono text-indigo-300 font-semibold bg-slate-950 py-1 px-2.5 rounded border border-slate-800">
                {user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : '...'}
              </span>
            </div>

            {/* Round Status Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Round Status</p>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Round In Progress
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Time Left</p>
                  <p className="text-lg font-mono font-bold text-amber-400">04:12</p>
                </div>
              </div>

              {/* Total Pot */}
              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800/80 mb-5">
                <p className="text-xs text-slate-400 mb-1">Total Prize (Pot Prize)</p>
                <p className="text-3xl font-black text-indigo-400">0.50 USDC</p>
                <p className="text-[11px] text-slate-500 mt-1">5 Players join in this round</p>
              </div>

              {/* Input & Place Bet */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-300">Choose your number (0 - 99):</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder="Contoh: 42"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={() => alert(`You choose ${guessInput}! (Will be deployed to Smart Contract)`)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer text-sm"
                  >
                    Guess (0.1 USDC)
                  </button>
                </div>
              </div>
            </div>

            {/* Resolve Round Action */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Round Time ended?</p>
                <p className="text-xs text-slate-400">Anounce winner and get prize!</p>
              </div>
              <button
                onClick={() => alert("Ending round & announce winner!")}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl transition text-xs cursor-pointer"
              >
                Resolve Round
              </button>
            </div>

            {/* Current Bets List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span>List of Player in This Round</span>
                <span className="text-xs font-normal text-slate-500">5 Players</span>
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { address: '0xf39F...2266', guess: 42 },
                  { address: '0x7099...79C8', guess: 17 },
                  { address: '0x3C44...3D7a', guess: 88 },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg text-xs border border-slate-800/50">
                    <span className="font-mono text-slate-400">{item.address}</span>
                    <span className="font-bold text-indigo-300">Guess: {item.guess}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
