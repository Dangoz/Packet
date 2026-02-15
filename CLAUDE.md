# CLAUDE.md

## Project Overview

**Packet** is a P2P payment app with Lucky Split (红包 red envelope) mechanics, built on the Tempo blockchain with Privy identity. The core thesis: crypto-invisible UX where users never see wallet addresses, seed phrases, gas tokens, or any blockchain concepts. Think WeChat Pay — scan QR, money moves instantly.

This is a hackathon project for the **Canteen x Tempo Hackathon** (Track 1: Consumer Payments & Social Finance). Submission deadline: **February 15, 2026, 9:00 AM ET**.

## Core Features

### 1. QR P2P Payments (Foundation Layer)

- Every user has a QR code encoding their Privy identity (phone/email)
- Static QR: anyone can pay you any amount
- Dynamic QR: pre-filled amount (e.g., "$12.50 for lunch")
- Scan → authenticate → confirm → settled instantly via Tempo
- Fee-sponsored so neither party pays gas
- Memos attached to every payment for human-readable context

### 2. Lucky Split / Red Envelope (Viral Growth Mechanic)

- Creator puts money into a pool (e.g., $20 for 5 shares)
- Shares are split randomly — one person might get $8, another $0.50
- Share via link or QR code
- First N people to claim get a random split
- **Randomness is on-chain and verifiable** via smart contract (not server-side)
- The randomness + speed + social bragging is what makes it a game, not just a payment

### 3. Transaction History

- List of sent/received with memos
- Pool claim history (who got what)

## Tech Stack

- **Framework:** Next.js (based on privy-next-tempo starter template)
- **Blockchain:** Tempo Testnet (Moderato)
- **Auth/Wallet:** Privy (email/phone → embedded wallet, no seed phrases)
- **Smart Contract:** Solidity (for pool logic + verifiable on-chain randomness)
- **QR:** Libraries like `react-qr-code` for generation, `html5-qrcode` for scanning

## Tempo Blockchain — Key Primitives

Tempo is a purpose-built L1 blockchain optimized for payments. Key properties that matter for this project:

### Network Details

| Property       | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Network Name   | Tempo Testnet (Moderato)                                                 |
| Chain ID       | 42431                                                                    |
| Currency       | USD                                                                      |
| RPC URL        | `https://rpc.moderato.tempo.xyz`                                         |
| Block Explorer | https://explore.tempo.xyz/                                               |
| Block Time     | ~0.5 seconds                                                             |
| Consensus      | Simplex (BFT), 4 validators on testnet                                   |
| Finality       | Deterministic — once a block is finalized, transactions are irreversible |

### Token Addresses (Testnet)

```
AlphaUSD:  0x20c0000000000000000000000000000000000001
BetaUSD:   0x20c0000000000000000000000000000000000002
ThetaUSD:  0x20c0000000000000000000000000000000000003
pathUSD:   0x20c0000000000000000000000000000000000000
```

### Test Wallets (Community Resource)

Each has 1,000,000 of BetaUSD, AlphaUSD, ThetaUSD, and PathUSD:

```
Wallet 1: 0x031891A61200FedDd622EbACC10734BC90093B2A / 0x2b9e3b8a095940cf3461e27bfb2bebb498df9a6381b76b9f9c48c9bbdc3c8192
Wallet 2: 0xAcF8dBD0352a9D47135DA146EA5DbEfAD58340C4 / 0xf3c009932cfe5e0b20db6c959e28e3546047cf70309d0f2ac5d38ee14527739a
Wallet 3: 0x41A75fc9817AF9F2DB0c0e58C71Bc826339b3Acb / 0xf804bb2ff55194ce6a62de31219d08fff6fd67fbaa68170e3dc8234035cad108
Wallet 4: 0x88FB1167B01EcE2CAEe65c4E193Ba942D6F73d70 / 0xb0803108bb5ce052f7f50655d0078af5c8edfe48a6ffa7b3e8b2add0292cffc9
Wallet 5: 0xe945797ebC84F1953Ff8131bC29277e567b881D4 / 0x097761d893afc5d6669c0b99c8d6ca9ce1c2fa88bd84de5a58d28713cd6a7121
```

### Primitives We Use

**Instant Finality (~0.5s):** Simplex BFT consensus finalizes blocks in ~0.5s. The `transferSync` / `placeSync` SDK methods return only after the block is finalized. No "pending" state — tap → done.

