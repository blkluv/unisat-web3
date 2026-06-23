import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Radio } from "antd";

export function SignMessageCard() {
  const [message, setMessage] = useState("hello world~");
  const [result, setResult] = useState({
    success: false,
    error: "",
    data: "",
  });

  return (
    <Card 
      size="small" 
      title="Sign Message" 
      style={{ margin: 10 }}
      extra={<span style={{ fontSize: 12, color: "#888" }}>Prove you own this wallet</span>}
    >
      {/* The docs URL section has been removed */}

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Message:</div>
        <Input
          defaultValue={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
        />
      </div>

      {result.success ? (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold" }}>Signature:</div>
          <div style={{ wordWrap: "break-word" }}>{result.data}</div>
        </div>
      ) : (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ wordWrap: "break-word" }}>{result.error}</div>
        </div>
      )}

      <Button
        style={{ margin: 10 }}
        onClick={async () => {
          setResult({
            success: false,
            error: "Requesting...",
            data: "",
          });
          try {
            const signature = await (window as any).unisat.signMessage(message);
            setResult({
              success: true,
              error: "",
              data: signature,
            });
          } catch (e) {
            setResult({
              success: false,
              error: (e as any).message,
              data: "",
            });
          }
        }}
      >
        Sign with ECDSA
      </Button>

      <Button
        style={{ margin: 10 }}
        onClick={async () => {
          setResult({
            success: false,
            error: "Requesting...",
            data: "",
          });
          try {
            const signature = await (window as any).unisat.signMessage(
              message,
              "bip322-simple"
            );
            setResult({
              success: true,
              error: "",
              data: signature,
            });
          } catch (e) {
            setResult({
              success: false,
              error: (e as any).message,
              data: "",
            });
          }
        }}
      >
        Sign with BIP-322
      </Button>

      <div style={{ marginTop: 16, fontSize: 13, color: "#666", textAlign: "left" }}>
        💡 <strong>What this does:</strong> Signing a message with your wallet proves that you control this address. It's like a digital handshake — it confirms your identity without sending any funds.
      </div>
    </Card>
  );
}