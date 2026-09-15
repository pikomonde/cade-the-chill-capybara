import { usePrivy } from '@privy-io/react-auth';

function App() {
  const { login, logout, authenticated, user, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="animate-pulse">Loading App...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 text-center">
        <h1 className="text-3xl font-extrabold text-indigo-400 mb-2">🦫 Small-Cade</h1>
        <p className="text-slate-400 text-sm mb-6">Chill Capybara Wager Game</p>

        {!authenticated ? (
          <div>
            <p className="text-slate-300 mb-4">Login to start play a Guess Number !</p>
            <button
              onClick={login}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-lg cursor-pointer"
            >
              Login / Connect Wallet
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-slate-900/60 p-3 rounded-xl mb-4 border border-slate-700">
              <p className="text-xs text-slate-400">Your wallet:</p>
              <p className="text-xs font-mono text-indigo-300 break-all">
                {user?.wallet?.address}
              </p>
            </div>

            <button
              onClick={logout}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
