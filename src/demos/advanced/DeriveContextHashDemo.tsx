import { useState } from 'react';
import { Alert, Button, Input } from 'antd';
import { DemoCard, DemoField } from '../components/DemoCard';
import { getUnisat, useDemoExecution } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

export const deriveContextHashConfig: DemoConfig = {
  key: 'deriveContextHash',
  title: 'Generate App Identifier',
  category: 'advanced',
  apiMethod: 'unisat.deriveContextHash',
  // docUrl removed — no longer displayed
  description: 'Create a unique identifier for your application session. This helps your wallet and app communicate securely without sharing sensitive information.',
  walletConnectSupported: false,
};

export function DeriveContextHashDemo() {
  const [appName, setAppName] = useState('test-app-name');
  const [context, setContext] = useState('000000000000');
  const { result, execute, isLoading } = useDemoExecution();

  const handleDerive = async () => {
    await execute(async () => {
      return getUnisat().deriveContextHash(appName, context);
    });
  };

  return (
    <DemoCard config={deriveContextHashConfig} result={result}>
      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 16, textAlign: 'left' }}
        message="Advanced Feature"
        description="This is an advanced feature that may change in future wallet versions. Use with caution."
      />

      <DemoField label="App Name">
        <Input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Enter your app name (e.g., my-cool-app)"
        />
      </DemoField>

      <DemoField label="Context">
        <Input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter a unique context identifier"
        />
      </DemoField>

      <Button
        type="primary"
        loading={isLoading}
        onClick={handleDerive}
        style={{ marginTop: 16, width: '100%' }}
        disabled={!appName.trim() || !context.trim()}
      >
        Generate Identifier
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> This generates a unique "fingerprint" for your app session. It's used internally to securely link your wallet to your app without exposing your private keys. Think of it as creating a temporary handshake between your app and your wallet — it ensures they're talking to each other safely.
      </div>
    </DemoCard>
  );
}