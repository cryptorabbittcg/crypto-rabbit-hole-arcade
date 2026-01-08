# Glyph Wallet Access & Integration

## Overview

The Glyph wallet is fully integrated with wagmi/viem, providing standard wallet functionality for:
- Viewing wallet data and balances
- Sending transactions and transferring $APE tokens
- Interacting with smart contracts
- Accessing wallet through Glyph ecosystem protocols

## Architecture

```
QueryClientProvider
  └─> WagmiProvider (wagmi v2 + viem)
      └─> GlyphWalletProvider
          └─> App Components
```

The `GlyphWalletProvider` wraps the `WagmiProvider`, which means the connected Glyph wallet is accessible through **all standard wagmi hooks**.

## Wallet Accessibility

### ✅ Standard wagmi hooks work with Glyph wallet:

1. **`useAccount()`** - Get connected wallet address and connection status
   ```typescript
   import { useAccount } from "wagmi"
   const { address, isConnected } = useAccount()
   ```

2. **`useBalance()`** - Get native token (APE) balance
   ```typescript
   import { useBalance } from "wagmi"
   const { data: balance } = useBalance({ address })
   ```

3. **`useReadContract()`** - Read contract data (e.g., ERC20 balance)
   ```typescript
   import { useReadContract } from "wagmi"
   const { data } = useReadContract({
     address: APE_ADDRESS,
     abi: ERC20_ABI,
     functionName: "balanceOf",
     args: [address],
   })
   ```

4. **`useWriteContract()`** - Send transactions to contracts
   ```typescript
   import { useWriteContract } from "wagmi"
   const { writeContract } = useWriteContract()
   // Can send $APE transfers, interact with contracts, etc.
   ```

5. **`useWalletClient()`** - Get wallet client for advanced operations
   ```typescript
   import { useWalletClient } from "wagmi"
   const { data: walletClient } = useWalletClient()
   // Full wallet access for custom transactions
   ```

6. **`useSendTransaction()`** - Send native token transfers
   ```typescript
   import { useSendTransaction } from "wagmi"
   const { sendTransaction } = useSendTransaction()
   // Send APE tokens directly
   ```

## Balance Fetching

### Current Implementation

- **APE Token Balance**: Fetched using `getApeBalance()` utility
  - Uses viem's `createPublicClient` to read ERC20 `balanceOf`
  - Automatically fetched when wallet connects
  - Displayed in profile menu

- **Native APE Balance**: Available via `useBalance()` hook
  - Returns native chain token balance
  - Works with connected Glyph wallet

## Transaction Capabilities

### ✅ The Glyph wallet supports:

1. **Native Token Transfers** - Send APE tokens using `useSendTransaction()`
2. **ERC20 Transfers** - Transfer tokens using `useWriteContract()` with ERC20 ABI
3. **Contract Interactions** - Call any contract function via `useWriteContract()`
4. **Batch Transactions** - Supported through wagmi's transaction batching

### Example: Transfer $APE Tokens

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits } from "viem"
import { APE_ADDRESS } from "@/adapters/well-known"

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

function TransferButton() {
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleTransfer = () => {
    writeContract({
      address: APE_ADDRESS,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [
        "0x...", // recipient address
        parseUnits("100", 18), // amount in APE (18 decimals)
      ],
    })
  }

  return <button onClick={handleTransfer}>Send 100 APE</button>
}
```

## Glyph Ecosystem Integration

### ✅ Full Glyph Protocol Support

The wallet connection via `GlyphWalletProvider` provides:

1. **Standard Wallet Interface** - Works with all wagmi/viem tools
2. **Glyph Native Features** - Access to Glyph-specific functionality
3. **Cross-App Compatibility** - Wallet works across Glyph ecosystem apps
4. **Transaction Signing** - Full support for signing and sending transactions

### Wallet Data Access

- **Address**: Available via `useAccount().address`
- **Chain**: ApeChain Mainnet (chainId: 33139)
- **Balance**: Native APE + ERC20 tokens via standard hooks
- **Transaction History**: Accessible through wagmi's transaction hooks

## Verification

To verify the wallet is accessible:

1. **Check Connection**: `useAccount().isConnected` should be `true`
2. **Check Address**: `useAccount().address` should show Glyph wallet address
3. **Check Balance**: `useBalance()` should return native APE balance
4. **Test Transaction**: Use `useWriteContract()` to send a test transaction

## Current Status

✅ **Wallet Connection**: Working via GlyphWalletProvider  
✅ **Address Access**: Available via useAccount()  
✅ **Balance Fetching**: Implemented and active  
✅ **Transaction Support**: Available via wagmi hooks  
✅ **Contract Interactions**: Supported through wagmi/viem  

The Glyph wallet is **fully accessible** through wagmi's standard interface, allowing players to:
- View their wallet data and balances
- Transfer $APE tokens using standard protocols
- Interact with smart contracts
- Access all Glyph ecosystem features

