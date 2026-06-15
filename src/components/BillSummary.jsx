import { useMemo, useState } from 'react';
import { calculateSplit, generateShareText, formatCurrency } from '../utils/calculations';
import './BillSummary.css';

export default function BillSummary({ items, charges, people, assignments, restaurantName, onStartOver, onBack }) {
  const [copiedId, setCopiedId] = useState(null);

  const breakdowns = useMemo(
    () => calculateSplit(items, charges, people, assignments),
    [items, charges, people, assignments]
  );

  const grandTotal = useMemo(
    () => breakdowns.reduce((sum, b) => sum + b.total, 0),
    [breakdowns]
  );

  const handleCopyAll = async () => {
    const text = generateShareText(breakdowns, charges);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyPerson = async (breakdown) => {
    let text = `${breakdown.person.name}: ${formatCurrency(breakdown.total)}`;
    text += `\n  Items: ${formatCurrency(breakdown.itemSubtotal)}`;
    if (breakdown.discountShare > 0) text += ` | Discount: -${formatCurrency(breakdown.discountShare)}`;
    if (breakdown.vatShare > 0) text += ` | VAT: ${formatCurrency(breakdown.vatShare)}`;
    if (breakdown.serviceShare > 0) text += ` | Service: ${formatCurrency(breakdown.serviceShare)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(breakdown.person.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* silent fail */ }
  };

  const handleShare = async () => {
    const text = generateShareText(breakdowns, charges);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FairSplit Bill Summary', text });
      } catch { /* user cancelled */ }
    } else {
      handleCopyAll();
    }
  };

  const getInitials = (name) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bill-summary animate-in">
      <div className="summary-header">
        <h2>Bill Summary</h2>
        {restaurantName && <p className="summary-restaurant">📍 {restaurantName}</p>}
        <p className="summary-subtitle">Here's what everyone owes</p>
      </div>

      {/* Person Cards */}
      <div className="summary-cards">
        {breakdowns.map((breakdown, index) => {
          if (breakdown.items.length === 0) return null;
          return (
            <div
              key={breakdown.person.id}
              className="summary-card glass-card"
              style={{
                animationDelay: `${index * 0.08}s`,
                '--person-color': breakdown.person.color,
              }}
            >
              <div className="summary-card-header">
                <div className="summary-person-info">
                  <div className="summary-avatar" style={{ background: breakdown.person.color }}>
                    {getInitials(breakdown.person.name)}
                  </div>
                  <span className="summary-person-name">{breakdown.person.name}</span>
                </div>
                <div className="summary-header-right">
                  <div className="summary-person-total">{formatCurrency(breakdown.total)}</div>
                  <button
                    className="summary-copy-btn"
                    onClick={() => handleCopyPerson(breakdown)}
                    title="Copy amount"
                    id={`copy-person-${breakdown.person.id}`}
                  >
                    {copiedId === breakdown.person.id ? '✅' : '📋'}
                  </button>
                </div>
              </div>

              <div className="summary-card-items">
                {breakdown.items.map((item, i) => (
                  <div key={i} className="summary-item-row">
                    <span className="summary-item-name">
                      {item.name}
                      {item.quantity > 1 && <span className="summary-qty-badge">×{item.quantity}</span>}
                      {item.splitCount > 1 && <span className="summary-split-badge">÷{item.splitCount}</span>}
                    </span>
                    <span className="summary-item-amount">{formatCurrency(item.shareAmount)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-card-breakdown">
                <div className="summary-breakdown-row">
                  <span>Items subtotal</span>
                  <span>{formatCurrency(breakdown.itemSubtotal)}</span>
                </div>
                {breakdown.discountShare > 0 && (
                  <div className="summary-breakdown-row" style={{ color: 'var(--success)' }}>
                    <span>Discount share</span>
                    <span>-{formatCurrency(breakdown.discountShare)}</span>
                  </div>
                )}
                {breakdown.vatShare > 0 && (
                  <div className="summary-breakdown-row">
                    <span>VAT share</span>
                    <span>{formatCurrency(breakdown.vatShare)}</span>
                  </div>
                )}
                {breakdown.serviceShare > 0 && (
                  <div className="summary-breakdown-row">
                    <span>Service charge</span>
                    <span>{formatCurrency(breakdown.serviceShare)}</span>
                  </div>
                )}
                <div className="summary-breakdown-row summary-row-total">
                  <span>Total</span>
                  <span>{formatCurrency(breakdown.total)}</span>
                </div>
              </div>


            </div>
          );
        })}
      </div>

      {/* Grand Total */}
      <div className="summary-grand glass-card summary-grand-prominent">
        <div className="summary-grand-row">
          <span>Grand Total (sum of shares)</span>
          <span className="summary-grand-amount">{formatCurrency(grandTotal)}</span>
        </div>
        <div className="summary-grand-row">
          <span>Receipt Total</span>
          <span className="summary-grand-amount">{formatCurrency(charges.total)}</span>
        </div>
        {Math.abs(grandTotal - charges.total) > 0.02 && (
          <div className="summary-grand-diff">
            ⚠️ Difference: {formatCurrency(Math.abs(grandTotal - charges.total))}
          </div>
        )}
        {Math.abs(grandTotal - charges.total) <= 0.02 && (
          <div className="summary-grand-match">✅ Totals match perfectly</div>
        )}
      </div>

      {/* Actions */}
      <div className="summary-actions">
        <button className="btn btn-secondary" onClick={onBack} id="summary-back-btn">
          ← Back
        </button>
        <button className="btn btn-secondary" onClick={handleCopyAll} id="copy-all-btn">
          {copiedId === 'all' ? '✅ Copied!' : '📋 Copy All'}
        </button>
        <button className="btn btn-primary" onClick={handleShare} id="share-btn">
          📤 Share
        </button>
      </div>

      <button className="btn btn-secondary start-over-btn" onClick={onStartOver} id="start-over-btn">
        🔄 Start Over
      </button>
    </div>
  );
}
