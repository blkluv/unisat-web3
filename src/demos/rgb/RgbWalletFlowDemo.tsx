import { useState } from 'react';
import { Button, Input, Space } from 'antd';
import { DemoCard, DemoField } from '../components/DemoCard';
import { useDemoExecution, getUnisat } from '../hooks/useDemoExecution';
import type { DemoConfig } from '../types';

const DEFAULT_WALLET_API_URL =
  process.env.REACT_APP_RGB_WALLET_API_URL || 'https://t0.degen.earth/wallet-api';

function format(data: unknown) {
  return JSON.stringify(data, null, 2);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
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
  const [assetId, setAssetId] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('0');
  const [invoice, setInvoice] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [feeRate, setFeeRate] = useState('1');
  const [sendBeginResult, setSendBeginResult] = useState<any>();
  const [signedPsbt, setSignedPsbt] = useState('');
  const { result, execute, isLoading } = useDemoExecution();

  const connect = async () => {
    await execute(async () => {
      const accounts = await getUnisat().requestAccounts();
      setAddress(accounts?.[0] || '');
      return accounts;
    }, format);
  };

  const queryAssets = async () => {
    await execute(async () => {
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
    await execute(async () => {
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

  const createIssueNia = async () => {
    await execute(async () => {
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
      const nextAssetId =
        data?.assetId || data?.asset_id || data?.data?.assetId || data?.data?.asset_id;
      if (nextAssetId) {
        setAssetId(nextAssetId);
      }
      return data;
    }, format);
  };

  const createSendBegin = async () => {
    await execute(async () => {
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
    await execute(async () => {
      const toSignData = sendBeginResult?.toSignData;
      const psbt = sendBeginResult?.psbt || toSignData?.psbtHex || sendBeginResult?.psbtHex;
      if (!psbt) throw new Error('Run send-begin first');
      const signed = await getUnisat().signRgbPsbt(psbt);
      setSignedPsbt(signed);
      return signed;
    }, format);
  };

  const sendEnd = async () => {
    await execute(async () => {
      if (!signedPsbt.trim()) throw new Error('Signed PSBT is required');
      return getUnisat().createRgbSendEnd({ signedPsbt: signedPsbt.trim() });
    }, format);
  };

  const fullSend = async () => {
    await execute(async () => {
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
    <DemoCard config={rgbWalletFlowConfig} result={result}>
      <DemoField label="Wallet API URL">
        <Input value={walletApiUrl} onChange={(e) => setWalletApiUrl(e.target.value)} />
      </DemoField>
      <DemoField label="Address">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Connected address" />
      </DemoField>
      <Space style={{ marginTop: 16 }} wrap>
        <Button loading={isLoading} onClick={connect}>Connect</Button>
        <Button loading={isLoading} onClick={queryAssets}>Query Assets</Button>
      </Space>

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
        <Button type="primary" loading={isLoading} onClick={createIssueNia}>Issue NIA Asset</Button>
      </Space>

      <DemoField label="Asset ID">
        <Input value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="rgb:..." />
      </DemoField>
      <DemoField label="Receive Amount">
        <Input value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} />
      </DemoField>
      <Space style={{ marginTop: 16 }} wrap>
        <Button loading={isLoading} onClick={() => createReceive('blind')}>Create Blind Invoice</Button>
        <Button loading={isLoading} onClick={() => createReceive('witness')}>Create Witness Invoice</Button>
      </Space>

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
        <Button loading={isLoading} onClick={createSendBegin}>Send Begin</Button>
        <Button loading={isLoading} onClick={signRgbPsbt}>Sign PSBT</Button>
        <Button loading={isLoading} onClick={sendEnd}>Send End</Button>
        <Button type="primary" loading={isLoading} onClick={fullSend}>Full Send</Button>
      </Space>
      <DemoField label="Signed PSBT">
        <Input.TextArea value={signedPsbt} onChange={(e) => setSignedPsbt(e.target.value)} rows={3} />
      </DemoField>
    </DemoCard>
  );
}
