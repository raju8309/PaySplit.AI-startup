import React from "react";
import { useSearchParams, Link } from "react-router-dom";

export default function PaymentCancel() {
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");

  return (
    <div style={{ padding: 24 }}>
      <h2>Payment Cancelled</h2>
      <p>Payment ID: {paymentId || "N/A"}</p>
      <div style={{ marginTop: 16 }}>
        <Link to="/">Go back</Link>
      </div>
    </div>
  );
}