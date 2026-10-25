import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Simulated UI State Machine for PayInterface
class PayInterfaceStateMachine {
  constructor(currentUser, initialBalance = 1000) {
    this.currentUser = currentUser;
    this.balance = initialBalance;
    this.recipient = null;
    this.amount = '';
    this.asset = 'USD';
    this.isSubmitting = false;
    this.error = null;
    this.success = false;
    this.executionPlan = null;
  }

  setRecipient(recipient) {
    if (recipient.id === this.currentUser.id) {
      this.error = 'SELF_SCAN: You cannot transfer funds to your own account.';
      this.recipient = null;
      return false;
    }
    this.recipient = recipient;
    this.error = null;
    return true;
  }

  setAmount(val) {
    this.amount = val;
    this.error = null;
  }

  isSubmitButtonEnabled() {
    if (this.isSubmitting) return false;
    if (!this.recipient) return false;
    const num = parseFloat(this.amount);
    if (!num || num <= 0 || isNaN(num)) return false;
    if (num > this.balance) return false;
    return true;
  }

  async executePayment(rpcMock) {
    if (!this.isSubmitButtonEnabled()) {
      return { success: false, error: 'Payment action is currently disabled.' };
    }

    // Set submitting flag (double click guard)
    this.isSubmitting = true;
    this.executionPlan = {
      step: 1,
      detail: 'Verifying liquidity...',
      status: 'active'
    };

    try {
      this.executionPlan = { step: 2, detail: 'Routing to beneficiary...', status: 'active' };
      const numAmount = parseFloat(this.amount);

      const rpcResult = await rpcMock({
        sender_id: this.currentUser.id,
        receiver_id: this.recipient.id,
        transfer_amount: numAmount,
        p_asset: this.asset
      });

      if (!rpcResult.success) {
        throw new Error(rpcResult.error || 'Transaction declined.');
      }

      this.executionPlan = { step: 3, detail: 'IFB ledger settlement confirmed.', status: 'completed' };
      this.balance -= numAmount;
      this.success = true;
      return { success: true };
    } catch (err) {
      this.error = err.message;
      return { success: false, error: err.message };
    } finally {
      this.isSubmitting = false;
    }
  }
}

describe('UI & Button Interaction State Machine Tests', () => {

  const mockUser = { id: '0129d2a5-7bee-40d2-9747-13d497d3e814', email: 'sapiensndat01@gmail.com' };
  const mockRecipient = { id: 'e2bc0ff0-b849-4ff9-a529-983b928d49a1', full_name: 'Mahir' };

  test('Submit button is disabled initially when amount and recipient are empty', () => {
    const ui = new PayInterfaceStateMachine(mockUser, 500);
    assert.equal(ui.isSubmitButtonEnabled(), false, 'Submit button should be disabled without inputs');
  });

  test('Submit button is disabled when recipient is selected but amount is empty or 0', () => {
    const ui = new PayInterfaceStateMachine(mockUser, 500);
    ui.setRecipient(mockRecipient);
    ui.setAmount('');
    assert.equal(ui.isSubmitButtonEnabled(), false);

    ui.setAmount('0');
    assert.equal(ui.isSubmitButtonEnabled(), false);
  });

  test('Submit button is disabled when amount exceeds available balance (prevents UI overdraft)', () => {
    const ui = new PayInterfaceStateMachine(mockUser, 100);
    ui.setRecipient(mockRecipient);
    ui.setAmount('150.00');
    assert.equal(ui.isSubmitButtonEnabled(), false, 'Button must remain disabled if balance is insufficient');
  });

  test('Submit button enables when valid recipient and valid amount <= balance are entered', () => {
    const ui = new PayInterfaceStateMachine(mockUser, 500);
    ui.setRecipient(mockRecipient);
    ui.setAmount('50.00');
    assert.equal(ui.isSubmitButtonEnabled(), true, 'Button should be enabled for valid transaction');
  });

  test('Self-Scan Guard blocks user from setting themselves as recipient', () => {
    const ui = new PayInterfaceStateMachine(mockUser, 500);
    const selfRecipient = { id: mockUser.id, full_name: 'Myself' };
    const accepted = ui.setRecipient(selfRecipient);
    assert.equal(accepted, false);
    assert.ok(ui.error.includes('SELF_SCAN'));
    assert.equal(ui.recipient, null);
  });

  test('Double submission protection: Button disables immediately once transfer starts', async () => {
    const ui = new PayInterfaceStateMachine(mockUser, 500);
    ui.setRecipient(mockRecipient);
    ui.setAmount('50.00');

    let rpcCallCount = 0;
    const slowRpc = async () => {
      rpcCallCount++;
      // While running, verify submit button is locked
      assert.equal(ui.isSubmitting, true);
      assert.equal(ui.isSubmitButtonEnabled(), false, 'Button must be locked during submission');
      return { success: true };
    };

    const promise = ui.executePayment(slowRpc);

    // Attempt second simultaneous click
    const secondClick = await ui.executePayment(slowRpc);
    assert.equal(secondClick.success, false, 'Simultaneous secondary click must be rejected');

    await promise;
    assert.equal(rpcCallCount, 1, 'RPC should only be invoked once despite multiple clicks');
    assert.equal(ui.success, true);
    assert.equal(ui.balance, 450.00);
  });

});
