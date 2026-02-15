# CLAUDE.md

## Project Overview

**Packet** is a P2P payment app with Lucky Split (红包 red envelope) mechanics, built on the Tempo blockchain with Privy identity. The core thesis: crypto-invisible UX where users never see wallet addresses, seed phrases, gas tokens, or any blockchain concepts. Think WeChat Pay — scan QR, money moves instantly.

This is a hackathon project for the **Canteen x Tempo Hackathon** (Track 1: Consumer Payments & Social Finance). Submission deadline: **February 15, 2026, 9:00 AM ET**.

## Implementation Status

### What's Built

| Layer              | Status | Details                                                                                                                         |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Smart Contract** | Done   | `PacketPool.sol` — pool creation, claiming, on-chain randomness, WeChat-style splits. 23 tests passing (including fuzz).        |
| **Auth & Wallet**  | Done   | Privy email/phone login → auto-created embedded wallet. `PrivyProvider.tsx` configured.                                         |
| **P2P Send**       | Done   | Single send (`useSend` hook) and batch send (`useBatchSendRaw` hook) with memos.                                                |
| **Balance**        | Done   | `useBalance` hook polls pathUSD balance every 10s.                                                                              |
| **Tx History**     | Done   | `useTransactionHistory` hook + `/api/transactions` route. Fetches from Tempo explorer, decodes ERC20 transfer calldata & memos. |
| **User Lookup**    | Done   | `/api/find` route resolves phone/email → wallet address via Privy server SDK. Creates user if not found.                        |
| **QR Receive**     | Done   | `ReceiveModal` generates QR code of wallet address via `qrcode.react`.                                                          |
| **Landing Page**   | Done   | Hero, features grid, Lucky Split explainer, CTA.                                                                                |
| **Login Page**     | Done   | Split-screen login (branding left, Privy login right).                                                                          |
| **Wallet UI**      | Done   | Template page with balance card, send/receive/batch modals, transaction history.                                                |

### What's NOT Built Yet

| Feature                      | Notes                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Lucky Split frontend UI**  | No pool creation form, no claim page, no share link generation. Contract is ready but no frontend calls it.               |
| **QR scanning**              | `qrcode.react` generates QR codes, but there is NO scanning library installed. `html5-qrcode` is not a dependency.        |
| **Dynamic QR**               | No pre-filled amount QR codes. Current QR just encodes wallet address.                                                    |
| **Claim reveal animation**   | The "reveal moment" UX for showing random amount is not implemented.                                                      |
| **Pool expiration / refund** | Contract has no mechanism for creator to reclaim unclaimed funds.                                                         |
| **Pool cancellation**        | Once created, a pool cannot be cancelled. Funds are locked until all shares are claimed.                                  |
| **Contract deployment**      | Deployed to Tempo Moderato testnet at `0x3886199015edfB471D93C01519918976F211E3dF`. Address stored in `src/constants.ts`. |

## Project Structure

