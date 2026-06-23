import { useState } from 'react';
import { Alert, Button, Input, Space, Spin } from 'antd';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig, DemoResult } from '../types';

const DEFAULT_WALLET_API_URL =
  process.env.REACT_APP_RGB_WALLET_API_URL || 'https://t0.degen.earth/wallet-api';

function format(data: unknown) {
  return JSON.stringify(data, null, 2);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function assertOkResponse(data: any) {
  if (data && typeof data === 'object' && 'code' in data && data.code !== 0) {
    throw data;
  }
  return data;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

export const rgbWalletFlowConfig: DemoConfig = {
  key: 'rgbWalletFlow',
  title: 'Manage Digital Assets (RGB)',
  category: 'rgb',
  apiMethod: 'unisat.createRgb* / unisat.signRgbPsbt',
  // docUrl removed — no longer displayed
  description:
    'Complete workflow for issuing, receiving, and sending digital assets on the Bitcoin network using the RGB protocol — think of it as creating and transferring your own tokens or collectibles.',
};

export function RgbWalletFlowDemo() {
  const [walletApiUrl, setWalletApiUrl] = useState(DEFAULT_WALLET_API_URL);
  const [address, setAddress] = useState('');
  const [issueTicker, setIssueTicker] = useState('TST');
  const [issueName, setIssueName] = useState('Test RGB Asset');
  const [issuePrecision, setIssuePrecision] = useState('0');
  const [issueAmounts, setIssueAmounts] = useState('1000');
  const [utxoCount, setUtxoCount] = useState('1');
  const [utxoSize, setUtxoSize] = useState('5000');
  const [utxoFeeRate, setUtxoFeeRate] = useState('1');
  const [createUtxosBeginResult, setCreateUtxosBeginResult] = useState<any>();
  const [createUtxosSignedPsbt, setCreateUtxosSignedPsbt] = useState('');
  const [assetId, setAssetId] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('0');
  const [invoice, setInvoice] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [feeRate, setFeeRate] = useState('1');
  const [sendBeginResult, setSendBeginResult] = useState<any>();
  const [signedPsbt, setSignedPsbt] = useState('');
  const walletExecution = useDemoExecution();
  const utxoExecution = useDemoExecution();
  const issueExecution = useDemoExecution();
  const receiveExecution = useDemoExecution();
  const sendExecution = useDemoExecution();

  const connect = async () => {
    await walletExecution.execute(async () => {
      const accounts = await getUnisat().requestAccounts();
      setAddress(accounts?.[0] || '');
      return accounts;
    }, format);
  };

  const queryAssets = async () => {
    await walletExecution.execute(async () => {
      const targetAddress = address || (await getUnisat().getAccounts())?.[0];
      if (!targetAddress) throw new Error('Please connect your wallet first');
      setAddress(targetAddress);
      const url = `${normalizeBaseUrl(walletApiUrl)}/v5/rgb/address/${encodeURIComponent(
        targetAddress
      )}/assets?page=1&page_size=20`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`wallet-api ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    }, format);
  };

  const createReceive = async (kind: 'blind' | 'witness') => {
    await receiveExecution.execute(async () => {
      const method = kind === 'blind' ? 'createRgbBlindReceive' : 'createRgbWitnessReceive';
      const data = await getUnisat()[method]({
        assetId: assetId || undefined,
        amount: receiveAmount || '0',
      });
      if (data?.invoice) {
        setInvoice(data.invoice);
      }
      return data;
    }, format);
  };

  const createRgbUtxosBegin = async () => {
    await utxoExecution.execute(async () => {
      const data = await getUnisat().createRgbUtxosBegin({
        upTo: true,
        num: optionalNumber(utxoCount),
        size: optionalNumber(utxoSize),
        feeRate: optionalNumber(utxoFeeRate),
      });
      setCreateUtxosBeginResult(data);
      setCreateUtxosSignedPsbt('');
      return data;
    }, format);
  };

  const signCreateUtxosPsbt = async () => {
    await utxoExecution.execute(async () => {
      const toSignData = createUtxosBeginResult?.toSignData;
      const psbt =
        createUtxosBeginResult?.psbt ||
        toSignData?.psbtHex ||
        createUtxosBeginResult?.psbtHex;
      if (!psbt) throw new Error('Please run "Prepare Transaction" first');
      const signed = await getUnisat().signRgbPsbt(psbt);
      setCreateUtxosSignedPsbt(signed);
      return signed;
    }, format);
  };

  const createRgbUtxosEnd = async () => {
    await utxoExecution.execute(async () => {
      if (!createUtxosSignedPsbt.trim()) throw new Error('Signed transaction is required');
      return getUnisat().createRgbUtxosEnd({ signedPsbt: createUtxosSignedPsbt.trim() });
    }, format);
  };

  const fullCreateRgbUtxo = async () => {
    await utxoExecution.execute(async () => {
      const begin = await getUnisat().createRgbUtxosBegin({
        upTo: true,
        num: optionalNumber(utxoCount),
        size: optionalNumber(utxoSize),
        feeRate: optionalNumber(utxoFeeRate),
      });
      const toSignData = begin?.toSignData;
      const psbt = begin?.psbt || toSignData?.psbtHex || begin?.psbtHex;
      if (!psbt) throw new Error('Could not prepare the transaction');
      const signed = await getUnisat().signRgbPsbt(psbt);
      const end = await getUnisat().createRgbUtxosEnd({ signedPsbt: signed });
      setCreateUtxosBeginResult(begin);
      setCreateUtxosSignedPsbt(signed);
      return { begin, signed, end };
    }, format);
  };

  const createIssueNia = async () => {
    await issueExecution.execute(async () => {
      const amounts = issueAmounts
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!issueTicker.trim()) throw new Error('Asset symbol is required');
      if (!issueName.trim()) throw new Error('Asset name is required');
      if (!amounts.length) throw new Error('At least one amount is required');

      const data = await getUnisat().createRgbIssueNia({
        ticker: issueTicker.trim().toUpperCase(),
        name: issueName.trim(),
        precision: Number(issuePrecision || '0'),
        amounts,
      });
      assertOkResponse(data);
      const nextAssetId =
        data?.assetId || data?.asset_id || data?.data?.assetId || data?.data?.asset_id;
      if (nextAssetId) {
        setAssetId(nextAssetId);
      }
      return data;
    }, format);
  };

  const createSendBegin = async () => {
    await sendExecution.execute(async () => {
      if (!invoice.trim()) throw new Error('Invoice is required');
      if (!assetId.trim()) throw new Error('Asset ID is required');
      if (!sendAmount.trim()) throw new Error('Send amount is required');
      const data = await getUnisat().createRgbSendBegin({
        invoice: invoice.trim(),
        assetId: assetId.trim(),
        amount: sendAmount,
        feeRate: Number(feeRate || '1'),
      });
      setSendBeginResult(data);
      setSignedPsbt('');
      return data;
    }, format);
  };

  const signRgbPsbt = async () => {
    await sendExecution.execute(async () => {
      const toSignData = sendBeginResult?.toSignData;
      const psbt = sendBeginResult?.psbt || toSignData?.psbtHex || sendBeginResult?.psbtHex;
      if (!psbt) throw new Error('Please prepare the transaction first');
      const signed = await getUnisat().signRgbPsbt(psbt);
      setSignedPsbt(signed);
      return signed;
    }, format);
  };

  const sendEnd = async () => {
    await sendExecution.execute(async () => {
      if (!signedPsbt.trim()) throw new Error('Signed transaction is required');
      return getUnisat().createRgbSendEnd({ signedPsbt: signedPsbt.trim() });
    }, format);
  };

  const fullSend = async () => {
    await sendExecution.execute(async () => {
      if (!invoice.trim()) throw new Error('Invoice is required');
      if (!assetId.trim()) throw new Error('Asset ID is required');
      if (!sendAmount.trim()) throw new Error('Send amount is required');
      const begin = await getUnisat().createRgbSendBegin({
        invoice: invoice.trim(),
        assetId: assetId.trim(),
        amount: sendAmount,
        feeRate: Number(feeRate || '1'),
      });
      const toSignData = begin?.toSignData;
      const psbt = begin?.psbt || toSignData?.psbtHex || begin?.psbtHex;
      if (!psbt) throw new Error('Could not prepare the transaction');
      const signed = await getUnisat().signRgbPsbt(psbt);
      const end = await getUnisat().createRgbSendEnd({ signedPsbt: signed });
      setSendBeginResult(begin);
      setSignedPsbt(signed);
      return { begin, signed, end };
    }, format);
  };

  return (
    <DemoCard config={rgbWalletFlowConfig}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, textAlign: 'left' }}
        message="What is RGB?"
        description="RGB is a protocol that lets you create and manage digital assets on Bitcoin — similar to how you might create a custom token or digital collectible. This workflow guides you through the entire process: creating, receiving, and sending these assets."
      />

      <RgbSection title="Wallet Connection">
        <DemoField label="Wallet API URL">
          <Input value={walletApiUrl} onChange={(e) => setWalletApiUrl(e.target.value)} />
        </DemoField>
        <DemoField label="Your Wallet Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Connect your wallet to see your address" />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={walletExecution.isLoading} onClick={connect}>Connect Wallet</Button>
          <Button loading={walletExecution.isLoading} onClick={queryAssets}>View My Assets</Button>
        </Space>
        <SectionResult result={walletExecution.result} />
      </RgbSection>

      <RgbSection title="Prepare Storage (UTXO)">
        <p style={{ fontSize: 13, color: '#666' }}>Before creating assets, you need to reserve some Bitcoin space to store them.</p>
        <DemoField label="Storage Count">
          <Input value={utxoCount} onChange={(e) => setUtxoCount(e.target.value)} placeholder="How many storage slots to create" />
        </DemoField>
        <DemoField label="Storage Size">
          <Input value={utxoSize} onChange={(e) => setUtxoSize(e.target.value)} placeholder="Size of each storage slot" />
        </DemoField>
        <DemoField label="Transaction Fee Rate">
          <Input value={utxoFeeRate} onChange={(e) => setUtxoFeeRate(e.target.value)} placeholder="Fee rate in satoshis per byte" />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={utxoExecution.isLoading} onClick={createRgbUtxosBegin}>1. Prepare Storage</Button>
          <Button loading={utxoExecution.isLoading} onClick={signCreateUtxosPsbt}>2. Sign Storage Creation</Button>
          <Button loading={utxoExecution.isLoading} onClick={createRgbUtxosEnd}>3. Complete Storage</Button>
          <Button type="primary" loading={utxoExecution.isLoading} onClick={fullCreateRgbUtxo}>⚡ Full Setup (All Steps)</Button>
        </Space>
        <SectionResult result={utxoExecution.result} />
        <DemoField label="Signed Transaction Data">
          <Input.TextArea
            value={createUtxosSignedPsbt}
            onChange={(e) => setCreateUtxosSignedPsbt(e.target.value)}
            rows={3}
            placeholder="Signed transaction will appear here after signing"
          />
        </DemoField>
      </RgbSection>

      <RgbSection title="Create Your Own Asset">
        <p style={{ fontSize: 13, color: '#666' }}>This is where you create your own digital token or collectible.</p>
        <DemoField label="Asset Symbol">
          <Input
            value={issueTicker}
            onChange={(e) => setIssueTicker(e.target.value.toUpperCase())}
            placeholder="e.g., MYTKN (max 8 characters)"
          />
        </DemoField>
        <DemoField label="Asset Name">
          <Input value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder="e.g., My Test Token" />
        </DemoField>
        <DemoField label="Decimal Precision">
          <Input value={issuePrecision} onChange={(e) => setIssuePrecision(e.target.value)} placeholder="0 = whole numbers only" />
        </DemoField>
        <DemoField label="Supply Amounts">
          <Input
            value={issueAmounts}
            onChange={(e) => setIssueAmounts(e.target.value)}
            placeholder="e.g., 1000 or 1000,2000 (for multiple batches)"
          />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button type="primary" loading={issueExecution.isLoading} onClick={createIssueNia}>Create New Asset</Button>
        </Space>
        <SectionResult result={issueExecution.result} />
        {assetId && (
          <Alert
            type="success"
            style={{ marginTop: 12 }}
            message="Asset Created!"
            description={`Your asset ID is: ${assetId.slice(0, 30)}... Keep this safe — it's how you identify your asset.`}
          />
        )}
      </RgbSection>

      <RgbSection title="Receive Assets">
        <p style={{ fontSize: 13, color: '#666' }}>Generate an invoice to receive assets from someone else.</p>
        <DemoField label="Asset ID (to receive)">
          <Input value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="Paste the asset ID you want to receive" />
        </DemoField>
        <DemoField label="Amount to Receive">
          <Input value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} placeholder="How much you want to receive" />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={receiveExecution.isLoading} onClick={() => createReceive('blind')}>Generate Standard Invoice</Button>
          <Button loading={receiveExecution.isLoading} onClick={() => createReceive('witness')}>Generate Advanced Invoice</Button>
        </Space>
        <SectionResult result={receiveExecution.result} />
        {invoice && (
          <Alert
            type="success"
            style={{ marginTop: 12 }}
            message="Invoice Generated"
            description={<div style={{ wordBreak: 'break-all' }}>{invoice}</div>}
          />
        )}
      </RgbSection>

      <RgbSection title="Send Assets">
        <p style={{ fontSize: 13, color: '#666' }}>Use an invoice from the recipient to send your assets.</p>
        <DemoField label="Recipient's Invoice">
          <Input.TextArea value={invoice} onChange={(e) => setInvoice(e.target.value)} rows={3} placeholder="Paste the invoice you received from the recipient" />
        </DemoField>
        <DemoField label="Amount to Send">
          <Input value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="How much to send" />
        </DemoField>
        <DemoField label="Transaction Fee Rate">
          <Input value={feeRate} onChange={(e) => setFeeRate(e.target.value)} placeholder="Fee rate in satoshis per byte" />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={sendExecution.isLoading} onClick={createSendBegin}>1. Prepare Transfer</Button>
          <Button loading={sendExecution.isLoading} onClick={signRgbPsbt}>2. Sign Transfer</Button>
          <Button loading={sendExecution.isLoading} onClick={sendEnd}>3. Complete Transfer</Button>
          <Button type="primary" loading={sendExecution.isLoading} onClick={fullSend}>⚡ Full Transfer (All Steps)</Button>
        </Space>
        <SectionResult result={sendExecution.result} />
        <DemoField label="Signed Transaction Data">
          <Input.TextArea value={signedPsbt} onChange={(e) => setSignedPsbt(e.target.value)} rows={3} placeholder="Signed transaction will appear here after signing" />
        </DemoField>
      </RgbSection>

      <div style={{ marginTop: 24, fontSize: 13, color: '#666', textAlign: 'left' }}>
        💡 <strong>What this does:</strong> This is the complete workflow for creating and managing custom assets on Bitcoin. You can:
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><strong>Create</strong> your own tokens or collectibles with custom names and symbols</li>
          <li><strong>Receive</strong> assets from others using invoices</li>
          <li><strong>Send</strong> assets to anyone with a compatible wallet</li>
          <li>All transactions are secured by your Bitcoin wallet — you approve every step</li>
        </ul>
      </div>
    </DemoCard>
  );
}

function RgbSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        borderTop: '1px solid #f0f0f0',
        marginTop: 18,
        paddingTop: 14,
        textAlign: 'left',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      {children}
    </section>
  );
}

function SectionResult({ result }: { result?: DemoResult }) {
  if (!result || result.status === 'idle') {
    return null;
  }

  if (result.status === 'loading') {
    return (
      <div style={{ marginTop: 12 }}>
        <Spin size="small" />
        <span style={{ marginLeft: 8 }}>Processing...</span>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <Alert
        type="error"
        message="Something went wrong"
        description={<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.error}</div>}
        style={{ marginTop: 12 }}
      />
    );
  }

  if (result.status === 'success') {
    return (
      <Alert
        type="success"
        message="Done!"
        description={
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 180, overflow: 'auto' }}>
            {result.data}
          </div>
        }
        style={{ marginTop: 12 }}
      />
    );
  }

  return null;
}