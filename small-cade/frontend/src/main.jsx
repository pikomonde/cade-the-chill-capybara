import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';

// Chain Anvil Local Configuration
const anvilChain = defineChain({
  id: 31337,
  name: 'Anvil Localhost',
  network: 'anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
});

// Privy App ID from dashboard.privy.io
const PRIVY_APP_ID = "cmu2f6oq2045a0cl5panvkswp";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        // loginMethods: ['email', 'wallet', 'google', 'telegram'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        defaultChain: anvilChain,
        supportedChains: [anvilChain],
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>,
);