```
privy-tempo/
├── CLAUDE.md
├── package.json                    # Next.js 15.5.7, pnpm
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs              # Tailwind v4
├── eslint.config.mjs
├── .prettierrc.json                # single quotes, no semicolons, 120 width
├── .env.local                      # NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_SECRET
│
├── contracts/                      # Foundry project
│   ├── foundry.toml
│   ├── .env                        # TEMPO_RPC_URL, PRIVATE_KEY, FEE_TOKEN
│   ├── src/
│   │   └── PacketPool.sol          # Main contract (217 lines)
│   ├── test/
│   │   └── PacketPool.t.sol        # 23 tests (510 lines)
│   ├── script/
│   │   └── PacketPool.s.sol        # Deployment script (23 lines)
│   ├── lib/
│   │   ├── forge-std/              # Foundry test framework
│   │   └── tempo-std/              # Tempo interfaces (ITIP20, StdTokens, StdPrecompiles)
│   └── out/                        # Compiled artifacts
│
└── src/
    ├── constants.ts                # pathUsd address
    ├── providers/
    │   └── PrivyProvider.tsx        # Privy config + React Query
    ├── lib/
    │   └── utils.ts                # cn() classname utility
    ├── hooks/
    │   ├── useBalance.ts           # pathUSD balance polling (10s)
    │   ├── useSend.ts              # Single transfer with memo via Tempo SDK
    │   ├── useBatchSendRaw.ts      # Atomic batch send (raw tx signing)
    │   └── useTransactionHistory.ts # Tx history from Tempo explorer API
    ├── components/
    │   ├── index.ts                # Barrel export
    │   ├── WalletContainer.tsx     # Layout wrapper with motion
    │   ├── BalanceCard.tsx         # Balance display
    │   ├── UserPill.tsx            # Top-right user dropdown
    │   ├── ActionButtonsGrid.tsx   # Send/Receive/Batch buttons
    │   ├── SendModal.tsx           # Send form (recipient, amount, memo)
    │   ├── ReceiveModal.tsx        # QR code + address copy
    │   ├── BatchSendModal.tsx      # Multi-recipient atomic batch
    │   ├── RecentActivity.tsx      # Transaction list
    │   ├── TransactionItem.tsx     # Single tx row
    │   ├── Modal.tsx               # Animated modal base
    │   ├── GlassCard.tsx           # Frosted glass container
    │   ├── Input.tsx               # Styled text input
    │   ├── LiquidGlassButton.tsx   # Glass button with motion
    │   ├── LoginView.tsx           # Login prompt
    │   ├── Skeleton*.tsx           # Loading placeholders
    │   ├── inspired/               # Packet-themed components (ProfilePill, PacketCard, etc.)
    │   ├── backgrounds/            # Grid/cross background components
    │   └── ui/                     # shadcn base (button, input, badge, card, popover, separator)
    └── app/
        ├── layout.tsx              # Root layout with Privy provider, Geist fonts
        ├── globals.css             # Design tokens, Tailwind theme, Packet utilities
        ├── page.tsx                # Landing page (437 lines)
        ├── login/page.tsx          # Login page (266 lines)
        ├── app/page.tsx            # Authenticated dashboard stub (35 lines)
        ├── template/page.tsx       # Main wallet interface (134 lines)
        └── api/
            ├── find/route.ts       # POST: resolve phone/email → wallet address via Privy
            └── transactions/route.ts # GET: fetch tx history from Tempo explorer
```

## Core Features

### 1. QR P2P Payments (Foundation Layer)

- Every user has a QR code encoding their wallet address (generated via `qrcode.react`)
- Static QR: anyone can pay you any amount
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

| Layer          | Technology                             | Version                      |
| -------------- | -------------------------------------- | ---------------------------- |
| Framework      | Next.js (App Router, Turbopack)        | 15.5.7                       |
| Runtime        | React                                  | 19.1.4                       |
| Blockchain     | Tempo Testnet (Moderato)               | Chain ID 42431               |
| Auth/Wallet    | Privy (email/phone → embedded wallet)  | react-auth 3.8.1, node 0.6.2 |
| EVM Client     | viem                                   | 2.41.2                       |
| Tempo SDK      | tempo.ts                               | 0.10.5                       |
| Smart Contract | Solidity (Foundry)                     | 0.8.13 / 0.8.25              |
| Styling        | Tailwind CSS v4 + shadcn/ui (new-york) | 4.x                          |
| Animation      | Motion (formerly framer-motion)        | 12.23.26                     |
| QR Generation  | qrcode.react                           | 4.2.0                        |
| Data Fetching  | TanStack React Query                   | 5.90.12                      |
| Validation     | Zod                                    | 4.1.13                       |

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
pathUSD:   0x20c0000000000000000000000000000000000000  ← primary token for this app
AlphaUSD:  0x20c0000000000000000000000000000000000001  ← used as fee token in contracts/.env
BetaUSD:   0x20c0000000000000000000000000000000000002
ThetaUSD:  0x20c0000000000000000000000000000000000003
```

All tokens: 6 decimals, TIP-20 standard (ERC-20 compatible + memo support).

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

**Transaction Memos (32 bytes):** Every transfer carries an on-chain 32-byte memo via `TransferWithMemo` event. Use `stringToHex` + `pad({ size: 32 })` from viem. Max 31 UTF-8 characters (emojis are 4 bytes each). See "Memo Strategy" below for how we use this.

**Parallel Transactions (2D Nonces):** Multiple simultaneous transactions from the same account using different `nonceKey` values. Important for multiple people claiming from a pool simultaneously without blocking each other.

**Batch Transactions (Atomic):** Multiple calls in one transaction — all succeed or all fail. Used in `useBatchSendRaw` hook for sending to multiple recipients atomically.

## Privy Integration

Privy provides email/phone → wallet mapping. Users sign up with phone or email, wallets are created automatically. **This is required for Track 1.**

### Server-Side User Lookup (`/api/find`)

```typescript
// POST /api/find — resolves email/phone to wallet address
// If user doesn't exist, creates one with an embedded wallet
// Implementation: src/app/api/find/route.ts (80 lines)
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

