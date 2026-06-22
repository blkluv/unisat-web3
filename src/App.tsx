import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { Button, Card, Collapse, Radio, Tabs } from 'antd';
import { CHAINS_MAP, ChainType } from './const';
import { copyToClipboard, satoshisToAmount } from './utils';
import useMessage from 'antd/es/message/useMessage';
import { useWallet } from '@unisat/wallet-connect-react';
import { getDemosByCategory, CATEGORY_LABELS } from './demos';

type AppProps = {
  initialChainType?: ChainType;
  onBeforeConnect?: () => Promise<void>;
  onChainTypeChange?: (chainType: ChainType) => void;
};

function App({
  initialChainType = ChainType.BITCOIN_MAINNET,
  onBeforeConnect,
  onChainTypeChange,
}: AppProps) {
  const { account, wallet, isConnecting, isInitialized, connect, disconnect } = useWallet();
  const connected = !!account;

  const [balanceV2, setBalanceV2] = useState({
    available: 0,
    unavailable: 0,
    total: 0,
  });
  const [network, setNetwork] = useState('livenet');
  const [version, setVersion] = useState('');
  const [chainType, setChainType] = useState<ChainType>(initialChainType);

  const chain = CHAINS_MAP[chainType];
  const [messageApi, contextHolder] = useMessage();
  const accountTextClassName = connected ? '' : 'placeholder-text';

  useEffect(() => {
    setChainType(initialChainType);
  }, [initialChainType]);

  const getBasicInfo = useCallback(async () => {
    const unisat = (window as any).unisat;
    if (!unisat) return;

    try {
      const balanceV2 = await unisat.getBalanceV2();
      setBalanceV2(balanceV2);
    } catch (e) {}

    try {
      const chain = await unisat.getChain();
      setChainType(chain.enum);
      onChainTypeChange?.(chain.enum);
    } catch (e) {}

    try {
      const network = await unisat.getNetwork();
      setNetwork(network);
    } catch (e) {}

    try {
      const version = await unisat.getVersion();
      setVersion(version);
    } catch (e) {}
  }, [onChainTypeChange]);

  useEffect(() => {
    if (account) getBasicInfo();
  }, [account, getBasicInfo]);

  useEffect(() => {
    const unisat = (window as any).unisat;
    if (!unisat) return;

    const handleNetworkChanged = (network: string) => {
      setNetwork(network);
      getBasicInfo();
    };

    const handleChainChanged = (chain: { enum: ChainType }) => {
      setChainType(chain.enum);
      onChainTypeChange?.(chain.enum);
      getBasicInfo();
    };

    unisat.on('networkChanged', handleNetworkChanged);
    unisat.on('chainChanged', handleChainChanged);

    return () => {
      unisat.removeListener('networkChanged', handleNetworkChanged);
      unisat.removeListener('chainChanged', handleChainChanged);
    };
  }, [getBasicInfo, onChainTypeChange]);

  if (!isInitialized) {
    return (
      <div className="app-shell">
        {contextHolder}
        <div className="loading">Loading wallet...</div>
      </div>
    );
  }

  const unisat = (window as any).unisat;

  const handleConnect = async () => {
    await onBeforeConnect?.();
    connect();
  };

  const demosByCategory = getDemosByCategory();

  const tabItems = Array.from(demosByCategory.entries()).map(([category, demos]) => ({
    key: category,
    label: CATEGORY_LABELS[category],
    children: (
      <Collapse accordion className="glass-collapse">
        {demos.map((demo) => (
          <Collapse.Panel
            key={demo.config.key}
            header={<div className="panel-title">{demo.config.apiMethod || demo.config.title}</div>}
            collapsible={connected ? undefined : 'disabled'}
          >
            <demo.component />
          </Collapse.Panel>
        ))}
      </Collapse>
    ),
  }));

  const chains = Object.keys(CHAINS_MAP).map((key) => {
    const chain = CHAINS_MAP[key as ChainType];
    return { label: chain.label, value: chain.enum };
  });

  const supportLegacyNetworks = ['livenet', 'testnet'];

  return (
    <div className="app-shell">
      {contextHolder}

      <header className="top-bar">
        <div className="brand">SatCash</div>

        <div className="wallet-meta">
          {wallet && <span className="wallet-source">via {wallet.config.name}</span>}
        </div>

        <div>
          {connected ? (
            <Button className="btn-outline" onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button className="btn-primary" onClick={handleConnect} loading={isConnecting}>
              Connect
            </Button>
          )}
        </div>
      </header>

      <div className="grid">
        <div className="left">
          <Card className="glass-card" title="Wallet Info">
            <div className="field">
              <div className="label">Version</div>
              <div className="value">{version || '-'}</div>
            </div>

            <div className="field">
              <div className="label">Chain</div>
              <Radio.Group
                value={chain.enum}
                onChange={async (e) => {
                  if (!unisat) return;
                  const next = e.target.value as ChainType;
                  const res = await unisat.switchChain(next);
                  setChainType(res.enum);
                }}
              >
                {chains.map((c) => (
                  <Radio key={c.value} value={c.value}>
                    {c.label}
                  </Radio>
                ))}
              </Radio.Group>
            </div>

            <div className="field">
              <div className="label">Network</div>
              {supportLegacyNetworks.includes(network) ? (
                <Radio.Group
                  value={network}
                  onChange={async (e) => {
                    if (!unisat) return;
                    const res = await unisat.switchNetwork(e.target.value);
                    setNetwork(res);
                  }}
                >
                  <Radio value="livenet">Live</Radio>
                  <Radio value="testnet">Test</Radio>
                </Radio.Group>
              ) : (
                <div className="muted">Non-legacy network mode</div>
              )}
            </div>
          </Card>

          <Card className="glass-card" title="Account">
            <div className="field">
              <div className="label">Address</div>
              <div
                className={`value clickable ${accountTextClassName}`}
                onClick={() => {
                  if (!account) return;
                  copyToClipboard(account.address);
                  messageApi.success('Copied');
                }}
              >
                {account?.address || 'Not connected'}
              </div>
            </div>

            <div className="field">
              <div className="label">Public Key</div>
              <div
                className={`value clickable ${accountTextClassName}`}
                onClick={() => {
                  if (!account) return;
                  copyToClipboard(account.pubKey);
                  messageApi.success('Copied');
                }}
              >
                {account?.pubKey || 'Not connected'}
              </div>
            </div>

            <div className="field">
              <div className="label">Balance</div>
              <div className="value">
                <div>Available: {connected ? satoshisToAmount(balanceV2.available) : '-'} {chain.unit}</div>
                <div>Pending: {connected ? satoshisToAmount(balanceV2.unavailable) : '-'} {chain.unit}</div>
                <div>Total: {connected ? satoshisToAmount(balanceV2.total) : '-'} {chain.unit}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="right">
          <Tabs className="glass-tabs" items={tabItems} />
        </div>
      </div>
    </div>
  );
}

export default App;