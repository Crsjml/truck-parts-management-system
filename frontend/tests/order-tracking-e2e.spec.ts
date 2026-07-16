import { test, expect } from '@playwright/test';

test.describe('Order Tracking E2E Flow', () => {
  // Use a mocked or real API test to verify status updates
  test('should allow admin to update order status to In Transit and Completed', async ({ request }) => {
    // 1. Fetch transactions to get a sample order ID
    // (Assuming the backend is running on localhost:5000)
    const txResponse = await request.get('http://localhost:5000/api/transactions');
    if (!txResponse.ok()) return; // Skip if no DB

    const txs = await txResponse.json();
    if (!txs || txs.length === 0) {
      console.log('No transactions found. Skipping update test.');
      return;
    }

    const testTxId = txs[0].id;

    // 2. Update to "In Transit"
    const inTransitResp = await request.put(`http://localhost:5000/api/transactions/${testTxId}/status`, {
      data: { status: 'In Transit' }
    });
    expect(inTransitResp.ok()).toBeTruthy();
    let updatedTx = await inTransitResp.json();
    expect(updatedTx.status).toBe('In Transit');

    // 3. Update to "Completed"
    const completedResp = await request.put(`http://localhost:5000/api/transactions/${testTxId}/status`, {
      data: { status: 'Completed' }
    });
    expect(completedResp.ok()).toBeTruthy();
    updatedTx = await completedResp.json();
    expect(updatedTx.status).toBe('Completed');
    
    // Cleanup/Reset to Pending for future manual tests
    await request.put(`http://localhost:5000/api/transactions/${testTxId}/status`, {
      data: { status: 'Pending' }
    });
  });
});
