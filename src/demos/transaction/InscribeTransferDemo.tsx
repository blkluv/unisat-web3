import { useState } from 'react';
import { Button, Input, InputNumber } from 'antd';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

export const inscribeTransferConfig: DemoConfig = {
  key: 'inscribeTransfer',
  title: 'Send Digital Assets',
  category: 'transaction',
  apiMethod: 'unisat.inscribeTransfer',
  // docUrl removed — no longer displayed
  description: 'Transfer your digital tokens (BRC-20) to another wallet. It\'s like sending money to a friend — quick, secure, and irreversible.',
  walletConnectSupported: false,
};

export function InscribeTransferDemo() {
  const [ticker, setTicker] = useState('');
  const [amount, setAmount] = useState<string>('1000');
  const { result, execute, isLoading } = useDemoExecution();

  const handleInscribe = async () => {
    if (!ticker.trim()) {
      throw new Error('Please enter the asset symbol you want to send');
    }
    if (!amount || Number(amount) <= 0) {
      throw new Error('Please enter a valid amount');
    }

    await execute(
      async () => {
        return getUnisat().inscribeTransfer(ticker, amount);
      },
      (result) => JSON.stringify(result, null, 2)
    );
  };

  return (
    <DemoCard config={inscribeTransferConfig} result={result}>
      <DemoField label="Asset Symbol">
        <Input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="e.g., ordi (the asset you want to send)"
        />
      </DemoField>

      <DemoField label="Amount to Send">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter how much you want to send"
        />
      </DemoField>

      <Button
        type="primary"
        loading={isLoading}
        onClick={handleInscribe}
        style={{ marginTop: 16 }}
      >
        Send Transfer
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> This creates and sends a transfer request for your digital tokens. Once confirmed, the assets will move from your wallet to the recipient's wallet. It works just like sending money — only faster and without the bank fees.
      </div>
    </DemoCard>
  );
}