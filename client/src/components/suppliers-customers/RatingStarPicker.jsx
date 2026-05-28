import React from 'react';
import { Star } from 'lucide-react';

const RatingStarPicker = ({ value = 0, onChange, readOnly = false }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => !readOnly && onChange && onChange(star)}
        className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        disabled={readOnly}
      >
        <Star
          size={readOnly ? 14 : 18}
          className={star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-100'}
        />
      </button>
    ))}
    {!readOnly && value > 0 && (
      <button
        type="button"
        onClick={() => onChange && onChange(0)}
        className="ml-1 text-[9px] text-slate-400 hover:text-rose-500 font-bold"
      >
        Clear
      </button>
    )}
  </div>
);

export default RatingStarPicker;
