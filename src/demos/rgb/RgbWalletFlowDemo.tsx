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
  title: 'RGB Wallet Flow',
  category: 'rgb',
  apiMethod: 'unisat.createRgb* / unisat.signRgbPsbt',
  description:
    'Issue RGB NIA assets, query assets, create receive invoices, build an RGB transfer PSBT, sign it, and complete send-end.',
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
      if (!targetAddress) throw new Error('Connect wallet first');
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
      if (!psbt) throw new Error('Run create RGB UTXO begin first');
      const signed = await getUnisat().signRgbPsbt(psbt);
      setCreateUtxosSignedPsbt(signed);
      return signed;
    }, format);
  };

  const createRgbUtxosEnd = async () => {
    await utxoExecution.execute(async () => {
      if (!createUtxosSignedPsbt.trim()) throw new Error('Signed RGB UTXO PSBT is required');
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
      if (!psbt) throw new Error('create-begin did not return a PSBT');
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
      if (!issueTicker.trim()) throw new Error('Ticker is required');
      if (!issueName.trim()) throw new Error('Name is required');
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
      if (!invoice.trim()) throw new Error('RGB invoice is required');
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
      if (!psbt) throw new Error('Run send-begin first');
      const signed = await getUnisat().signRgbPsbt(psbt);
      setSignedPsbt(signed);
      return signed;
    }, format);
  };

  const sendEnd = async () => {
    await sendExecution.execute(async () => {
      if (!signedPsbt.trim()) throw new Error('Signed PSBT is required');
      return getUnisat().createRgbSendEnd({ signedPsbt: signedPsbt.trim() });
    }, format);
  };

  const fullSend = async () => {
    await sendExecution.execute(async () => {
      if (!invoice.trim()) throw new Error('RGB invoice is required');
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
      if (!psbt) throw new Error('send-begin did not return a PSBT');
      const signed = await getUnisat().signRgbPsbt(psbt);
      const end = await getUnisat().createRgbSendEnd({ signedPsbt: signed });
      setSendBeginResult(begin);
      setSignedPsbt(signed);
      return { begin, signed, end };
    }, format);
  };

  return (
    <DemoCard config={rgbWalletFlowConfig}>
      <RgbSection title="Wallet">
        <DemoField label="Wallet API URL">
          <Input value={walletApiUrl} onChange={(e) => setWalletApiUrl(e.target.value)} />
        </DemoField>
        <DemoField label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Connected address" />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={walletExecution.isLoading} onClick={connect}>Connect</Button>
          <Button loading={walletExecution.isLoading} onClick={queryAssets}>Query Assets</Button>
        </Space>
        <SectionResult result={walletExecution.result} />
      </RgbSection>

      <RgbSection title="RGB UTXO">
        <DemoField label="RGB UTXO Count">
          <Input value={utxoCount} onChange={(e) => setUtxoCount(e.target.value)} />
        </DemoField>
        <DemoField label="RGB UTXO Size">
          <Input value={utxoSize} onChange={(e) => setUtxoSize(e.target.value)} />
        </DemoField>
        <DemoField label="RGB UTXO Fee Rate">
          <Input value={utxoFeeRate} onChange={(e) => setUtxoFeeRate(e.target.value)} />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={utxoExecution.isLoading} onClick={createRgbUtxosBegin}>Create RGB UTXO Begin</Button>
          <Button loading={utxoExecution.isLoading} onClick={signCreateUtxosPsbt}>Sign RGB UTXO PSBT</Button>
          <Button loading={utxoExecution.isLoading} onClick={createRgbUtxosEnd}>Create RGB UTXO End</Button>
          <Button type="primary" loading={utxoExecution.isLoading} onClick={fullCreateRgbUtxo}>Full Create RGB UTXO</Button>
        </Space>
        <SectionResult result={utxoExecution.result} />
        <DemoField label="Signed RGB UTXO PSBT">
          <Input.TextArea
            value={createUtxosSignedPsbt}
            onChange={(e) => setCreateUtxosSignedPsbt(e.target.value)}
            rows={3}
          />
        </DemoField>
      </RgbSection>

      <RgbSection title="Issue Asset">
        <DemoField label="Issue Ticker">
          <Input
            value={issueTicker}
            onChange={(e) => setIssueTicker(e.target.value.toUpperCase())}
            placeholder="Uppercase, max 8 chars"
          />
        </DemoField>
        <DemoField label="Issue Name">
          <Input value={issueName} onChange={(e) => setIssueName(e.target.value)} />
        </DemoField>
        <DemoField label="Issue Precision">
          <Input value={issuePrecision} onChange={(e) => setIssuePrecision(e.target.value)} />
        </DemoField>
        <DemoField label="Issue Amounts">
          <Input
            value={issueAmounts}
            onChange={(e) => setIssueAmounts(e.target.value)}
            placeholder="1000 or 1000,2000"
          />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button type="primary" loading={issueExecution.isLoading} onClick={createIssueNia}>Issue NIA Asset</Button>
        </Space>
        <SectionResult result={issueExecution.result} />
      </RgbSection>

      <RgbSection title="Receive">
        <DemoField label="Asset ID">
          <Input value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="rgb:..." />
        </DemoField>
        <DemoField label="Receive Amount">
          <Input value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={receiveExecution.isLoading} onClick={() => createReceive('blind')}>Create Blind Invoice</Button>
          <Button loading={receiveExecution.isLoading} onClick={() => createReceive('witness')}>Create Witness Invoice</Button>
        </Space>
        <SectionResult result={receiveExecution.result} />
      </RgbSection>

      <RgbSection title="Send">
        <DemoField label="Invoice">
          <Input.TextArea value={invoice} onChange={(e) => setInvoice(e.target.value)} rows={3} />
        </DemoField>
        <DemoField label="Send Amount">
          <Input value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
        </DemoField>
        <DemoField label="Fee Rate">
          <Input value={feeRate} onChange={(e) => setFeeRate(e.target.value)} />
        </DemoField>
        <Space style={{ marginTop: 16 }} wrap>
          <Button loading={sendExecution.isLoading} onClick={createSendBegin}>Send Begin</Button>
          <Button loading={sendExecution.isLoading} onClick={signRgbPsbt}>Sign PSBT</Button>
          <Button loading={sendExecution.isLoading} onClick={sendEnd}>Send End</Button>
          <Button type="primary" loading={sendExecution.isLoading} onClick={fullSend}>Full Send</Button>
        </Space>
        <SectionResult result={sendExecution.result} />
        <DemoField label="Signed PSBT">
          <Input.TextArea value={signedPsbt} onChange={(e) => setSignedPsbt(e.target.value)} rows={3} />
        </DemoField>
      </RgbSection>
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
        <span style={{ marginLeft: 8 }}>Requesting...</span>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <Alert
        type="error"
        message="Error"
        description={<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.error}</div>}
        style={{ marginTop: 12 }}
      />
    );
  }

  if (result.status === 'success') {
    return (
      <Alert
        type="success"
        message="Success"
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