### Client-Side Transfer (`useSend` hook)

```typescript
// Implementation: src/hooks/useSend.ts (117 lines)
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
  feePayer: true,
})
```

## Smart Contract — PacketPool

**File:** `contracts/src/PacketPool.sol` (218 lines)
**Status:** Fully implemented, 23 tests passing, deployed to Tempo Moderato testnet.
**Deployment script:** `contracts/script/PacketPool.s.sol`

### What It Does

The `PacketPool` contract implements Lucky Split (红包) red envelopes. A creator deposits TIP-20 tokens into a pool with N shares. Each claimer gets a random portion determined by on-chain randomness. The contract accepts any TIP-20 token address — the frontend always passes pathUSD.

### Contract Interface

```solidity
// Creates a pool. Caller must approve `amount` of `token` to this contract first.
function createPool(bytes32 poolId, uint8 shares, bytes32 memo, address token, uint256 amount) external;

// Claims a random share. Each address can claim once per pool.
function claim(bytes32 poolId) external;

// View functions
function getPool(bytes32 poolId) external view returns (Pool memory);
function getClaimInfo(bytes32 poolId, uint8 claimIndex) external view returns (address claimer, uint256 amount);
function getPoolClaims(bytes32 poolId) external view returns (address[] memory, uint256[] memory);
```

### Pool Struct

```solidity
struct Pool {
    address creator;
    address token;
    uint256 totalAmount;
    uint256 remainingAmount;
    uint8 totalShares;       // 1–255
    uint8 claimedShares;
    uint256 commitBlock;     // block.number at creation, used for randomness seed
    bytes32 memo;            // human-readable greeting (e.g., "Happy Birthday!")
    bool exists;
}
```

### Randomness

**Primary (within 256 blocks of creation):**

```
seed = keccak256(abi.encodePacked(blockhash(pool.commitBlock), poolId, msg.sender, claimIndex))
```

- `blockhash(pool.commitBlock)` didn't exist when the pool was created → creator can't predict splits.
- Each claimer gets a unique seed (different `msg.sender` and `claimIndex`).

**Fallback (pool older than 256 blocks):**

```
seed = keccak256(abi.encodePacked(poolId, block.timestamp, block.prevrandao, msg.sender, claimIndex))
```

- `prevrandao`-based. Simpler but adequate for small-stakes social game.

Note: Chainlink VRF is **NOT available on Tempo testnet** — do not attempt to use it.

### Random Split Algorithm (WeChat-style)

```
MIN_AMOUNT = 10,000 (= $0.01 with 6 decimals)

For each claim:
  if last share → return all remaining
  maxAmount = (remaining / remainingShares) × 2
  safeMax = remaining - (remainingShares - 1) × MIN_AMOUNT
  max = min(maxAmount, safeMax)
  if max ≤ MIN_AMOUNT → return MIN_AMOUNT
  return (seed % (max - MIN_AMOUNT)) + MIN_AMOUNT
```

Guarantees: every claimer gets at least $0.01, all claims sum exactly to the pool total.

### Memo Strategy

Both token transfers (deposit and payout) carry the **pool's human-readable greeting**:

| Transfer     | Direction          | Memo Content                                      |
| ------------ | ------------------ | ------------------------------------------------- |
| `createPool` | Creator → Contract | User's custom message (e.g., `"Happy Birthday!"`) |
| `claim`      | Contract → Claimer | Same custom message from `pool.memo`              |

