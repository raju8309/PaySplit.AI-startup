import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SplitApproval.css';

interface Split {
  id: string;
  merchant_name: string;
  total_amount: number;
  amount: number;
  initiator_name: string;
  created_at: string;
}

export default function SplitApproval() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [split, setSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSplit = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/splits/approve-token/${token}`);
        
        if (!response.ok) {
          throw new Error('Invalid or expired approval link');
        }
        
        const data = await response.json();
        setSplit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load split');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSplit();
    }
  }, [token]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      setMessage(null);
      
      const response = await fetch('/api/splits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status: 'approved' })
      });

      if (!response.ok) {
        throw new Error('Failed to approve split');
      }

      setMessage('✅ Split approved! You will be charged shortly.');
      setTimeout(() => {
        navigate('/splits/history');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve split');
    } finally {
      setApproving(false);
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);
      setMessage(null);
      
      const response = await fetch('/api/splits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status: 'declined' })
      });

      if (!response.ok) {
        throw new Error('Failed to decline split');
      }

      setMessage('❌ Split declined.');
      setTimeout(() => {
        navigate('/splits/history');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline split');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="split-approval">
        <div className="loading">Loading payment split...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="split-approval">
        <div className="error-container">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!split) {
    return (
      <div className="split-approval">
        <div className="error-container">
          <h2>Split not found</h2>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="split-approval">
      <div className="approval-card">
        <div className="card-header">
          <h1>💳 Approve Payment Split</h1>
          <p className="subtitle">Review the payment details below</p>
        </div>

        <div className="split-details">
          <div className="detail-row">
            <span className="label">Merchant</span>
            <span className="value">{split.merchant_name}</span>
          </div>

          <div className="detail-row">
            <span className="label">Your Amount</span>
            <span className="value amount">${split.amount.toFixed(2)}</span>
          </div>

          <div className="detail-row">
            <span className="label">Total Split</span>
            <span className="value">${split.total_amount.toFixed(2)}</span>
          </div>

          <div className="detail-row">
            <span className="label">Initiated By</span>
            <span className="value">{split.initiator_name}</span>
          </div>

          <div className="detail-row">
            <span className="label">Date</span>
            <span className="value">
              {new Date(split.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'info'}`}>
            {message}
          </div>
        )}

        <div className="split-actions">
          <button 
            onClick={handleApprove} 
            className="btn-approve"
            disabled={approving || declining}
          >
            {approving ? 'Approving...' : '✓ Approve Split'}
          </button>
          <button 
            onClick={handleDecline} 
            className="btn-decline"
            disabled={approving || declining}
          >
            {declining ? 'Declining...' : '✗ Decline'}
          </button>
        </div>

        <div className="info-box">
          <p>
            <strong>⚠️ Note:</strong> By approving, you authorize the payment of ${split.amount.toFixed(2)} 
            from your linked card for {split.merchant_name}.
          </p>
        </div>
      </div>
    </div>
  );
}