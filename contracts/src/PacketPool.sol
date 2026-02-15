// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ITIP20} from "tempo-std/interfaces/ITIP20.sol";

/// @title PacketPool — Lucky Split (红包) Red Envelope pools
/// @notice Users create pools of tokens split randomly among claimers.
///         Randomness is on-chain and verifiable via block hashes.
contract PacketPool {
    // ── Constants ────────────────────────────────────────────────────
    // $0.01 minimum per share (with 6-decimal stablecoins)
    uint256 public constant MIN_AMOUNT = 10_000;

    // Default expiry duration: 24 hours
    uint256 public constant DEFAULT_EXPIRY = 24 hours;

    // ── Types ────────────────────────────────────────────────────────
    struct Pool {
        address creator;
        address token;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint8 totalShares;
        uint8 claimedShares;
        uint256 commitBlock; // block number at creation, used for randomness
        uint256 expiresAt;   // timestamp after which creator can refund unclaimed funds
        bytes32 memo;
        bool exists;
    }

    // ── Storage ──────────────────────────────────────────────────────
    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;
    mapping(bytes32 => mapping(uint8 => address)) public claimants;
    mapping(bytes32 => mapping(uint8 => uint256)) public claimAmounts;

    // ── Events ───────────────────────────────────────────────────────
    event PoolCreated(
        bytes32 indexed poolId,
        address indexed creator,
        address token,
        uint256 amount,
        uint8 shares,
        bytes32 memo,
        uint256 expiresAt
    );
    event Claimed(
        bytes32 indexed poolId,
        address indexed claimer,
        uint256 amount,
        uint8 claimIndex
    );
    event Refunded(
        bytes32 indexed poolId,
        address indexed creator,
        uint256 amount
    );

    // ── Errors ───────────────────────────────────────────────────────
    error PoolAlreadyExists();
    error PoolNotFound();
    error PoolFullyClaimed();
    error PoolExpired();
    error PoolNotExpired();
    error AlreadyClaimed();
    error InvalidShares();
    error InvalidAmount();
    error NotPoolCreator();
    error NothingToRefund();
    error TransferFailed();

    // ── Pool Creation ────────────────────────────────────────────────

    /// @notice Create a new red envelope pool with default 24h expiry.
    /// @dev    Caller must approve this contract for `amount` of `token` first.
    /// @param poolId   Unique identifier (generate off-chain, e.g. keccak256 of uuid)
    /// @param shares   Number of shares (1–255)
    /// @param memo     32-byte memo attached to the deposit (e.g. "Happy New Year!")
    /// @param token    TIP-20 token address to use (e.g. pathUSD)
    /// @param amount   Total amount to deposit (6-decimal units)
    function createPool(
        bytes32 poolId,
        uint8 shares,
        bytes32 memo,
        address token,
        uint256 amount
    ) external {
        _createPool(poolId, shares, memo, token, amount, DEFAULT_EXPIRY);
    }

    /// @notice Create a new red envelope pool with custom expiry duration.
    /// @param poolId   Unique identifier
    /// @param shares   Number of shares (1–255)
    /// @param memo     32-byte memo
    /// @param token    TIP-20 token address
    /// @param amount   Total amount to deposit (6-decimal units)
    /// @param duration Seconds until the pool expires (creator can refund after)
    function createPoolWithExpiry(
        bytes32 poolId,
        uint8 shares,
        bytes32 memo,
        address token,
        uint256 amount,
        uint256 duration
    ) external {
        _createPool(poolId, shares, memo, token, amount, duration);
    }

    function _createPool(
        bytes32 poolId,
        uint8 shares,
        bytes32 memo,
        address token,
        uint256 amount,
        uint256 duration
    ) internal {
        if (pools[poolId].exists) revert PoolAlreadyExists();
        if (shares == 0) revert InvalidShares();
        if (amount < uint256(shares) * MIN_AMOUNT) revert InvalidAmount();

        // Pull tokens from creator into the contract
        bool success = ITIP20(token).transferFromWithMemo(
            msg.sender,
            address(this),
            amount,
            memo
        );
        if (!success) revert TransferFailed();

        uint256 expiresAt = block.timestamp + duration;

        pools[poolId] = Pool({
            creator: msg.sender,
            token: token,
            totalAmount: amount,
            remainingAmount: amount,
            totalShares: shares,
            claimedShares: 0,
            commitBlock: block.number,
            expiresAt: expiresAt,
            memo: memo,
            exists: true
        });

        emit PoolCreated(poolId, msg.sender, token, amount, shares, memo, expiresAt);
    }

    // ── Claiming ─────────────────────────────────────────────────────

    /// @notice Claim a random share from a pool. Each address can claim once.
    /// @param poolId The pool to claim from
    function claim(bytes32 poolId) external {
        Pool storage pool = pools[poolId];
        if (!pool.exists) revert PoolNotFound();
        if (pool.claimedShares >= pool.totalShares) revert PoolFullyClaimed();
        if (block.timestamp >= pool.expiresAt) revert PoolExpired();
        if (hasClaimed[poolId][msg.sender]) revert AlreadyClaimed();

        uint8 claimIndex = pool.claimedShares;
        uint256 amount = _calculateAmount(poolId, pool, claimIndex);

        // Update state BEFORE transfer (checks-effects-interactions)
        pool.claimedShares++;
        pool.remainingAmount -= amount;
        hasClaimed[poolId][msg.sender] = true;
        claimants[poolId][claimIndex] = msg.sender;
        claimAmounts[poolId][claimIndex] = amount;

        // Pay the claimer, with the pool's greeting as memo so both
        // sender and receiver see the human-readable message on-chain
        ITIP20(pool.token).transferWithMemo(msg.sender, amount, pool.memo);

        emit Claimed(poolId, msg.sender, amount, claimIndex);
    }

    // ── Refund ──────────────────────────────────────────────────────

    /// @notice Refund unclaimed funds to the pool creator after expiry.
    /// @param poolId The pool to refund
    function refund(bytes32 poolId) external {
        Pool storage pool = pools[poolId];
        if (!pool.exists) revert PoolNotFound();
        if (msg.sender != pool.creator) revert NotPoolCreator();
        if (block.timestamp < pool.expiresAt) revert PoolNotExpired();
        if (pool.remainingAmount == 0) revert NothingToRefund();

        uint256 amount = pool.remainingAmount;
        pool.remainingAmount = 0;
        // Mark all unclaimed shares as claimed so the pool is fully settled
        pool.claimedShares = pool.totalShares;

        ITIP20(pool.token).transferWithMemo(msg.sender, amount, pool.memo);

        emit Refunded(poolId, msg.sender, amount);
    }

    // ── Randomness ───────────────────────────────────────────────────

    /// @dev WeChat-style random split: each claimer gets between MIN_AMOUNT
    ///      and 2x the equal share. Last person gets whatever remains.
    function _calculateAmount(
        bytes32 poolId,
        Pool storage pool,
        uint8 claimIndex
    ) internal view returns (uint256) {
        uint8 remainingShares = pool.totalShares - pool.claimedShares;

        // Last person gets everything remaining
        if (remainingShares == 1) {
            return pool.remainingAmount;
        }

        uint256 seed = _generateSeed(poolId, claimIndex);

        // Max = 2x the equal share
        uint256 maxAmount = (pool.remainingAmount / uint256(remainingShares)) * 2;

        // Ensure enough remains for other claimers (MIN_AMOUNT each)
        uint256 safeMax = pool.remainingAmount
            - (uint256(remainingShares - 1) * MIN_AMOUNT);
        if (maxAmount > safeMax) {
            maxAmount = safeMax;
        }

        // Edge case: if max <= min, just return min
        if (maxAmount <= MIN_AMOUNT) {
            return MIN_AMOUNT;
        }

        uint256 range = maxAmount - MIN_AMOUNT;
        return (seed % range) + MIN_AMOUNT;
    }

    /// @dev Generate a random seed from on-chain data.
    ///      Primary: blockhash of the creation block (verifiable, works within 256 blocks).
    ///      Fallback: prevrandao (if pool is older than 256 blocks).
    function _generateSeed(
        bytes32 poolId,
        uint8 claimIndex
    ) internal view returns (uint256) {
        Pool storage pool = pools[poolId];

        bytes32 blockHash = blockhash(pool.commitBlock);

        if (blockHash != bytes32(0)) {
            return uint256(keccak256(abi.encodePacked(
                blockHash, poolId, msg.sender, claimIndex
            )));
        }

        // Fallback: prevrandao-based
        return uint256(keccak256(abi.encodePacked(
            poolId, block.timestamp, block.prevrandao, msg.sender, claimIndex
        )));
    }

    // ── View Helpers ─────────────────────────────────────────────────

    /// @notice Get full pool details
    function getPool(bytes32 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }

    /// @notice Get a single claim's info
    function getClaimInfo(
        bytes32 poolId,
        uint8 claimIndex
    ) external view returns (address claimer, uint256 amount) {
        return (claimants[poolId][claimIndex], claimAmounts[poolId][claimIndex]);
    }

    /// @notice Get all claims for a pool
    function getPoolClaims(
        bytes32 poolId
    ) external view returns (address[] memory claimers, uint256[] memory amounts) {
        Pool memory pool = pools[poolId];
        uint8 claimed = pool.claimedShares;
        claimers = new address[](claimed);
        amounts = new uint256[](claimed);
        for (uint8 i = 0; i < claimed; i++) {
            claimers[i] = claimants[poolId][i];
            amounts[i] = claimAmounts[poolId][i];
        }
    }
}