This means both the sender and every claimer see the greeting in their on-chain transaction history. The `poolId` is still recoverable from the indexed `PoolCreated` and `Claimed` events — no information is lost.

Memo constraint: 32 bytes max = ~31 UTF-8 characters. Emojis are 4 bytes each. Frontend should enforce a character limit.

### Security Patterns

- **Checks-effects-interactions:** State is updated BEFORE the outgoing token transfer in `claim()`.
- **No reentrancy risk:** TIP-20 `transferWithMemo` is a precompile call, not an arbitrary external call, but CEI pattern is still followed as defense-in-depth.
- **Duplicate prevention:** `hasClaimed[poolId][msg.sender]` prevents double-claiming.
- **Conservation invariant:** Fuzz-tested — all claimed amounts always sum exactly to the pool total.

### Test Suite

**File:** `contracts/test/PacketPool.t.sol` (511 lines, 23 tests)
**Run:** `cd contracts && forge test -vv`

| Category             | Tests                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Pool creation        | Basic creation, duplicate ID revert, zero shares revert, amount too small revert               |
| Claiming             | Single claim, all claims sum to total, single-share pool (100%), two-share pool, exact minimum |
| Edge cases           | Creator self-claim, prevrandao fallback (>256 blocks), max shares (255)                        |
| Events               | PoolCreated emission, Claimed emission, memo propagation on claim transfers                    |
| Reverts              | Already claimed, pool fully claimed, pool not found                                            |
| Fuzz (256 runs each) | Amounts always sum to total, every claim >= MIN_AMOUNT                                         |
| Independence         | Multiple pools with same token don't bleed funds                                               |

### Deployment

Not deployed yet. To deploy:

```bash
cd contracts
source .env
forge script script/PacketPool.s.sol:PacketPoolScript \
  --rpc-url $TEMPO_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify --verifier-url $VERIFIER_URL
```

### Known Limitations

- **No pool expiration:** Creator cannot reclaim unclaimed funds. If a pool has 5 shares and only 3 are claimed, the remaining funds are locked forever.
- **No pool cancellation:** Once created, a pool cannot be cancelled or modified.
- **256-block window:** Primary randomness (blockhash) only works within 256 blocks (~128 seconds on Tempo). After that, falls back to prevrandao which has weaker entropy.
- **uint8 shares:** Maximum 255 shares per pool.

### TIP-20 Token Interface

The contract imports `ITIP20` from `tempo-std/interfaces/ITIP20.sol`. Key methods used:

- `transferFromWithMemo(from, to, amount, memo)` — for pulling tokens on pool creation
- `transferWithMemo(to, amount, memo)` — for paying out claims
- `approve(spender, amount)` — caller must approve before `createPool`

Full TIP-20 interface also includes: `mint`, `burn`, `pause`, `transferPolicyId`, `claimRewards`, etc. (not used by PacketPool).

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

## Design System

The app uses a custom "Packet" design system built on Tailwind v4 + shadcn/ui (new-york style).

### Design Language & Tone

The visual identity blends four pillars:

1. **Futuristic / Sci-Fi** — Grid overlays, monospace typography, corner-tick decorations, clip-path cut corners, dashed connection lines, `[ bracket.notation ]`, `// section markers`. Think mission-control HUD, not generic SaaS.

2. **Chinese Red Packet (红包)** — The core metaphor. Lucky packets, golden accents (not red — the gold represents the coin/wealth inside the envelope), diamond/envelope shapes, festive naming (Happy Horse Year, Lunar Luck, Dragon Year). The cultural reference is WeChat's red envelope mechanic.

3. **Fun & Interactive** — This is a social game, not a payment utility. Copy should emphasize racing, competing, bragging, leaderboards, "who got the biggest share?", chaos, and unpredictability. Animations should feel playful — shuffling cards, marquee tickers of live claims, spring physics.

4. **Crypto-Invisible** — Despite being fully on-chain, the UI never exposes blockchain concepts. No wallet addresses, no gas, no token names, no chain IDs. Users see dollar amounts, phone numbers, and names. The tech is a selling point in marketing copy ("provably fair on-chain randomness") but invisible in the actual product UX.

