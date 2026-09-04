import React from 'react';
import type { WorkRequestStatus } from './work-request.types';

interface Props {
  status: WorkRequestStatus;
}

export const WorkRequestStatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_REVIEW':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'SKIPPED':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
