import { useState } from 'react';
import { Button, Input, Space, Divider, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { DemoCard, DemoField } from '../components/DemoCard';
import { getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig, DemoResult } from '../types';

export const multiSignMessageConfig: DemoConfig = {
  key: 'multiSignMessage',
  title: 'Sign Multiple Messages',
  category: 'advanced',
  apiMethod: 'unisat.multiSignMessage',
  // docUrl removed — no longer displayed
  description: 'Sign several messages at once — perfect for batch verification or authorizing multiple actions in one go. Each message can use a different signature method.',
  walletConnectSupported: false,
};

interface MessageItem {
  text: string;
  type: '' | 'bip322-simple';
}

export function MultiSignMessageDemo() {
  const [messages, setMessages] = useState<MessageItem[]>([
    { text: 'hello world~', type: '' },
    { text: 'test message', type: 'bip322-simple' },
  ]);
  const [result, setResult] = useState<DemoResult>({ status: 'idle' });
  const [signatures, setSignatures] = useState<string[]>([]);

  const addMessage = () => {
    setMessages([...messages, { text: '', type: '' }]);
  };

  const removeMessage = (index: number) => {
    const newMessages = [...messages];
    newMessages.splice(index, 1);
    setMessages(newMessages);
  };

  const updateMessage = (index: number, field: keyof MessageItem, value: string) => {
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], [field]: value };
    setMessages(newMessages);
  };

  const handleSign = async () => {
    if (messages.some((msg) => !msg.text.trim())) {
      setResult({ status: 'error', error: 'Please fill in all messages before signing' });
      return;
    }

    setResult({ status: 'loading' });
    setSignatures([]);

    try {
      const sigs = await getUnisat().multiSignMessage(messages);
      setSignatures(sigs);
      setResult({ status: 'success', data: `Successfully signed ${sigs.length} message${sigs.length > 1 ? 's' : ''}` });
    } catch (e) {
      setResult({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <DemoCard config={multiSignMessageConfig} result={result}>
      <DemoField label="Messages to Sign">
        <div>
          {messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>Message {index + 1}</span>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeMessage(index)}
                  disabled={messages.length <= 1}
                />
              </div>
              <Input
                value={msg.text}
                onChange={(e) => updateMessage(index, 'text', e.target.value)}
                placeholder="Type your message here"
                style={{ marginBottom: 8 }}
              />
              <Space>
                <span>Signature Type:</span>
                <Button
                  type={msg.type === '' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => updateMessage(index, 'type', '')}
                >
                  Standard
                </Button>
                <Button
                  type={msg.type === 'bip322-simple' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => updateMessage(index, 'type', 'bip322-simple')}
                >
                  Advanced (BIP-322)
                </Button>
              </Space>
              {index < messages.length - 1 && <Divider style={{ margin: '12px 0' }} />}
            </div>
          ))}

          <Button
            type="dashed"
            onClick={addMessage}
            style={{ width: '100%', marginTop: 8 }}
            icon={<PlusOutlined />}
          >
            Add Another Message
          </Button>
        </div>
      </DemoField>

      {signatures.length > 0 && (
        <Alert
          type="info"
          style={{ marginTop: 16, textAlign: 'left' }}
          message="Signatures Generated"
          description={
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {signatures.map((sig, index) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 500 }}>Message {index + 1}:</div>
                  <div style={{ wordBreak: 'break-all', fontSize: 12 }}>{sig}</div>
                </div>
              ))}
            </div>
          }
        />
      )}

      <Button
        type="primary"
        loading={result.status === 'loading'}
        onClick={handleSign}
        style={{ marginTop: 16, width: '100%' }}
        disabled={messages.some((msg) => !msg.text.trim())}
      >
        Sign All Messages
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> This lets you sign multiple messages in a single step — ideal for verifying multiple pieces of content or authorizing several actions at once. You can mix and match signature types (Standard or Advanced) for each message. Your wallet will ask for confirmation before signing, making it secure and simple.
      </div>
    </DemoCard>
  );
}