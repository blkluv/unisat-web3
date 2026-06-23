import { useState } from 'react';
import { Button, Input } from 'antd';
import { useWallet } from '@unisat/wallet-connect-react';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

export const signPsbtsConfig: DemoConfig = {
  key: 'signPsbts',
  title: 'Sign Multiple Transactions',
  category: 'signing',
  apiMethod: 'unisat.signPsbts',
  // docUrl removed — no longer displayed
  description: 'Approve and sign several Bitcoin transactions at once. Perfect for batch payments or when you need to authorize multiple transfers in one go.',
  walletConnectSupported: true,
};

export function SignPsbtsDemo() {
  const [psbtsHex, setPsbtsHex] = useState('');
  const { result, execute, isLoading } = useDemoExecution();
  const { signPsbts, wallet } = useWallet();

  const handleSign = async () => {
    const psbts = psbtsHex.split('\n').filter((p) => p.trim());
    if (psbts.length === 0) {
      throw new Error('Please enter at least one transaction to sign');
    }

    await execute(
      async () => {
        if (wallet) {
          return signPsbts(psbts.map((psbt) => ({ psbt })));
        }
        return getUnisat().signPsbts(psbts);
      },
      (results) => results.join('\n\n')
    );
  };

  return (
    <DemoCard config={signPsbtsConfig} result={result}>
      <DemoField label="Transaction Data (one per line)">
        <Input.TextArea
          value={psbtsHex}
          onChange={(e) => setPsbtsHex(e.target.value)}
          placeholder="Paste each transaction details, one per line"
          rows={4}
        />
      </DemoField>

      <Button
        type="primary"
        loading={isLoading}
        onClick={handleSign}
        style={{ marginTop: 16 }}
      >
        Sign All Transactions
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> This lets you approve multiple transfers in a single step. Instead of signing each payment one by one, you can batch them together — saving you time and clicks. Your wallet will ask you to confirm each one, but you only need to go through the process once.
      </div>
    </DemoCard>
  );
}