import React from 'react';

const paymentLogos = [
  { name: 'Visa', label: 'Visa' },
  { name: 'Mastercard', label: 'Mastercard' },
  { name: 'PayFast', label: 'PayFast' },
  { name: 'SnapScan', label: 'SnapScan' },
];

export const PaymentMethods: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Secure checkout with</p>
      <div className="flex flex-wrap items-center gap-4">
        {paymentLogos.map((method) => (
          <span
            key={method.name}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
          >
            {method.label}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        All payments are processed securely. We never store your card details.
      </p>
    </div>
  );
};
