interface Step {
  number: number;
  label: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const WizardStepIndicator = ({ steps, currentStep }: WizardStepIndicatorProps) => {
  return (
    <div className="flex items-center justify-between w-full px-2">
      {steps.map((step, idx) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5 min-w-20">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : isCurrent
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs font-medium text-center leading-tight ${
                  isCurrent ? "text-blue-700" : isCompleted ? "text-green-700" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-2 mt-[-18px]">
                <div
                  className={`h-0.5 w-full transition-all duration-300 ${
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WizardStepIndicator;
