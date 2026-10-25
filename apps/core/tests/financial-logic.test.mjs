import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Core Financial Helper functions mirroring DB stored procedures & client validations
function validateTransferAmount(amount) {
  const num = Number(amount);
  if (isNaN(num)) return { valid: false, error: 'Amount is not a valid number' };
  if (num <= 0) return { valid: false, error: 'Transfer amount must be strictly greater than zero' };
  if (!isFinite(num)) return { valid: false, error: 'Amount must be finite' };

  // Enforce max 2 decimal places (cents)
  const decimalParts = amount.toString().split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > 2) {
    return { valid: false, error: 'Amount cannot exceed 2 decimal places (cents)' };
  }

  return { valid: true, sanitizedAmount: Math.round(num * 100) / 100 };
}

function executeSimulatedLedgerTransfer({ senderBalance, receiverBalance, transferAmount, senderId, receiverId }) {
  if (senderId === receiverId) {
    return { success: false, error: 'Cannot transfer funds to yourself' };
  }

  const validation = validateTransferAmount(transferAmount);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cleanAmount = validation.sanitizedAmount;
  if (senderBalance < cleanAmount) {
    return {
      success: false,
      error: 'Insufficient liquid funds',
      available: senderBalance,
      requested: cleanAmount
    };
  }

  const newSenderBal = Math.round((senderBalance - cleanAmount) * 100) / 100;
  const newReceiverBal = Math.round((receiverBalance + cleanAmount) * 100) / 100;

  // Ledger invariant check: Sum of balances must remain identical
  const delta = (newSenderBal + newReceiverBal) - (senderBalance + receiverBalance);
  assert.ok(Math.abs(delta) < 0.0001, 'Ledger invariant violated: net system balance changed during P2P transfer');

  return {
    success: true,
    senderBalance: newSenderBal,
    receiverBalance: newReceiverBal,
    transferAmount: cleanAmount
  };
}

function calculateTicketSplit(ticketPrice) {
  const price = Math.round(Number(ticketPrice) * 100) / 100;
  if (price <= 0) return { organizerCut: 0, platformFee: 0, total: 0 };

  const organizerCut = Math.round(price * 0.95 * 100) / 100;
  const platformFee = Math.round((price - organizerCut) * 100) / 100;

  assert.equal(Math.round((organizerCut + platformFee) * 100) / 100, price, 'Ticket split must equal total price');
  return { organizerCut, platformFee, total: price };
}

describe('Financial Logic & Ledger Invariant Tests', () => {

  describe('Transfer Amount Validation & Anti-Exploit Guards', () => {
    test('Rejects negative transfer amounts (prevents negative drain attacks)', () => {
      const result = validateTransferAmount(-100);
      assert.equal(result.valid, false);
      assert.ok(result.error.includes('greater than zero'));
    });

    test('Rejects zero amount transfer ($0.00)', () => {
      const result = validateTransferAmount(0);
      assert.equal(result.valid, false);
    });

    test('Rejects sub-cent micro-fraction precision attacks (e.g. $10.005)', () => {
      const result = validateTransferAmount('10.005');
      assert.equal(result.valid, false);
      assert.ok(result.error.includes('2 decimal places'));
    });

    test('Accepts valid currency amount and normalizes cleanly', () => {
      const result = validateTransferAmount('125.50');
      assert.equal(result.valid, true);
      assert.equal(result.sanitizedAmount, 125.50);
    });

    test('Rejects non-numeric injection values (NaN / Infinity / SQL tokens)', () => {
      assert.equal(validateTransferAmount('DROP TABLE balances;').valid, false);
      assert.equal(validateTransferAmount(Infinity).valid, false);
      assert.equal(validateTransferAmount(NaN).valid, false);
    });
  });

  describe('Ledger Double-Entry & Overdraft Checks', () => {
    test('Prevents overdraft when sender has insufficient funds', () => {
      const res = executeSimulatedLedgerTransfer({
        senderBalance: 50.00,
        receiverBalance: 100.00,
        transferAmount: 75.00,
        senderId: 'user-A',
        receiverId: 'user-B'
      });
      assert.equal(res.success, false);
      assert.equal(res.error, 'Insufficient liquid funds');
    });

    test('Blocks self-transfers where sender == receiver', () => {
      const res = executeSimulatedLedgerTransfer({
        senderBalance: 500.00,
        receiverBalance: 500.00,
        transferAmount: 100.00,
        senderId: 'user-A',
        receiverId: 'user-A'
      });
      assert.equal(res.success, false);
      assert.ok(res.error.includes('yourself'));
    });

    test('Executes valid transfer with exact balance conservation', () => {
      const res = executeSimulatedLedgerTransfer({
        senderBalance: 1000.00,
        receiverBalance: 250.00,
        transferAmount: 150.75,
        senderId: 'user-A',
        receiverId: 'user-B'
      });
      assert.equal(res.success, true);
      assert.equal(res.senderBalance, 849.25);
      assert.equal(res.receiverBalance, 400.75);
    });

    test('Floating point boundary check (e.g. 0.10 + 0.20)', () => {
      const res = executeSimulatedLedgerTransfer({
        senderBalance: 1.00,
        receiverBalance: 0.10,
        transferAmount: 0.20,
        senderId: 'user-A',
        receiverId: 'user-B'
      });
      assert.equal(res.success, true);
      assert.equal(res.senderBalance, 0.80);
      assert.equal(res.receiverBalance, 0.30);
    });
  });

  describe('Event Ticket Platform Cut & Revenue Conservation', () => {
    test('Calculates 95% organizer payout and 5% platform fee with 0 loss', () => {
      const split = calculateTicketSplit(100.00);
      assert.equal(split.organizerCut, 95.00);
      assert.equal(split.platformFee, 5.00);
      assert.equal(split.total, 100.00);
    });

    test('Handles fractional ticket prices accurately (e.g. $19.99)', () => {
      const split = calculateTicketSplit(19.99);
      // 19.99 * 0.95 = 18.9905 -> 18.99
      assert.equal(split.organizerCut, 18.99);
      assert.equal(split.platformFee, 1.00);
      assert.equal(split.organizerCut + split.platformFee, 19.99);
    });

    test('Free tickets ($0.00) produce 0 fees and 0 payouts', () => {
      const split = calculateTicketSplit(0);
      assert.equal(split.organizerCut, 0);
      assert.equal(split.platformFee, 0);
    });
  });

});
