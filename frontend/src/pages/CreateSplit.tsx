import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateSplit.css';

interface Participant {
  email: string;
  amount: string;
}

interface CreateSplitRequest {
  initiator_id: string;
  merchant_name: string;
  total_amount: number;
  participants: Array<{
    email: string;
    amount: number;
  }>;
}

export default function CreateSplit() {
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { email: '', amount: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddParticipant = () => {
    setParticipants([...participants, { email: '', amount: '' }]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (
    index: number,
    field: 'email' | 'amount',
    value: string
  ) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };

  const validateForm = (): boolean => {
    if (!merchant.trim()) {
      setError('Please enter merchant name');
      return false;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError('Please enter a valid total amount');
      return false;
    }

    if (participants.length === 0) {
      setError('Add at least one participant');
      return false;
    }

    for (const p of participants) {
      if (!p.email.trim()) {
        setError('All participants must have an email');
        return false;
      }
      if (!p.amount || parseFloat(p.amount) <= 0) {
        setError('All participants must have a valid amount');
        return false;
      }
    }

    const totalParticipants = participants.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    if (Math.abs(totalParticipants - parseFloat(totalAmount)) > 0.01) {
      setError(`Participant amounts (${totalParticipants.toFixed(2)}) don't match total (${totalAmount})`);
      return false;
    }

    return true;
  };

  const handleCreateSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const request: CreateSplitRequest = {
        initiator_id: 'current_user_id', // TODO: Get from auth context
        merchant_name: merchant,
        total_amount: parseFloat(totalAmount),
        participants: participants.map(p => ({
          email: p.email,
          amount: parseFloat(p.amount)
        }))
      };

      const response = await fetch('/api/splits/create-multi-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create split');
      }

      const data = await response.json();
      setMessage('✅ Split created! Approval links sent to participants.');
      
      setTimeout(() => {
        navigate('/splits/history');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create split');
    } finally {
      setLoading(false);
    }
  };

  const totalParticipants = participants.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );
  const remaining = Math.abs(parseFloat(totalAmount || '0') - totalParticipants);

  return (
    <div className="create-split">
      <div className="split-container">
        <div className="split-header">
          <h1>💰 Create Payment Split</h1>
          <p>Invite friends to split the bill</p>
        </div>

        <form onSubmit={handleCreateSplit} className="split-form">
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="form-section">
            <h3>Split Details</h3>

            <div className="form-group">
              <label htmlFor="merchant">Merchant Name *</label>
              <input
                id="merchant"
                type="text"
                placeholder="e.g., Italian Restaurant, Movie Theater"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="total">Total Amount *</label>
              <div className="input-with-currency">
                <span className="currency">$</span>
                <input
                  id="total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Add Participants</h3>
              <span className="participant-count">{participants.length} person{participants.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="participants-list">
              {participants.map((participant, index) => (
                <div key={index} className="participant-row">
                  <div className="participant-form">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={participant.email}
                      onChange={e => handleParticipantChange(index, 'email', e.target.value)}
                      disabled={loading}
                    />
                    <div className="input-with-currency">
                      <span className="currency">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={participant.amount}
                        onChange={e => handleParticipantChange(index, 'amount', e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {participants.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveParticipant(index)}
                      disabled={loading}
                      title="Remove participant"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-add-participant"
              onClick={handleAddParticipant}
              disabled={loading}
            >
              + Add Another Person
            </button>
          </div>

          <div className="split-summary">
            <div className="summary-row">
              <span>Total Amount:</span>
              <span className="amount">${parseFloat(totalAmount || '0').toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Participants Total:</span>
              <span className={totalParticipants === parseFloat(totalAmount || '0') ? 'amount matched' : 'amount'}>
                ${totalParticipants.toFixed(2)}
              </span>
            </div>
            {remaining > 0.01 && (
              <div className="summary-row warning">
                <span>Remaining to distribute:</span>
                <span>${remaining.toFixed(2)}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-create"
            disabled={loading || remaining > 0.01}
          >
            {loading ? 'Creating Split...' : '✓ Create Split'}
          </button>

          <p className="form-note">
            📧 Participants will receive approval links via email once the split is created.
          </p>
        </form>
      </div>
    </div>
  );
}