**Overall vibe:** If a cyberpunk WeChat Pay had a lucky draw feature. Dark, sharp, gold-accented, with a subtle grid texture and a sense of motion.

### Color Tokens

| Token          | CSS Variable           | Value                    | Tailwind Class                     |
| -------------- | ---------------------- | ------------------------ | ---------------------------------- |
| Background     | `--pkt-bg`             | `#050505`                | `bg-pkt-bg`                        |
| Surface        | `--pkt-surface`        | `rgba(20, 22, 26, 0.85)` | `bg-pkt-surface`                   |
| Accent (gold)  | `--pkt-accent`         | `#ffd000`                | `text-pkt-accent`, `bg-pkt-accent` |
| Text primary   | `--pkt-text`           | `#eeeeee`                | `text-pkt-text`                    |
| Text secondary | `--pkt-text-secondary` | `#888888`                | `text-pkt-text-secondary`          |
| Text tertiary  | `--pkt-text-tertiary`  | `#555555`                | `text-pkt-text-tertiary`           |
| Border         | `--pkt-border`         | `rgba(255,255,255,0.15)` | `border-pkt-border`                |
| Red (packets)  | `--pkt-red`            | `#c81414`                | `bg-pkt-red`                       |

### Typography

- **Display / Headings:** Geist Sans — extrabold, uppercase, tight tracking
- **Labels / Data / Mono:** Geist Mono — 9-11px, uppercase, wide tracking (`tracking-wider`/`tracking-widest`)
- **Body:** Geist Sans — regular weight, `text-pkt-text-secondary`

### Visual Motifs

- **Grid overlay:** 40px lines at 3% white opacity (fixed background)
- **Diagonal hatch:** 45deg repeating gradient at near-zero opacity
- **Corner ticks:** 2px L-shaped accent marks at card corners (`.pkt-corner-ticks`)
- **Clip-path cut corners:** Chamfered polygon shapes (`.pkt-clip-sm/md/lg`)
- **Section markers:** `// label` prefix pattern for section headers
- **Bracket notation:** `[ data.label ]` for meta information
- **Barcode strips:** Decorative golden bar arrays
- **Diamond shapes:** Rotated squares as visual anchors (pool/node visualization)
- **Skewed logo:** `-skew-x-6` on the Packet logo container

### CSS Custom Properties

All Packet tokens are prefixed `--pkt-*` and exposed as Tailwind classes via `@theme inline` in `globals.css`. The breakpoint for desktop layout is `md:` (768px) across all pages.

### Component Patterns

- `GlassCard` — frosted glass container used throughout
- `Modal` — animated backdrop modal (framer-motion)
- `PacketCard` / `PacketButton` / `PacketBadge` — themed components with corner ticks and clip-paths
- `ProfilePill` — top-right user profile with popover menu
- `ActivityMarquee` — horizontal scrolling ticker of live packet claims
- `ShufflingPackets` — animated stack of red envelope cards (login page)
- `SplitVisual` — diamond-node graph showing pool → recipient splits with amounts
- `OtpInput` — 6-digit code input with paste support (login page)

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

## Common Patterns

### Resolving email/phone to wallet address

Always go through the `/api/find` endpoint which uses Privy server-side SDK to look up or create users. Never expose wallet addresses in the UI.

### Memo encoding

```typescript
import { stringToHex, pad } from 'viem'
const memo = pad(stringToHex('Happy Birthday!'), { size: 32 })
```

Memos are 32 bytes max (~31 UTF-8 characters). The contract stores the memo and attaches it to both the deposit and all claim payouts.

### Amount handling

All token amounts use 6 decimals. Use `parseUnits(amount, 6)` for encoding and `formatUnits(amount, 6)` for display.

### Fee sponsorship

Always use `feePayer: true` for user-facing transactions. Users should never need to hold tokens for gas. The deployment script sets the fee token via `StdPrecompiles.TIP_FEE_MANAGER.setUserToken()`.

### Pool ID generation

Pool IDs are `bytes32`. Generate off-chain (e.g., `keccak256` of a UUID or timestamp + creator address). Must be globally unique — the contract reverts on duplicate IDs.
