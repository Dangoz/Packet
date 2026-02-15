// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ITIP20} from "tempo-std/interfaces/ITIP20.sol";
import {ITIP20RolesAuth} from "tempo-std/interfaces/ITIP20RolesAuth.sol";
import {StdPrecompiles} from "tempo-std/StdPrecompiles.sol";
import {StdTokens} from "tempo-std/StdTokens.sol";
import {PacketPool} from "../src/PacketPool.sol";

contract PacketPoolTest is Test {
    PacketPool public pool;
    ITIP20 public token;

    address public constant ALICE = address(0xA11CE);
    address public constant BOB = address(0xB0B);
    address public constant CAROL = address(0xCA201);
    address public constant DAVE = address(0xDA7E);
    address public constant EVE = address(0xE7E);

    uint256 public constant DECIMALS = 6;
    uint256 public constant ONE_DOLLAR = 1_000_000;

    function setUp() public {
        // Set fee token
        address feeToken = vm.envOr("TEMPO_FEE_TOKEN", StdTokens.ALPHA_USD_ADDRESS);
        StdPrecompiles.TIP_FEE_MANAGER.setUserToken(feeToken);

        // Create a test token via Tempo's TIP-20 factory
        token = ITIP20(
            StdPrecompiles.TIP20_FACTORY.createToken(
                "testUSD", "tUSD", "USD", StdTokens.PATH_USD, address(this), bytes32(0)
            )
        );
        ITIP20RolesAuth(address(token)).grantRole(token.ISSUER_ROLE(), address(this));

        // Deploy the contract
        pool = new PacketPool();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    function _fundAndApprove(address user, uint256 amount) internal {
        token.mint(user, amount);
        vm.prank(user);
        token.approve(address(pool), amount);
    }

    function _createPool(
        address creator,
        bytes32 poolId,
        uint8 shares,
        uint256 amount
    ) internal {
        _fundAndApprove(creator, amount);
        vm.prank(creator);
        pool.createPool(poolId, shares, bytes32("test memo"), address(token), amount);
    }

    // ── Pool Creation Tests ──────────────────────────────────────────

    function test_CreatePool() public {
        bytes32 poolId = keccak256("pool-1");
        uint256 amount = 20 * ONE_DOLLAR;

        _createPool(ALICE, poolId, 5, amount);

        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.creator, ALICE);
        assertEq(p.token, address(token));
        assertEq(p.totalAmount, amount);
        assertEq(p.remainingAmount, amount);
        assertEq(p.totalShares, 5);
        assertEq(p.claimedShares, 0);
        assertEq(p.memo, bytes32("test memo"));
        assertTrue(p.exists);

        // Tokens moved from Alice to contract
        assertEq(token.balanceOf(ALICE), 0);
        assertEq(token.balanceOf(address(pool)), amount);
    }

    function test_CreatePool_RevertIfAlreadyExists() public {
        bytes32 poolId = keccak256("pool-1");
        _createPool(ALICE, poolId, 3, 10 * ONE_DOLLAR);

        // Try creating the same pool again
        _fundAndApprove(BOB, 10 * ONE_DOLLAR);
        vm.prank(BOB);
        vm.expectRevert(PacketPool.PoolAlreadyExists.selector);
        pool.createPool(poolId, 3, bytes32("dupe"), address(token), 10 * ONE_DOLLAR);
    }

    function test_CreatePool_RevertIfZeroShares() public {
        _fundAndApprove(ALICE, ONE_DOLLAR);
        vm.prank(ALICE);
        vm.expectRevert(PacketPool.InvalidShares.selector);
        pool.createPool(keccak256("bad"), 0, bytes32(0), address(token), ONE_DOLLAR);
    }

    function test_CreatePool_RevertIfAmountTooSmall() public {
        // 5 shares but only $0.04 → less than $0.01 per share
        _fundAndApprove(ALICE, 40_000);
        vm.prank(ALICE);
        vm.expectRevert(PacketPool.InvalidAmount.selector);
        pool.createPool(keccak256("small"), 5, bytes32(0), address(token), 40_000);
    }

    // ── Claim Tests ──────────────────────────────────────────────────

    function test_SingleClaim() public {
        bytes32 poolId = keccak256("pool-1");
        _createPool(ALICE, poolId, 3, 10 * ONE_DOLLAR);

        // Advance a block so blockhash(commitBlock) is available
        vm.roll(block.number + 1);

        vm.prank(BOB);
        pool.claim(poolId);

        // Bob received some tokens
        uint256 bobBalance = token.balanceOf(BOB);
        assertTrue(bobBalance > 0, "Bob should have received tokens");
        assertTrue(bobBalance <= 10 * ONE_DOLLAR, "Bob can't get more than the pool");

        // Pool state updated
        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.claimedShares, 1);
        assertEq(p.remainingAmount, 10 * ONE_DOLLAR - bobBalance);

        // Claim info stored
        (address claimer, uint256 amount) = pool.getClaimInfo(poolId, 0);
        assertEq(claimer, BOB);
        assertEq(amount, bobBalance);

        // hasClaimed flag set
        assertTrue(pool.hasClaimed(poolId, BOB));
    }

    function test_ClaimAll_AmountsSumToTotal() public {
        bytes32 poolId = keccak256("pool-2");
        uint256 totalAmount = 20 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 4, totalAmount);

        vm.roll(block.number + 1);

        address[4] memory claimers = [BOB, CAROL, DAVE, EVE];
        uint256 totalClaimed = 0;

        for (uint256 i = 0; i < 4; i++) {
            vm.prank(claimers[i]);
            pool.claim(poolId);

            uint256 balance = token.balanceOf(claimers[i]);
            assertTrue(balance >= pool.MIN_AMOUNT(), "Each claim >= MIN_AMOUNT");
            totalClaimed += balance;
        }

        // All amounts should sum exactly to the pool total
        assertEq(totalClaimed, totalAmount, "Sum of claims must equal pool total");

        // Pool fully claimed
        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.claimedShares, 4);
        assertEq(p.remainingAmount, 0);

        // Contract should hold zero tokens for this pool
        assertEq(token.balanceOf(address(pool)), 0);
    }

    function test_GetPoolClaims() public {
        bytes32 poolId = keccak256("pool-3");
        _createPool(ALICE, poolId, 3, 15 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        vm.prank(BOB);
        pool.claim(poolId);
        vm.prank(CAROL);
        pool.claim(poolId);

        (address[] memory claimers, uint256[] memory amounts) = pool.getPoolClaims(poolId);
        assertEq(claimers.length, 2);
        assertEq(claimers[0], BOB);
        assertEq(claimers[1], CAROL);
        assertTrue(amounts[0] > 0);
        assertTrue(amounts[1] > 0);
    }

    // ── Revert Tests ─────────────────────────────────────────────────

    function test_Claim_RevertIfAlreadyClaimed() public {
        bytes32 poolId = keccak256("pool-4");
        _createPool(ALICE, poolId, 3, 10 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        vm.prank(BOB);
        pool.claim(poolId);

        vm.prank(BOB);
        vm.expectRevert(PacketPool.AlreadyClaimed.selector);
        pool.claim(poolId);
    }

    function test_Claim_RevertIfPoolFullyClaimed() public {
        bytes32 poolId = keccak256("pool-5");
        _createPool(ALICE, poolId, 2, 2 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        vm.prank(BOB);
        pool.claim(poolId);
        vm.prank(CAROL);
        pool.claim(poolId);

        vm.prank(DAVE);
        vm.expectRevert(PacketPool.PoolFullyClaimed.selector);
        pool.claim(poolId);
    }

    function test_Claim_RevertIfPoolNotFound() public {
        vm.prank(BOB);
        vm.expectRevert(PacketPool.PoolNotFound.selector);
        pool.claim(keccak256("nonexistent"));
    }

    // ── Single-Share Pool ─────────────────────────────────────────────

    function test_SingleSharePool_ClaimerGetsEverything() public {
        bytes32 poolId = keccak256("single");
        uint256 amount = 50 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 1, amount);
        vm.roll(block.number + 1);

        vm.prank(BOB);
        pool.claim(poolId);

        // Bob gets the entire pool — no randomness path, just remainingAmount
        assertEq(token.balanceOf(BOB), amount, "Single share = full amount");
        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.remainingAmount, 0);
        assertEq(p.claimedShares, 1);
    }

    // ── Two-Share Pool ──────────────────────────────────────────────

    function test_TwoSharePool_SecondGetsRemainder() public {
        bytes32 poolId = keccak256("two-share");
        uint256 amount = 10 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 2, amount);
        vm.roll(block.number + 1);

        vm.prank(BOB);
        pool.claim(poolId);
        uint256 bobGot = token.balanceOf(BOB);

        vm.prank(CAROL);
        pool.claim(poolId);
        uint256 carolGot = token.balanceOf(CAROL);

        // Both got at least MIN_AMOUNT
        assertTrue(bobGot >= pool.MIN_AMOUNT(), "Bob >= MIN");
        assertTrue(carolGot >= pool.MIN_AMOUNT(), "Carol >= MIN");
        // Sum is exact
        assertEq(bobGot + carolGot, amount, "Two shares sum to total");
    }

    // ── Exact Minimum Amount ────────────────────────────────────────

    function test_ExactMinimumAmount_EveryoneGetsMin() public {
        bytes32 poolId = keccak256("exact-min");
        uint8 shares = 5;
        // Exactly MIN_AMOUNT per share — no room for randomness
        uint256 amount = uint256(shares) * pool.MIN_AMOUNT();
        _createPool(ALICE, poolId, shares, amount);
        vm.roll(block.number + 1);

        for (uint8 i = 0; i < shares; i++) {
            address claimer = address(uint160(0xC000 + i));
            vm.prank(claimer);
            pool.claim(poolId);
            assertEq(
                token.balanceOf(claimer),
                pool.MIN_AMOUNT(),
                "Each claimer gets exactly MIN_AMOUNT"
            );
        }

        assertEq(token.balanceOf(address(pool)), 0, "Contract drained");
    }

    // ── Creator Self-Claim ──────────────────────────────────────────

    function test_CreatorCanClaimOwnPool() public {
        bytes32 poolId = keccak256("self-claim");
        _createPool(ALICE, poolId, 3, 15 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        // Alice claims her own pool — no restriction
        vm.prank(ALICE);
        pool.claim(poolId);

        uint256 aliceBalance = token.balanceOf(ALICE);
        assertTrue(aliceBalance > 0, "Creator can claim own pool");
        assertTrue(pool.hasClaimed(poolId, ALICE));
    }

    // ── Prevrandao Fallback (>256 blocks old) ───────────────────────

    function test_ClaimAfter256Blocks_PrevrandaoFallback() public {
        bytes32 poolId = keccak256("old-pool");
        _createPool(ALICE, poolId, 3, 12 * ONE_DOLLAR);

        // Advance 257 blocks so blockhash(commitBlock) returns 0x0
        vm.roll(block.number + 257);

        vm.prank(BOB);
        pool.claim(poolId);
        vm.prank(CAROL);
        pool.claim(poolId);
        vm.prank(DAVE);
        pool.claim(poolId);

        uint256 total = token.balanceOf(BOB)
            + token.balanceOf(CAROL)
            + token.balanceOf(DAVE);

        assertEq(total, 12 * ONE_DOLLAR, "Fallback path: sum must equal total");
        assertEq(pool.getPool(poolId).remainingAmount, 0);
    }

    // ── Memo Propagation on Claims ──────────────────────────────────

    function test_ClaimEmitsMemoFromPool() public {
        bytes32 poolId = keccak256("memo-test");
        bytes32 memo = bytes32("Happy Birthday!");
        uint256 amount = 5 * ONE_DOLLAR;

        _fundAndApprove(ALICE, amount);
        vm.prank(ALICE);
        pool.createPool(poolId, 2, memo, address(token), amount);
        vm.roll(block.number + 1);

        // The claim transfer should emit TransferWithMemo with pool.memo
        // We check via the token's TransferWithMemo event
        vm.prank(BOB);
        vm.expectEmit(true, true, true, false, address(token));
        emit ITIP20.TransferWithMemo(address(pool), BOB, 0, memo);
        pool.claim(poolId);
    }

    // ── Event Emissions ─────────────────────────────────────────────

    function test_CreatePool_EmitsPoolCreated() public {
        bytes32 poolId = keccak256("event-create");
        bytes32 memo = bytes32("test event");
        uint256 amount = 10 * ONE_DOLLAR;

        _fundAndApprove(ALICE, amount);

        uint256 expectedExpiry = block.timestamp + pool.DEFAULT_EXPIRY();

        vm.prank(ALICE);
        vm.expectEmit(true, true, false, true);
        emit PacketPool.PoolCreated(poolId, ALICE, address(token), amount, 3, memo, expectedExpiry);
        pool.createPool(poolId, 3, memo, address(token), amount);
    }

    function test_Claim_EmitsClaimed() public {
        bytes32 poolId = keccak256("event-claim");
        _createPool(ALICE, poolId, 2, 10 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        vm.prank(BOB);
        // Check indexed fields (poolId, claimer), skip amount (random), check claimIndex
        vm.expectEmit(true, true, false, false);
        emit PacketPool.Claimed(poolId, BOB, 0, 0);
        pool.claim(poolId);
    }

    // ── Multiple Independent Pools ──────────────────────────────────

    function test_MultiplePoolsIndependent() public {
        bytes32 poolA = keccak256("multi-a");
        bytes32 poolB = keccak256("multi-b");

        _createPool(ALICE, poolA, 2, 10 * ONE_DOLLAR);
        _createPool(BOB, poolB, 2, 20 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        // Contract holds both pools' funds
        assertEq(token.balanceOf(address(pool)), 30 * ONE_DOLLAR);

        // Claim from pool A
        vm.prank(CAROL);
        pool.claim(poolA);
        vm.prank(DAVE);
        pool.claim(poolA);

        // Pool A drained, pool B untouched
        PacketPool.Pool memory pA = pool.getPool(poolA);
        PacketPool.Pool memory pB = pool.getPool(poolB);
        assertEq(pA.remainingAmount, 0, "Pool A fully claimed");
        assertEq(pB.remainingAmount, 20 * ONE_DOLLAR, "Pool B untouched");

        // Contract still holds pool B's funds
        assertEq(token.balanceOf(address(pool)), 20 * ONE_DOLLAR);

        // Now claim pool B
        vm.prank(CAROL);
        pool.claim(poolB);
        vm.prank(DAVE);
        pool.claim(poolB);

        assertEq(token.balanceOf(address(pool)), 0, "Both pools drained");
    }

    // ── Max Shares (uint8 boundary = 255) ───────────────────────────

    function test_MaxShares255() public {
        bytes32 poolId = keccak256("max-shares");
        uint8 shares = 255;
        // $0.01 per share minimum → $2.55 minimum total
        uint256 amount = uint256(shares) * pool.MIN_AMOUNT();
        _createPool(ALICE, poolId, shares, amount);
        vm.roll(block.number + 1);

        uint256 totalClaimed = 0;
        for (uint16 i = 0; i < 255; i++) {
            address claimer = address(uint160(0xD000 + i));
            vm.prank(claimer);
            pool.claim(poolId);
            totalClaimed += token.balanceOf(claimer);
        }

        assertEq(totalClaimed, amount, "255 shares sum to total");
        assertEq(pool.getPool(poolId).remainingAmount, 0);
    }

    // ── Every Claim >= MIN_AMOUNT (stress test) ─────────────────────

    function test_AllClaimsAboveMinAmount_LargePool() public {
        bytes32 poolId = keccak256("min-guarantee");
        uint8 shares = 10;
        uint256 amount = 100 * ONE_DOLLAR;
        _createPool(ALICE, poolId, shares, amount);
        vm.roll(block.number + 1);

        for (uint8 i = 0; i < shares; i++) {
            address claimer = address(uint160(0xE000 + i));
            vm.prank(claimer);
            pool.claim(poolId);
            assertTrue(
                token.balanceOf(claimer) >= pool.MIN_AMOUNT(),
                "Every claim must be >= MIN_AMOUNT"
            );
        }
    }

    // ── Fuzz Tests ───────────────────────────────────────────────────

    function testFuzz_ClaimAmountsAlwaysSumToTotal(
        uint8 shares,
        uint128 totalRaw
    ) public {
        // Bound inputs to reasonable ranges
        shares = uint8(bound(shares, 1, 10));
        uint256 total = bound(
            totalRaw,
            uint256(shares) * pool.MIN_AMOUNT(),
            1_000_000 * ONE_DOLLAR
        );

        bytes32 poolId = keccak256(abi.encodePacked("fuzz", shares, total));
        _createPool(ALICE, poolId, shares, total);
        vm.roll(block.number + 1);

        uint256 totalClaimed = 0;
        for (uint8 i = 0; i < shares; i++) {
            address claimer = address(uint160(0xF000 + i));
            vm.prank(claimer);
            pool.claim(poolId);
            totalClaimed += token.balanceOf(claimer);
        }

        assertEq(totalClaimed, total, "Fuzz: sum must equal total");
    }

    function testFuzz_EveryClaimAboveMinAmount(
        uint8 shares,
        uint128 totalRaw
    ) public {
        shares = uint8(bound(shares, 2, 20));
        uint256 total = bound(
            totalRaw,
            uint256(shares) * pool.MIN_AMOUNT(),
            100_000 * ONE_DOLLAR
        );

        bytes32 poolId = keccak256(abi.encodePacked("fuzz-min", shares, total));
        _createPool(ALICE, poolId, shares, total);
        vm.roll(block.number + 1);

        for (uint8 i = 0; i < shares; i++) {
            address claimer = address(uint160(0xA000 + i));
            vm.prank(claimer);
            pool.claim(poolId);
            assertTrue(
                token.balanceOf(claimer) >= pool.MIN_AMOUNT(),
                "Fuzz: every claim >= MIN_AMOUNT"
            );
        }
    }

    // ── Expiration Tests ──────────────────────────────────────────────

    function test_CreatePool_HasDefaultExpiry() public {
        bytes32 poolId = keccak256("expiry-default");
        uint256 amount = 10 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 3, amount);

        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.expiresAt, block.timestamp + 24 hours, "Default expiry = 24h");
    }

    function test_CreatePoolWithExpiry_CustomDuration() public {
        bytes32 poolId = keccak256("expiry-custom");
        uint256 amount = 10 * ONE_DOLLAR;
        uint256 duration = 1 hours;

        _fundAndApprove(ALICE, amount);
        vm.prank(ALICE);
        pool.createPoolWithExpiry(poolId, 3, bytes32("custom"), address(token), amount, duration);

        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.expiresAt, block.timestamp + duration, "Custom expiry = 1h");
        assertTrue(p.exists);
    }

    function test_Claim_RevertIfPoolExpired() public {
        bytes32 poolId = keccak256("expired-claim");
        _createPool(ALICE, poolId, 3, 10 * ONE_DOLLAR);
        vm.roll(block.number + 1);

        // Warp past expiry (24h + 1s)
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(BOB);
        vm.expectRevert(PacketPool.PoolExpired.selector);
        pool.claim(poolId);
    }

    // ── Refund Tests ──────────────────────────────────────────────────

    function test_Refund_AfterExpiry() public {
        bytes32 poolId = keccak256("refund-ok");
        uint256 amount = 10 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 3, amount);

        // Warp past expiry
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(ALICE);
        pool.refund(poolId);

        // Alice got all funds back
        assertEq(token.balanceOf(ALICE), amount, "Creator refunded full amount");

        // Pool state updated
        PacketPool.Pool memory p = pool.getPool(poolId);
        assertEq(p.remainingAmount, 0);
        assertEq(p.claimedShares, p.totalShares, "Shares set to total after refund");
    }

    function test_Refund_PartialClaims() public {
        bytes32 poolId = keccak256("refund-partial");
        uint256 amount = 10 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 3, amount);
        vm.roll(block.number + 1);

        // BOB claims one share
        vm.prank(BOB);
        pool.claim(poolId);
        uint256 bobGot = token.balanceOf(BOB);

        // Warp past expiry
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(ALICE);
        pool.refund(poolId);

        // Alice gets the remainder
        uint256 aliceGot = token.balanceOf(ALICE);
        assertEq(aliceGot + bobGot, amount, "Refund + claims = total");
        assertEq(token.balanceOf(address(pool)), 0, "Contract drained");
    }

    function test_Refund_RevertIfNotCreator() public {
        bytes32 poolId = keccak256("refund-not-creator");
        _createPool(ALICE, poolId, 3, 10 * ONE_DOLLAR);

        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(BOB);
        vm.expectRevert(PacketPool.NotPoolCreator.selector);
        pool.refund(poolId);
    }

    function test_Refund_RevertIfNotExpired() public {
        bytes32 poolId = keccak256("refund-not-expired");
        _createPool(ALICE, poolId, 3, 10 * ONE_DOLLAR);

        // Don't warp — still within expiry
        vm.prank(ALICE);
        vm.expectRevert(PacketPool.PoolNotExpired.selector);
        pool.refund(poolId);
    }

    function test_Refund_RevertIfNothingToRefund() public {
        bytes32 poolId = keccak256("refund-nothing");
        uint256 amount = 2 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 2, amount);
        vm.roll(block.number + 1);

        // Fully claim
        vm.prank(BOB);
        pool.claim(poolId);
        vm.prank(CAROL);
        pool.claim(poolId);

        // Warp past expiry
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(ALICE);
        vm.expectRevert(PacketPool.NothingToRefund.selector);
        pool.refund(poolId);
    }

    function test_Refund_RevertIfPoolNotFound() public {
        vm.prank(ALICE);
        vm.expectRevert(PacketPool.PoolNotFound.selector);
        pool.refund(keccak256("nonexistent"));
    }

    function test_Refund_EmitsRefunded() public {
        bytes32 poolId = keccak256("refund-event");
        uint256 amount = 10 * ONE_DOLLAR;
        _createPool(ALICE, poolId, 3, amount);

        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(ALICE);
        vm.expectEmit(true, true, false, true);
        emit PacketPool.Refunded(poolId, ALICE, amount);
        pool.refund(poolId);
    }
}