**Fee Sponsorship:** Set `feePayer: true` to have the Tempo testnet sponsor cover gas. Users with zero balance can transact. This is critical — claimers of red envelopes should pay nothing.

**Transaction Memos (32 bytes):** Every transfer carries an on-chain 32-byte memo via `TransferWithMemo` event. Use `stringToHex` + `pad({ size: 32 })` from viem. We use memos for pool IDs, payment notes, claim references.

**Parallel Transactions (2D Nonces):** Multiple simultaneous transactions from the same account using different `nonceKey` values. Important for multiple people claiming from a pool simultaneously without blocking each other.

**Batch Transactions (Atomic):** Multiple calls in one transaction — all succeed or all fail. Potentially useful for atomic pool creation (approve + deposit).

## Privy Integration

Privy provides email/phone → wallet mapping. Users sign up with phone or email, wallets are created automatically. **This is required for Track 1.**

### Server-Side User Lookup (find or create user by identifier)

```typescript
// POST /api/find — resolves email/phone to wallet address
// If user doesn't exist, creates one with an embedded wallet
const user = await privy.users().getByPhoneNumber({ number: identifier })
// or
const user = await privy.users().getByEmailAddress({ address: identifier })
// If not found, create:
await privy.users().create({
  linked_accounts: [{ type: 'phone', number: identifier }],
  wallets: [{ chain_type: 'ethereum' }],
})
```

### Client-Side Wallet Access

```typescript
import { toViemAccount, useWallets } from '@privy-io/react-auth'
const { wallets } = useWallets()
const wallet = wallets[0]
const provider = await wallet.getEthereumProvider()
```

### Client-Side Transfer (useSend hook pattern)

```typescript
const client = createWalletClient({
  account: wallet.address as Address,
  chain: tempo({ feeToken: pathUsd }),
  transport: custom(provider),
})
  .extend(walletActions)
  .extend(tempoActions())

const { receipt } = await client.token.transferSync({
  to: recipientAddress,
  amount: parseUnits(amount, 6),
  memo: stringToHex(memo || ''),
  token: pathUsd,
})
```

### Fee Sponsorship

```typescript
const { receipt } = await client.token.transferSync({
  amount: parseUnits('100', 6),
  to: recipientAddress,
  token: pathUsd,
  feePayer: true, // Uses https://sponsor.testnet.tempo.xyz
})
```

## Smart Contract — Red Envelope Pool

### Architecture Decision

We chose a smart contract approach over server-side pool management for **verifiable on-chain randomness**. Every split is provably fair and auditable on-chain. This is a strong differentiator for hackathon judging.

### Randomness Approach

**Primary: Future block hash + claim data**

```
randomSeed = keccak256(abi.encodePacked(blockhash(commitBlock + claimIndex), poolId, msg.sender))
```

- `commitBlock` is recorded at pool creation time
- Each claimer gets a different seed (different `claimIndex` and `msg.sender`)
- Uses a future block hash that didn't exist when the pool was created → creator can't predict splits
- Fully on-chain, fully verifiable

**Fallback: prevrandao-based**

```
randomSeed = keccak256(abi.encodePacked(poolId, block.timestamp, block.prevrandao, msg.sender, claimIndex))
```

- Simpler, single-step computation
- Uses EVM's built-in randomness beacon
- Adequate for small-stakes social game

Note: Chainlink VRF is **NOT available on Tempo testnet** — do not attempt to use it.

### Random Split Algorithm (WeChat-style)

For a pool of totalAmount with N shares:

- Each claimer gets a random amount between minAmount and (remaining / remainingShares × 2)
- This ensures everyone gets at least a minimum but variance is high
- The last person gets whatever remains
- Wide variance is what makes it fun (someone gets $8, someone gets $0.50)

