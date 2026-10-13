import { createPublicClient, http } from 'viem';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { privateKeyToAccount } from 'viem/accounts';

// const isAnvil = import.meta.env.VITE_NETWORK === 'anvil';
const isMainnet = import.meta.env.VITE_NETWORK === 'mainnet';
const PIMLICO_API_KEY = isMainnet ? import.meta.env.VITE_PIMLICO_API_KEY_MAINNET : import.meta.env.VITE_PIMLICO_API_KEY_SEPOLIA;
const ENTRY_POINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"; // v0.7
const SIMPLE_ACCOUNT_FACTORY = "0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985"; // v0.7

export async function getSmartWalletClient(privateKey, activeChain, paymasterAddress) {
  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http()
  });

  // Convert private key directly into a viem account
  const ownerAccount = privateKeyToAccount(privateKey);

  // Derive the ERC-4337 Smart Account deterministically from the owner account
  const simpleAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: ownerAccount,
    factoryAddress: SIMPLE_ACCOUNT_FACTORY,
    entryPoint: { address: ENTRY_POINT, version: "0.7" },
  });

  const bundlerUrl = `https://api.pimlico.io/v2/${activeChain.id}/rpc?apikey=${PIMLICO_API_KEY}`;
  
  const smartAccountClient = createSmartAccountClient({
    account: simpleAccount,
    client: publicClient,
    chain: activeChain,
    bundlerTransport: http(bundlerUrl),
    paymaster: {
      getPaymasterData: async () => ({
        paymaster: paymasterAddress,
        paymasterVerificationGasLimit: 100000n,
        paymasterPostOpGasLimit: 100000n,
        paymasterData: "0x",
      }),
      getPaymasterStubData: async () => ({
        paymaster: paymasterAddress,
        paymasterVerificationGasLimit: 100000n,
        paymasterPostOpGasLimit: 100000n,
        paymasterData: "0x",
      }),
    }
  });

  return {
    smartAccountClient,
    ownerAccount,
    smartWalletAddress: simpleAccount.address
  };
}
