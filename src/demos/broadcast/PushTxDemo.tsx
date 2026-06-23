import { useState } from 'react';
import { Button, Input } from 'antd';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

export const pushTxConfig: DemoConfig = {
  key: 'pushTx',
  title: 'Broadcast Raw Transaction',
  category: 'broadcast',
  apiMethod: 'unisat.pushTx',
  // docUrl removed — no longer displayed
  description: 'Submit your finalized transaction to the Bitcoin network. This is how you send a transaction out into the world for miners to confirm and complete.',
  walletConnectSupported: false,
};

export function PushTxDemo() {
  const [rawTx, setRawTx] = useState('');
  const { result, execute, isLoading } = useDemoExecution();

  const handlePush = async () => {
    if (!rawTx.trim()) {
      throw new Error('Please paste the transaction data you want to broadcast');
    }

    await execute(async () => {
      return getUnisat().pushTx(rawTx);
    });
  };

  return (
    <DemoCard config={pushTxConfig} result={result}>
      <DemoField label="Transaction Data">
        <Input.TextArea
          value={rawTx}
          onChange={(e) => setRawTx(e.target.value)}
          placeholder="Paste your final transaction details here"
          rows={3}
        />
      </DemoField>

      <Button
        type="primary"
        loading={isLoading}
        onClick={handlePush}
        style={{ marginTop: 16 }}
      >
        Broadcast Transaction
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> Once you've signed a transaction, it needs to be sent to the Bitcoin network so it can be confirmed. This step broadcasts your transaction to the network — similar to dropping a letter in the mailbox. Miners will then pick it up, verify it, and add it to the blockchain. After that, the transaction is complete and can't be reversed.
      </div>
    </DemoCard>
  );
}