import { useState, useCallback, useRef, useEffect } from 'react';
import './PartyManager.css';

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#d946ef', '#ec4899', '#f43f5e', '#14b8a6',
];

export default function PartyManager({ people, setPeople, onConfirm, onBack }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addPerson = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setPeople((prev) => [
      ...prev,
      {
        id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
      },
    ]);
    setName('');
    inputRef.current?.focus();
  }, [name, setPeople]);

  const removePerson = useCallback((id) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }, [setPeople]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPerson();
    }
  };

  const addQuick = useCallback(() => {
    const num = people.length + 1;
    setPeople((prev) => [
      ...prev,
      {
        id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `Person ${num}`,
        color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
      },
    ]);
  }, [people.length, setPeople]);

  const getInitials = (personName) => {
    return personName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isValid = people.length >= 2;

  return (
    <div className="party-manager animate-in">
      <div className="party-header">
        <h2>Who's Splitting?</h2>
        <p>Add the people who shared the meal</p>
      </div>

      {/* Input */}
      <div className="party-input-row">
        <input
          ref={inputRef}
          className="input party-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a name..."
          id="person-name-input"
        />
        <button className="btn btn-primary" onClick={addPerson} disabled={!name.trim()} id="add-person-btn">
          Add
        </button>
        <button className="btn btn-secondary btn-sm" onClick={addQuick} title="Quick add" id="quick-add-btn">
          + Quick
        </button>
      </div>

      {/* People List */}
      {people.length > 0 && (
        <div className="people-grid">
          {people.map((person, index) => (
            <div
              key={person.id}
              className="person-card glass-card"
              style={{ animationDelay: `${index * 0.06}s`, '--person-color': person.color }}
            >
              <div className="person-avatar" style={{ background: person.color }}>
                {getInitials(person.name)}
              </div>
              <span className="person-name">{person.name}</span>
              <button
                className="person-remove"
                onClick={() => removePerson(person.id)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {people.length === 0 && (
        <div className="party-empty">
          <span className="party-empty-icon">👥</span>
          <p>Add at least 2 people to split the bill</p>
        </div>
      )}

      {people.length === 1 && (
        <div className="party-hint">
          <span>☝️</span> Add at least one more person
        </div>
      )}

      {/* People count */}
      {people.length >= 2 && (
        <div className="party-count">
          <span className="party-count-num">{people.length}</span> people splitting the bill
        </div>
      )}

      {/* Actions */}
      <div className="party-actions">
        <button className="btn btn-secondary" onClick={onBack} id="party-back-btn">
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={!isValid} id="party-continue-btn">
          Continue →
        </button>
      </div>
    </div>
  );
}
