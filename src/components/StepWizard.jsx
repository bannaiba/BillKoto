import './StepWizard.css';

export default function StepWizard({ steps, currentStep, onStepClick }) {
  return (
    <nav className="step-wizard" aria-label="Progress">
      <div className="step-wizard-track">
        <div
          className="step-wizard-progress"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>
      <ol className="step-wizard-steps">
        {steps.map((s, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isClickable = isCompleted && onStepClick;
          return (
            <li
              key={i}
              className={`step-wizard-item ${
                isActive ? 'active' : isCompleted ? 'completed' : ''
              }`}
            >
              <button
                className={`step-wizard-dot${isClickable ? ' clickable' : ''}`}
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                aria-label={`Go to step ${i + 1}: ${s.label}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="step-wizard-number">{i + 1}</span>
                )}
              </button>
              <span className="step-wizard-label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
