import React from 'react';

const CreditLimitWarning = ({ customer, proposedTotal }) => {
  if (!customer) return null;

  const limit = customer.creditLimit || 0;
  const balance = customer.outstandingBalance || 0;
  const total = parseFloat(proposedTotal) || 0;
  const projectedBalance = balance + total;
  const exceeds = projectedBalance > limit;

  return (
    <div className={`p-4 rounded-xl border ${exceeds ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-teal-50 border-teal-200 text-teal-900'} shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className="text-xl mt-0.5">
          {exceeds ? '⚠️' : '✅'}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold mb-1">
            {exceeds ? 'Credit Limit Alert' : 'Credit Limit Check Passed'}
          </h4>
          <p className="text-xs opacity-90 mb-3">
            {exceeds 
              ? `The proposed order of LKR ${total.toLocaleString()} will cause the customer's outstanding balance to exceed their credit limit.`
              : `The proposed order of LKR ${total.toLocaleString()} is within the customer's credit limit.`
            }
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mt-2 border-t pt-2 border-current border-opacity-10">
            <div>
              <span className="block opacity-75">Credit Limit:</span>
              <span className="font-bold">${limit.toLocaleString()}</span>
            </div>
            <div>
              <span className="block opacity-75">Current Balance:</span>
              <span className="font-bold">${balance.toLocaleString()}</span>
            </div>
            <div>
              <span className="block opacity-75">Order Total:</span>
              <span className="font-bold">${total.toLocaleString()}</span>
            </div>
            <div>
              <span className="block opacity-75">Projected Balance:</span>
              <span className={`font-bold ${exceeds ? 'text-rose-700 underline decoration-wavy' : 'text-teal-700'}`}>
                ${projectedBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditLimitWarning;
