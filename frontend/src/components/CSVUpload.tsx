import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface CSVUploadProps {
  onCardCreated: () => void;
}

interface ParsedData {
  card_suggestions: {
    name: string;
    card_type: string;
    limit: number;
    balance: number;
    rewards_rate: number;
  };
  transaction_count: number;
  category_breakdown: { [key: string]: number };
  sample_transactions: Array<{
    date: string;
    description: string;
    amount: number;
    ml_category: string;
    confidence: number;
  }>;
}

export default function CSVUpload({ onCardCreated }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/cards/upload-csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload CSV');

      const data = await response.json();
      setParsedData(data);
    } catch (err) {
      setError('Failed to parse CSV. Please check the file format.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!parsedData) return;

    try {
      const response = await fetch('http://localhost:8000/api/cards/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData.card_suggestions)
      });

      if (!response.ok) throw new Error('Failed to create card');

      setParsedData(null);
      onCardCreated();
    } catch (err) {
      setError('Failed to create card');
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Import from Bank CSV
      </h3>

      {!parsedData ? (
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="text-cyan-600 font-bold hover:text-cyan-700">
                {uploading ? 'Uploading...' : 'Click to upload CSV'}
              </span>
            </label>
            <p className="text-sm text-gray-600 mt-2 font-medium">
              Export CSV from your bank and upload here
            </p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-bold text-blue-900 mb-2">📥 How to get your CSV:</p>
            <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal font-medium">
              <li>Log into your bank website</li>
              <li>Go to "Statements" or "Transactions"</li>
              <li>Select date range (last 1-3 months)</li>
              <li>Download as CSV file</li>
              <li>Upload here!</li>
            </ol>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 font-semibold text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-900 font-bold">CSV Parsed Successfully!</p>
                <p className="text-green-800 text-sm mt-1">
                  Found {parsedData.transaction_count} transactions
                </p>
              </div>
            </div>
          </div>

          {/* Card Preview */}
          <div className="mb-6 p-5 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-2 border-cyan-200">
            <h4 className="font-bold text-gray-900 mb-3">📋 Detected Card Info:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 font-semibold">Name:</span>
                <p className="font-bold text-gray-900">{parsedData.card_suggestions.name}</p>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">Type:</span>
                <p className="font-bold text-gray-900">{parsedData.card_suggestions.card_type}</p>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">Suggested Limit:</span>
                <p className="font-bold text-gray-900">${parsedData.card_suggestions.limit}</p>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">Current Balance:</span>
                <p className="font-bold text-gray-900">${parsedData.card_suggestions.balance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-900 mb-3">📊 Spending by Category:</h4>
            <div className="space-y-2">
              {Object.entries(parsedData.category_breakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-semibold text-gray-700">{category}</span>
                    <span className="text-sm font-bold text-gray-900">${(amount as number).toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Sample Transactions */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-900 mb-3">🧾 Sample Transactions:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {parsedData.sample_transactions.slice(0, 5).map((txn, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {txn.ml_category} • {txn.date}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900">${txn.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCreateCard}
              className="flex-1 bg-cyan-500 text-white py-3 rounded-lg font-bold hover:bg-cyan-600 shadow-lg"
            >
              ✅ Create Card
            </button>
            <button
              onClick={() => setParsedData(null)}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}