import React from 'react';
import { VehicleStatus } from '../types';
import { Anchor, Truck, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: VehicleStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  switch (status) {
    case 'AT PORT':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-amber-300 bg-amber-50 text-amber-800 ${sizeClasses[size]} whitespace-nowrap shadow-xs`}
        >
          {showIcon && <Anchor className={`${iconSizes[size]} text-amber-700 shrink-0`} />}
          <span>AT PORT</span>
        </span>
      );

    case 'ON TRANSIT':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-orange-300 bg-orange-50 text-orange-800 ${sizeClasses[size]} whitespace-nowrap shadow-xs animate-pulse-slow`}
        >
          {showIcon && <Truck className={`${iconSizes[size]} text-orange-700 shrink-0`} />}
          <span>ON TRANSIT</span>
        </span>
      );

    case 'RECEIVED AT GALCO':
      return (
        <span
          className={`inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 ${sizeClasses[size]} whitespace-nowrap shadow-xs`}
        >
          {showIcon && <CheckCircle2 className={`${iconSizes[size]} text-emerald-700 shrink-0`} />}
          <span>Received</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 ${sizeClasses[size]} whitespace-nowrap`}
        >
          {status}
        </span>
      );
  }
};
