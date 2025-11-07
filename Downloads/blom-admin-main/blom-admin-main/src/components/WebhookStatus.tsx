import React from 'react';

interface WebhookStatusProps {
  status: string;
  className?: string;
}

export function WebhookStatus({ status, className = '' }: WebhookStatusProps) {
  if (!status) return null;

  const isError = status.includes('ERR') || status.includes('ERROR');
  const isOk = status.includes('OK');

  return (
    <div className={`text-xs font-mono ${className}`}>
      <span className={isError ? 'text-red-600' : isOk ? 'text-green-600' : 'text-gray-600'}>
        {status}
      </span>
    </div>
  );
}

