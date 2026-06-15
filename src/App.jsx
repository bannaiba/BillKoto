import { useState, useCallback } from 'react';
import StepWizard from './components/StepWizard';
import ReceiptUpload from './components/ReceiptUpload';
import ItemEditor from './components/ItemEditor';
import PartyManager from './components/PartyManager';
import ItemAssignment from './components/ItemAssignment';
import BillSummary from './components/BillSummary';
import TypewriterText from './components/TypewriterText';
import './App.css';

const STEPS = [
  { label: 'Upload', icon: '📸' },
  { label: 'Verify', icon: '✏️' },
  { label: 'People', icon: '👥' },
  { label: 'Assign', icon: '🍽️' },
  { label: 'Summary', icon: '💰' },
];

export default function App() {
  const [step, setStep] = useState(0);
  const [receiptImage, setReceiptImage] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [items, setItems] = useState([]);
  const [charges, setCharges] = useState({
    subtotal: 0,
    discountPercent: 0,
    discount: 0,
    vatPercent: 0,
    vatAmount: 0,
    serviceChargePercent: 0,
    serviceChargeAmount: 0,
    isInclusive: false,
    total: 0,
  });
  const [people, setPeople] = useState([]);
  const [assignments, setAssignments] = useState({});

  const handleReceiptParsed = useCallback((data) => {
    setItems(data.items);
    setCharges(data.charges);
    if (data.restaurantName) setRestaurantName(data.restaurantName);
    setStep(1);
  }, []);

  const handleSkipUpload = useCallback(() => {
    setItems([
      { id: `item-${Date.now()}`, name: '', quantity: 1, price: 0 },
    ]);
    setStep(1);
  }, []);

  const handleItemsConfirmed = useCallback(() => {
    setStep(2);
  }, []);

  const handlePeopleConfirmed = useCallback(() => {
    // Initialize assignments for any new items
    setAssignments((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        if (!updated[item.id]) updated[item.id] = [];
      });
      return updated;
    });
    setStep(3);
  }, [items]);

  const handleAssignmentsConfirmed = useCallback(() => {
    setStep(4);
  }, []);

  const handleStartOver = useCallback(() => {
    setStep(0);
    setReceiptImage(null);
    setRestaurantName('');
    setItems([]);
    setCharges({
      subtotal: 0,
      discountPercent: 0,
      discount: 0,
      vatPercent: 0,
      vatAmount: 0,
      serviceChargePercent: 0,
      serviceChargeAmount: 0,
      isInclusive: false,
      total: 0,
    });
    setPeople([]);
    setAssignments({});
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleStepClick = useCallback((targetStep) => {
    setStep(targetStep);
  }, []);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <ReceiptUpload
            receiptImage={receiptImage}
            setReceiptImage={setReceiptImage}
            onParsed={handleReceiptParsed}
            onSkip={handleSkipUpload}
          />
        );
      case 1:
        return (
          <ItemEditor
            items={items}
            setItems={setItems}
            charges={charges}
            setCharges={setCharges}
            restaurantName={restaurantName}
            onConfirm={handleItemsConfirmed}
            onBack={goBack}
          />
        );
      case 2:
        return (
          <PartyManager
            people={people}
            setPeople={setPeople}
            onConfirm={handlePeopleConfirmed}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <ItemAssignment
            items={items}
            setItems={setItems}
            people={people}
            assignments={assignments}
            setAssignments={setAssignments}
            onConfirm={handleAssignmentsConfirmed}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <BillSummary
            items={items}
            charges={charges}
            people={people}
            assignments={assignments}
            restaurantName={restaurantName}
            onStartOver={handleStartOver}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Background ambient glow */}
      <div className="app-bg-glow" />

      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">🧾</span>
          <h1 className="app-title">
            <TypewriterText text="BillKoto" speed={95} startDelay={150} />
          </h1>
        </div>
        <p className="app-tagline">Split bills fairly, every time</p>
      </header>

      <StepWizard steps={STEPS} currentStep={step} onStepClick={handleStepClick} />

      <main className="app-content">
        <div className="step-container" key={step}>
          {renderStep()}
        </div>
      </main>

      <footer className="app-footer">
        <p>BillKoto — No more awkward bill math</p>
      </footer>
    </div>
  );
}
