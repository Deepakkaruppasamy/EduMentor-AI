import React from 'react';
import { getTrustClass, getTrustLabel } from '../../utils/uuid';

export const TrustScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const trustClass = getTrustClass(score);
  const label = getTrustLabel(score);
  const emoji = score >= 75 ? '✅' : score >= 45 ? '⚠️' : '❌';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${trustClass}`}>
      <span>{emoji}</span>
      <span>Trust: {score}%</span>
      <span className="opacity-60">· {label}</span>
    </span>
  );
};
