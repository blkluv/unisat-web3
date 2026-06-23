import { useState } from 'react';
import { Button, Input } from 'antd';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

export const pushPsbtConfig: DemoConfig = {
  key: 'pushPsbt',
  title: 'Broadcast Transaction',
  category: 'broadcast',
  apiMethod: 'unisat.pushPsbt',
  // docUrl removed — no longer displayed
  description: 'Submit your signed transaction to the Bitcoin network. This is the final step to get your payment or contract executed and confirmed.',
  walletConnectSupported: false,
};

export function PushPsbtDemo() {
  const [psbtHex, setPsbtHex] = useState('');
  const { result, execute, isLoading } = useDemoExecution();

  const handlePush = async () => {
    if (!psbtHex.trim()) {
      throw new Error('Please paste the signed transaction data');
    }

    await execute(async () => {
      return getUnisat().pushPsbt(psbtHex);
    });
  };

  return (
    <DemoCard config={pushPsbtConfig} result={result}>
      <DemoField label="Signed Transaction Data">
        <Input.TextArea
          value={psbtHex}
          onChange={(e) => setPsbtHex(e.target.value)}
          placeholder="Paste your signed transaction details here"
          rows={3}
        />
      </DemoField>

      <Button
        type="primary"
        loading={isLoading}
        onClick={handlePush}
        style={{ marginTop: 16 }}
      >
        Broadcast to Network
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> After you've signed a transaction, it needs to be sent to the Bitcoin network so it can be validated and added to the blockchain. This step broadcasts your signed transaction — think of it as hitting "send" after writing a check. Once broadcasted, miners will confirm it, and the transaction will be complete.
      </div>
    </DemoCard>
  );
}