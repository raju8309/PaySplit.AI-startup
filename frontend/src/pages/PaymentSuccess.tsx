import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getPayment } from "../lib/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    if (!paymentId) {
      setStatus("missing payment_id");
      return;
    }

    let cancelled = false;

    // Poll for a short time because webhook may arrive slightly later
    const poll = async () => {
      for (let i = 0; i < 10; i++) {
        try {
          const p = await getPayment(paymentId);
          if (cancelled) return;
          setStatus(p.status);
          if (p.status === "paid") return;
        } catch (e) {
          // ignore and retry
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Payment Success</h2>
      <p>Payment ID: {paymentId || "N/A"}</p>
      <p>Status: <b>{status}</b></p>

      <div style={{ marginTop: 16 }}>
        <Link to="/">Go back</Link>
      </div>
    </div>
  );
}