### Contract Skeleton

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITIP20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PacketPool {
    struct Pool {
        address creator;
        address token;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint8 totalShares;
        uint8 claimedShares;
        uint256 commitBlock;
        bytes32 memo;
        bool exists;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;
    mapping(bytes32 => mapping(uint8 => address)) public claimants;
    mapping(bytes32 => mapping(uint8 => uint256)) public claimAmounts;

    event PoolCreated(bytes32 indexed poolId, address indexed creator, uint256 amount, uint8 shares);
    event Claimed(bytes32 indexed poolId, address indexed claimer, uint256 amount, uint8 claimIndex);

    function createPool(bytes32 poolId, uint8 shares, bytes32 memo, address token, uint256 amount) external {
        // transferFrom creator → contract
        // store pool with commitBlock = block.number
    }

    function claim(bytes32 poolId) external {
        // verify pool exists, has shares, caller hasn't claimed
        // compute random amount from on-chain data
        // transfer to claimer
        // emit Claimed event
    }
}
```

### TIP-20 Token Interface

Tempo uses TIP-20 tokens (ERC-20 compatible extensions). The standard ERC-20 interface works. Additionally, `transferWithMemo(address to, uint256 amount, bytes32 memo)` is available for memo-tagged transfers.

## Viem / Tempo SDK Setup

```typescript
import { createClient, http, publicActions, walletActions } from 'viem'
import { tempoModerato } from 'viem/chains'
import { tempoActions } from 'viem/tempo'

// For server-side operations (e.g., pool wallet management)
const client = createClient({
  account: privateKeyToAccount('0x...'),
  chain: tempoModerato,
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions)
  .extend(tempoActions())
```

### Watching Events

```typescript
client.watchEvent({
  address: tokenAddress,
  event: {
    type: 'event',
    name: 'TransferWithMemo',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256' },
      { name: 'memo', type: 'bytes32', indexed: true },
    ],
  },
  onLogs: (logs) => {
    /* handle */
  },
})
```

## UX Principles

- **Zero crypto exposure:** No wallet addresses, no gas concepts, no token names, no network selection visible to users. Users see dollar amounts, phone numbers, and names.
- **Phone number = identity:** All interactions reference email or phone, never 0x addresses.
- **Instant feedback:** Every action (payment, claim) should resolve in <1 second with clear visual confirmation. No "processing" spinners lasting more than a moment.
- **The reveal moment matters:** When claiming a Lucky Split, the animation of revealing your random amount is the core emotional moment. Invest in this UX — it's what makes it feel like a game vs. a payment.
- **Minimum viable social:** Show who claimed what amount. The distribution creates conversation ("I got the big share!").

## Hackathon Judging Criteria

| Criteria                 | Weight | Our Angle                                                                                |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------- |
| Technical Implementation | 30%    | Real on-chain transactions, smart contract with verifiable randomness, Privy integration |
| Innovation               | 25%    | WeChat red envelope model on crypto — "crypto-invisible" UX, verifiable fairness         |
| User Experience          | 20%    | Phone sign-in, QR scan-to-pay, animated reveal, zero blockchain concepts exposed         |
| Ecosystem Impact         | 15%    | Demonstrates Tempo's consumer payment thesis, viral P2P adoption model                   |
| Presentation             | 10%    | Live demo: sign up → scan QR → money moves → create Lucky Split → friends claim          |

## Demo Script (for presentation)

1. "I sign up with my phone number. That's it, I'm in."
2. "Here's my QR code. [Second device scans]. I just sent $50 in two seconds. No wallet, no gas, no crypto."
3. "Now I create a Lucky Split: $20, 4 shares." [Show pool creation, transaction on explorer]
4. "Friends claim their shares — random distribution. Alice got $8.50, Bob got $0.72. Provably fair, verifiable on-chain."
5. "Every payment, every split — real stablecoin settlement on Tempo, instant, zero fees. The user never sees a blockchain."

## Project Structure Notes

- Built on top of the `privy-next-tempo` starter template (https://github.com/aashidham/privy-next-tempo)
- Next.js app router
- Privy for authentication and wallet management
- Smart contracts should be in a `/contracts` directory, deployable via Foundry or Hardhat
- Keep the primary token as pathUSD (`0x20c0000000000000000000000000000000000000`, 6 decimals)

## Key Dependencies

```
tempo.ts          — Tempo SDK
viem              — Ethereum/EVM client library
@privy-io/react-auth  — Client-side Privy auth
@privy-io/node    — Server-side Privy user management
@tanstack/react-query — Data fetching/caching
```

## Common Patterns

### Resolving email/phone to wallet address

Always go through the `/api/find` endpoint which uses Privy server-side SDK to look up or create users. Never expose wallet addresses in the UI.

### Memo encoding

```typescript
import { stringToHex, pad } from 'viem'
const memo = pad(stringToHex('pool:abc123'), { size: 32 })
```

Memos are 32 bytes max. Use prefixes for namespacing: `pool:`, `claim:`, `pay:`.

### Amount handling

All token amounts use 6 decimals. Use `parseUnits(amount, 6)` for encoding and `formatUnits(amount, 6)` for display.

### Fee sponsorship

Always use `feePayer: true` for user-facing transactions. Users should never need to hold tokens for gas.
