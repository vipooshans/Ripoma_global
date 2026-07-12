import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, size = 14, className = '', showValue = false }) => (
  <div className={`inline-flex items-center gap-1 ${className}`}>
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
    {showValue && rating > 0 && (
      <span className="text-[11px] font-bold text-slate-600">{Number(rating).toFixed(1)}</span>
    )}
  </div>
);

export default StarRating;
