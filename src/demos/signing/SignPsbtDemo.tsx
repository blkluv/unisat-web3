import { useState } from 'react';
import { Button, Input } from 'antd';
import { useWallet } from '@unisat/wallet-connect-react';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

export const signPsbtConfig: DemoConfig = {
  key: 'signPsbt',
  title: 'Sign Transaction',
  category: 'signing',
  apiMethod: 'unisat.signPsbt',
  // docUrl removed — no longer displayed
  description: 'Approve and sign a Bitcoin transaction with your wallet. This is like adding your digital signature to authorize a payment or contract.',
  walletConnectSupported: true,
};

export function SignPsbtDemo() {
  const [psbtHex, setPsbtHex] = useState('');
  const { result, execute, isLoading } = useDemoExecution();
  const { signPsbt, wallet } = useWallet();

  const handleSign = async () => {
    if (!psbtHex.trim()) {
      throw new Error('Please enter a transaction to sign');
    }

    await execute(async () => {
      if (wallet) {
        return signPsbt(psbtHex);
      }
      return getUnisat().signPsbt(psbtHex);
    });
  };

  return (
    <DemoCard config={signPsbtConfig} result={result}>
      <DemoField label="Transaction Data">
        <Input.TextArea
          value={psbtHex}
          onChange={(e) => setPsbtHex(e.target.value)}
          placeholder="Paste the transaction details here"
          rows={3}
        />
      </DemoField>

      <Button
        type="primary"
        loading={isLoading}
        onClick={handleSign}
        style={{ marginTop: 16 }}
      >
        Sign Transaction
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> Signing a transaction with your wallet confirms that you approve the transfer. It's like authorizing a payment — your signature proves it's really you, without exposing your private keys.
      </div>
    </DemoCard>
  );
}