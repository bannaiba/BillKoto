import { useState, useCallback, useMemo } from 'react';
import { formatCurrency } from '../utils/calculations';
import './ItemAssignment.css';

export default function ItemAssignment({ items, setItems, people, assignments, setAssignments, onConfirm, onBack }) {
  const [dragOverId, setDragOverId] = useState(null);

  const toggleAssignment = useCallback((itemId, personId) => {
    setAssignments((prev) => {
      const current = prev[itemId] || [];
      const isAssigned = current.includes(personId);
      return {
        ...prev,
        [itemId]: isAssigned
          ? current.filter((id) => id !== personId)
          : [...current, personId],
      };
    });
  }, [setAssignments]);

  const assignAllTo = useCallback((personId) => {
    setAssignments((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        const current = updated[item.id] || [];
        if (!current.includes(personId)) {
          updated[item.id] = [...current, personId];
        }
      });
      return updated;
    });
  }, [items, setAssignments]);

  const assignRemaining = useCallback((personId) => {
    setAssignments((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        const current = updated[item.id] || [];
        if (current.length === 0) {
          updated[item.id] = [personId];
        }
      });
      return updated;
    });
  }, [items, setAssignments]);

  const splitEvenly = useCallback(() => {
    setAssignments(() => {
      const updated = {};
      const allPeopleIds = people.map((p) => p.id);
      items.forEach((item) => {
        updated[item.id] = [...allPeopleIds];
      });
      return updated;
    });
  }, [items, people, setAssignments]);

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

    setAssignments((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }, [setItems, setAssignments]);

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

    setAssignments((prev) => {
      const updated = { ...prev };
      delete updated[sourceId];
      return updated;
    });
  };

  const unassignedCount = useMemo(
    () => items.filter((item) => !(assignments[item.id]?.length > 0)).length,
    [items, assignments]
  );

  const getInitials = (name) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const allAssigned = unassignedCount === 0;

  return (
    <div className="item-assignment animate-in">
      <div className="assign-header">
        <h2>Assign Items</h2>
        <p>Tap the people who ate each item. Shared items split evenly.</p>
      </div>

      {/* Progress bar */}
      <div className="assign-progress">
        <div className="assign-progress-bar">
          <div
            className="assign-progress-fill"
            style={{ width: `${Math.round(((items.length - unassignedCount) / items.length) * 100)}%` }}
          />
        </div>
        <span className="assign-progress-label">
          {items.length - unassignedCount} / {items.length} assigned
        </span>
      </div>

      {/* Quick actions */}
      <div className="assign-quick-actions">
        <button className="btn btn-secondary btn-sm" onClick={splitEvenly} id="split-even-btn">
          🔄 Split All Evenly
        </button>
        {unassignedCount > 0 && (
          <div className="assign-remaining-dropdown">
            <span className="assign-remaining-label">Assign {unassignedCount} remaining to:</span>
            <div className="assign-remaining-chips">
              {people.map((person) => (
                <button
                  key={person.id}
                  className="chip-mini"
                  style={{ '--chip-color': person.color }}
                  onClick={() => assignRemaining(person.id)}
                >
                  {getInitials(person.name)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unassigned warning */}
      {unassignedCount > 0 && (
        <div className="assign-warning">
          ⚠️ {unassignedCount} item{unassignedCount > 1 ? 's' : ''} not assigned yet
        </div>
      )}

      {/* Items with person chips */}
      <div className="assign-items">
        {items.map((item, index) => {
          const assigned = assignments[item.id] || [];
          const isUnassigned = assigned.length === 0;
          return (
            <div
              key={item.id}
              className={`assign-item-card glass-card ${isUnassigned ? 'unassigned' : ''} ${dragOverId === item.id ? 'drag-over' : ''}`}
              style={{ animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
            >
              <div className="assign-item-info">
                <span className="assign-item-name">{item.name || 'Unnamed item'}</span>
                <div className="assign-item-meta">
                  {item.quantity > 1 && (
                    <div className="assign-item-qty-group">
                      <span className="assign-item-qty">×{item.quantity}</span>
                      <button 
                        className="btn-icon-tiny" 
                        onClick={() => splitItem(item.id)}
                        title={`Split into ${item.quantity} individual portions`}
                      >
                        ✂
                      </button>
                    </div>
                  )}
                  <span className="assign-item-price">{formatCurrency(item.price)}</span>
                </div>
                {assigned.length > 1 && (
                  <span className="assign-item-split">÷{assigned.length} = {formatCurrency(item.price / assigned.length)} each</span>
                )}
              </div>
              <div className="assign-people-chips">
                {people.map((person) => {
                  const isSelected = assigned.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      className={`person-chip ${isSelected ? 'selected' : ''}`}
                      style={{ '--chip-color': person.color }}
                      onClick={() => toggleAssignment(item.id, person.id)}
                      title={person.name}
                    >
                      <span className="person-chip-avatar">{getInitials(person.name)}</span>
                      <span className="person-chip-name">{person.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="assign-actions">
        <button className="btn btn-secondary" onClick={onBack} id="assign-back-btn">
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={!allAssigned} id="assign-continue-btn">
          See Summary →
        </button>
      </div>
    </div>
  );
}
