// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DroEscrowFactory
 * @notice Oak Network-inspired singleton escrow for DRO marketplace.
 *         Holds ERC20 tokens until delivery is confirmed or deadline passes.
 *
 * Flow:
 *   1. Arbiter (DRO platform) calls createEscrow()
 *   2. Buyer approves token, then calls fundEscrow()
 *   3. On delivery: arbiter calls releaseEscrow() → funds go to treasury
 *   4. On dispute: buyer calls disputeEscrow() → funds frozen for arbiter review
 *   5. On timeout: anyone calls autoRefund() after deadline → funds back to buyer
 */
contract DroEscrowFactory is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ── Types ──

    enum Status {
        Created,   // 0 — escrow created, awaiting funding
        Funded,    // 1 — buyer deposited tokens
        Released,  // 2 — arbiter confirmed delivery, funds sent to treasury
        Refunded,  // 3 — funds returned to buyer
        Disputed   // 4 — buyer raised dispute, funds frozen
    }

    struct Escrow {
        bytes32 escrowId;
        string  orderId;
        address buyer;
        address token;
        uint256 amount;
        uint256 deadline;
        Status  status;
        bool    funded;
    }

    // ── State ──

    address public treasury;          // receives released funds
    uint256 public protocolFeeBps;    // fee in basis points (100 = 1%)

    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => bool) public escrowExists;

    // ── Events ──

    event EscrowCreated(bytes32 indexed escrowId, string orderId, address indexed buyer, address token, uint256 amount, uint256 deadline);
    event EscrowFunded(bytes32 indexed escrowId, address indexed buyer, uint256 amount);
    event EscrowReleased(bytes32 indexed escrowId, uint256 amount, uint256 fee);
    event EscrowRefunded(bytes32 indexed escrowId, address indexed buyer, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId, address indexed buyer);
    event EscrowDisputeResolved(bytes32 indexed escrowId, bool releasedToTreasury);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);

    // ── Errors ──

    error EscrowAlreadyExists();
    error EscrowNotFound();
    error InvalidStatus(Status current, Status expected);
    error NotBuyer();
    error DeadlineNotPassed();
    error DeadlinePassed();
    error ZeroAddress();
    error ZeroAmount();
    error FeeTooHigh();

    // ── Constructor ──

    constructor(address _treasury, uint256 _protocolFeeBps) Ownable(msg.sender) {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_protocolFeeBps > 1000) revert FeeTooHigh(); // max 10%
        treasury = _treasury;
        protocolFeeBps = _protocolFeeBps;
    }

    // ── Admin ──

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setProtocolFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert FeeTooHigh();
        emit ProtocolFeeUpdated(protocolFeeBps, _feeBps);
        protocolFeeBps = _feeBps;
    }

    // ── Escrow ID ──

    function getEscrowId(string calldata orderId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(orderId));
    }

    // ── Create Escrow (arbiter/platform only) ──

    function createEscrow(
        string calldata orderId,
        address buyer,
        address token,
        uint256 amount,
        uint256 deadline
    ) external onlyOwner returns (bytes32 escrowId) {
        if (buyer == address(0)) revert ZeroAddress();
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        escrowId = getEscrowId(orderId);
        if (escrowExists[escrowId]) revert EscrowAlreadyExists();

        escrows[escrowId] = Escrow({
            escrowId: escrowId,
            orderId: orderId,
            buyer: buyer,
            token: token,
            amount: amount,
            deadline: deadline,
            status: Status.Created,
            funded: false
        });
        escrowExists[escrowId] = true;

        emit EscrowCreated(escrowId, orderId, buyer, token, amount, deadline);
    }

    // ── Fund Escrow (buyer deposits tokens) ──

    function fundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != Status.Created) revert InvalidStatus(e.status, Status.Created);
        if (msg.sender != e.buyer) revert NotBuyer();
        if (block.timestamp >= e.deadline) revert DeadlinePassed();

        // Transfer tokens from buyer to this contract
        IERC20(e.token).safeTransferFrom(msg.sender, address(this), e.amount);

        e.status = Status.Funded;
        e.funded = true;

        emit EscrowFunded(escrowId, msg.sender, e.amount);
    }

    // ── Release Escrow (arbiter confirms delivery) ──

    function releaseEscrow(bytes32 escrowId) external onlyOwner nonReentrant {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != Status.Funded && e.status != Status.Disputed)
            revert InvalidStatus(e.status, Status.Funded);

        // Calculate fee
        uint256 fee = (e.amount * protocolFeeBps) / 10000;
        uint256 payout = e.amount - fee;

        e.status = Status.Released;

        // Send payout to treasury, fee stays in contract (owner can withdraw)
        IERC20(e.token).safeTransfer(treasury, payout);
        if (fee > 0) {
            IERC20(e.token).safeTransfer(owner(), fee);
        }

        emit EscrowReleased(escrowId, payout, fee);
    }

    // ── Refund Escrow (arbiter initiates refund) ──

    function refundEscrow(bytes32 escrowId) external onlyOwner nonReentrant {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != Status.Funded && e.status != Status.Disputed)
            revert InvalidStatus(e.status, Status.Funded);

        e.status = Status.Refunded;
        IERC20(e.token).safeTransfer(e.buyer, e.amount);

        emit EscrowRefunded(escrowId, e.buyer, e.amount);
    }

    // ── Dispute (buyer flags an issue) ──

    function disputeEscrow(bytes32 escrowId) external {
        Escrow storage e = _getEscrow(escrowId);
        if (msg.sender != e.buyer) revert NotBuyer();
        if (e.status != Status.Funded) revert InvalidStatus(e.status, Status.Funded);

        e.status = Status.Disputed;

        emit EscrowDisputed(escrowId, msg.sender);
    }

    // ── Auto-Refund (anyone can call after deadline) ──

    function autoRefund(bytes32 escrowId) external nonReentrant {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != Status.Funded && e.status != Status.Disputed)
            revert InvalidStatus(e.status, Status.Funded);
        if (block.timestamp < e.deadline) revert DeadlineNotPassed();

        e.status = Status.Refunded;
        IERC20(e.token).safeTransfer(e.buyer, e.amount);

        emit EscrowRefunded(escrowId, e.buyer, e.amount);
    }

    // ── Resolve Dispute (arbiter decides) ──

    function resolveDispute(bytes32 escrowId, bool releaseToTreasury) external onlyOwner nonReentrant {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != Status.Disputed) revert InvalidStatus(e.status, Status.Disputed);

        if (releaseToTreasury) {
            uint256 fee = (e.amount * protocolFeeBps) / 10000;
            uint256 payout = e.amount - fee;
            e.status = Status.Released;
            IERC20(e.token).safeTransfer(treasury, payout);
            if (fee > 0) IERC20(e.token).safeTransfer(owner(), fee);
        } else {
            e.status = Status.Refunded;
            IERC20(e.token).safeTransfer(e.buyer, e.amount);
        }

        emit EscrowDisputeResolved(escrowId, releaseToTreasury);
    }

    // ── View ──

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return _getEscrow(escrowId);
    }

    // ── Internal ──

    function _getEscrow(bytes32 escrowId) internal view returns (Escrow storage) {
        if (!escrowExists[escrowId]) revert EscrowNotFound();
        return escrows[escrowId];
    }
}
