import { useState, useCallback } from 'react';
import './ItemEditor.css';

export default function ItemEditor({ items, setItems, charges, setCharges, restaurantName, onConfirm, onBack }) {
  const [dragOverId, setDragOverId] = useState(null);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: '', quantity: 1, price: 0 },
    ]);
  }, [setItems]);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [setItems]);

  const splitItem = useCallback((id) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const item = prev[index];
      const next = [...prev];

      if (item.subItems && item.subItems.length > 0) {
        // Undo combination
        next.splice(index, 1, ...item.subItems);
      } else {
        const qty = Math.max(2, Math.round(item.quantity));
        const unitPrice = Math.round((item.price / qty) * 100) / 100;
        const portions = Array.from({ length: qty }, (_, i) => ({
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
          name: item.name,
          quantity: 1,
          price: i === qty - 1
            ? Math.round((item.price - unitPrice * (qty - 1)) * 100) / 100
            : unitPrice,
        }));
        next.splice(index, 1, ...portions);
      }
      return next;
    });
  }, [setItems]);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (dragOverId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    setItems((prev) => {
      const sourceIndex = prev.findIndex((i) => i.id === sourceId);
      const targetIndex = prev.findIndex((i) => i.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      
      const source = prev[sourceIndex];
      const target = prev[targetIndex];
      
      const newQty = (source.quantity || 1) + (target.quantity || 1);
      const newPrice = source.price + target.price;
      const newName = source.name === target.name ? source.name : `${target.name} + ${source.name}`;
      
      const next = [...prev];
      next.splice(sourceIndex, 1);
      const newTargetIndex = next.findIndex((i) => i.id === targetId);
      
      const subItems = [];
      if (target.subItems) subItems.push(...target.subItems);
      else subItems.push({ ...target });
      
      if (source.subItems) subItems.push(...source.subItems);
      else subItems.push({ ...source });

      next[newTargetIndex] = {
        ...target,
        quantity: newQty,
        price: newPrice,
        name: newName,
        subItems
      };
      return next;
    });
  };

  const updateItem = useCallback((id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: field === 'name' ? value : Number(value) || 0 } : item
      )
    );
  }, [setItems]);

  // Central helper — computes the total given a charges object
  const calcTotal = (c) => {
    if (c.isInclusive) return c.subtotal - c.discount;
    return c.subtotal - c.discount + c.vatAmount + c.serviceChargeAmount;
  };

  const updateCharge = useCallback((field, rawValue) => {
    const value = Number(rawValue) || 0;
    setCharges((prev) => {
      const updated = { ...prev, [field]: value };

      // When % changes → derive amount from subtotal
      if (field === 'discountPercent') {
        updated.discount = Math.round((updated.subtotal * value) / 100 * 100) / 100;
      } else if (field === 'discount' && updated.subtotal > 0) {
        updated.discountPercent = Math.round((value / updated.subtotal) * 10000) / 100;
      } else if (field === 'vatPercent') {
        updated.vatAmount = Math.round((updated.subtotal * value) / 100 * 100) / 100;
      } else if (field === 'vatAmount' && updated.subtotal > 0) {
        updated.vatPercent = Math.round((value / updated.subtotal) * 10000) / 100;
      } else if (field === 'serviceChargePercent') {
        updated.serviceChargeAmount = Math.round((updated.subtotal * value) / 100 * 100) / 100;
      } else if (field === 'serviceChargeAmount' && updated.subtotal > 0) {
        updated.serviceChargePercent = Math.round((value / updated.subtotal) * 10000) / 100;
      } else if (field === 'subtotal') {
        // Re-derive all amounts from stored percentages when subtotal changes
        if (updated.discountPercent > 0)
          updated.discount = Math.round((value * updated.discountPercent) / 100 * 100) / 100;
        if (updated.vatPercent > 0)
          updated.vatAmount = Math.round((value * updated.vatPercent) / 100 * 100) / 100;
        if (updated.serviceChargePercent > 0)
          updated.serviceChargeAmount = Math.round((value * updated.serviceChargePercent) / 100 * 100) / 100;
      }

      updated.total = calcTotal(updated);
      return updated;
    });
  }, [setCharges]);

  // Recalculate subtotal from items and re-derive all amounts
  const recalcSubtotal = useCallback(() => {
    const sub = items.reduce((sum, item) => sum + item.price, 0);
    setCharges((prev) => {
      const updated = { ...prev, subtotal: sub };
      if (updated.discountPercent > 0)
        updated.discount = Math.round(sub * updated.discountPercent / 100 * 100) / 100;
      if (updated.vatPercent > 0)
        updated.vatAmount = Math.round(sub * updated.vatPercent / 100 * 100) / 100;
      if (updated.serviceChargePercent > 0)
        updated.serviceChargeAmount = Math.round(sub * updated.serviceChargePercent / 100 * 100) / 100;
      updated.total = calcTotal(updated);
      return updated;
    });
  }, [items, setCharges]);

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price, 0);
  const isValid = items.length > 0 && items.some((item) => item.name.trim() && item.price > 0);

  return (
    <div className="item-editor animate-in">
      <div className="editor-header">
        <h2>Verify & Edit Items</h2>
        <p>
          {restaurantName
            ? `Items from ${restaurantName} — review and correct as needed`
            : 'Review extracted items or add your own'}
        </p>
      </div>

      {/* Items Table */}
      <div className="items-section glass-card">
        <div className="items-table-header">
          <span className="col-name">Item</span>
          <span className="col-qty">Qty</span>
          <span className="col-price">Price</span>
          <span className="col-action"></span>
          <span className="col-split"></span>
        </div>

        <div className="items-list">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`item-row ${dragOverId === item.id ? 'drag-over' : ''}`} 
              style={{ animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
            >
              <input
                className="input item-name"
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                placeholder="Item name"
                id={`item-name-${item.id}`}
              />
              <input
                className="input item-qty"
                type="number"
                value={item.quantity || ''}
                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                min="1"
                id={`item-qty-${item.id}`}
              />
              <input
                className="input item-price"
                type="number"
                value={item.price || ''}
                onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0.00"
                id={`item-price-${item.id}`}
              />
              <button
                className="btn btn-icon btn-danger"
                onClick={() => removeItem(item.id)}
                title="Remove item"
              >
                🗑️
              </button>
              {item.quantity > 1 ? (
                <button
                  className="btn btn-icon btn-split"
                  onClick={() => splitItem(item.id)}
                  title={`Split into ${item.quantity} separate portions`}
                  id={`split-item-${item.id}`}
                >
                  ✂
                </button>
              ) : (
                <span className="split-placeholder" />
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-secondary add-item-btn" onClick={addItem} id="add-item-btn">
          + Add Item
        </button>
      </div>

      {/* Charges Section */}
      <div className="charges-section glass-card">
        <h3>Charges</h3>

        {/* Subtotal */}
        <div className="charge-row">
          <label>Subtotal (from items)</label>
          <div className="charge-value">
            <span className="charge-calculated">{itemsSubtotal.toFixed(2)}</span>
            <button className="btn btn-sm btn-secondary" onClick={recalcSubtotal} title="Sync subtotal with items">
              ↻ Sync
            </button>
          </div>
        </div>
        <div className="charge-row">
          <label>Subtotal (receipt)</label>
          <input
            className="input charge-input"
            type="number"
            value={charges.subtotal || ''}
            onChange={(e) => updateCharge('subtotal', e.target.value)}
            step="0.01"
            id="charge-subtotal"
          />
        </div>

        <div className="charge-divider" />

        {/* Discount toggle */}
        <div className="charge-row">
          <label className="checkbox-label" htmlFor="charge-discount-toggle">
            <input
              type="checkbox"
              checked={(charges.discount > 0 || charges.discountPercent > 0)}
              onChange={(e) => {
                if (!e.target.checked) {
                  setCharges((prev) => {
                    const updated = { ...prev, discount: 0, discountPercent: 0 };
                    updated.total = updated.isInclusive
                      ? updated.subtotal
                      : updated.subtotal + updated.vatAmount + updated.serviceChargeAmount;
                    return updated;
                  });
                }
              }}
              id="charge-discount-toggle"
            />
            <span className="checkbox-label-text">
              <span className="checkbox-label-title">Discount</span>
              <span className="checkbox-label-sub">Apply a percentage or flat discount</span>
            </span>
            <span className={`toggle-track${(charges.discount > 0 || charges.discountPercent > 0) ? ' checked' : ''}`}>
              <span className="toggle-thumb" />
            </span>
          </label>
        </div>

        {(charges.discount > 0 || charges.discountPercent > 0) && (
          <>
            <div className="charge-pair-row">
              <div className="charge-pair-item">
                <label>%</label>
                <input
                  className="input charge-input charge-input-sm"
                  type="number"
                  value={charges.discountPercent || ''}
                  onChange={(e) => updateCharge('discountPercent', e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  id="charge-discount-percent"
                />
              </div>
              <div className="charge-pair-item">
                <label>Amount</label>
                <input
                  className="input charge-input"
                  type="number"
                  value={charges.discount || ''}
                  onChange={(e) => updateCharge('discount', e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  id="charge-discount"
                />
              </div>
            </div>
          </>
        )}

        <div className="charge-divider" />

        {/* Inclusive toggle */}
        <div className="charge-row">
          <label className="checkbox-label" htmlFor="charge-inclusive">
            <input
              type="checkbox"
              checked={charges.isInclusive || false}
              onChange={(e) => {
                const isInc = e.target.checked;
                setCharges((prev) => {
                  const updated = { ...prev, isInclusive: isInc };
                  updated.total = isInc
                    ? updated.subtotal - updated.discount
                    : updated.subtotal - updated.discount + updated.vatAmount + updated.serviceChargeAmount;
                  return updated;
                });
              }}
              id="charge-inclusive"
            />
            <span className="checkbox-label-text">
              <span className="checkbox-label-title">VAT / Service Inclusive</span>
              <span className="checkbox-label-sub">Prices already include tax &amp; service charges</span>
            </span>
            <span className={`toggle-track${charges.isInclusive ? ' checked' : ''}`}>
              <span className="toggle-thumb" />
            </span>
          </label>
        </div>

        <div className="charge-divider" />

        {/* VAT */}
        <div className="charge-group-label">VAT / Tax</div>
        <div className="charge-pair-row">
          <div className="charge-pair-item">
            <label>%</label>
            <input
              className="input charge-input charge-input-sm"
              type="number"
              value={charges.vatPercent || ''}
              onChange={(e) => updateCharge('vatPercent', e.target.value)}
              step="0.01"
              min="0"
              placeholder="0"
              id="charge-vat-percent"
            />
          </div>
          <div className="charge-pair-item">
            <label>Amount</label>
            <input
              className="input charge-input"
              type="number"
              value={charges.vatAmount || ''}
              onChange={(e) => updateCharge('vatAmount', e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              id="charge-vat-amount"
            />
          </div>
        </div>

        <div className="charge-divider" />

        {/* Service Charge */}
        <div className="charge-group-label">Service Charge</div>
        <div className="charge-pair-row">
          <div className="charge-pair-item">
            <label>%</label>
            <input
              className="input charge-input charge-input-sm"
              type="number"
              value={charges.serviceChargePercent || ''}
              onChange={(e) => updateCharge('serviceChargePercent', e.target.value)}
              step="0.01"
              min="0"
              placeholder="0"
              id="charge-service-percent"
            />
          </div>
          <div className="charge-pair-item">
            <label>Amount</label>
            <input
              className="input charge-input"
              type="number"
              value={charges.serviceChargeAmount || ''}
              onChange={(e) => updateCharge('serviceChargeAmount', e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              id="charge-service-amount"
            />
          </div>
        </div>

        <div className="charge-divider" />

        {/* Total */}
        <div className="charge-row charge-total">
          <label>Total</label>
          <input
            className="input charge-input"
            type="number"
            value={charges.total || ''}
            onChange={(e) => updateCharge('total', e.target.value)}
            step="0.01"
            id="charge-total"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="editor-actions">
        <button className="btn btn-secondary" onClick={onBack} id="editor-back-btn">
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={!isValid} id="editor-continue-btn">
          Continue →
        </button>
      </div>
    </div>
  );
}
