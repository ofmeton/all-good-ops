// scripts/lib/disposable.mjs
function inMonth(date, year, month) {
  return date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`;
}

export function computeMonthlyDisposable(txs, recurringItems, { year, month }) {
  const monthTx = txs.filter(t => t.included && inMonth(t.date, year, month));
  const recIncomeNames = new Set(recurringItems.filter(r => r.kind === 'income' && r.active).map(r => r.name));

  const incomeRecurring = recurringItems
    .filter(r => r.kind === 'income' && r.active)
    .reduce((s, r) => s + r.amount, 0);

  const incomeSpot = monthTx
    .filter(t => t.classification === 'income' && !recIncomeNames.has((t.description || '').trim()))
    .reduce((s, t) => s + t.amount, 0);

  const fixed = recurringItems
    .filter(r => r.kind === 'expense' && r.active)
    .reduce((s, r) => s + r.amount, 0);

  const variableActual = monthTx
    .filter(t => t.classification === 'variable')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const incomeTotal = incomeRecurring + incomeSpot;
  const disposableBudget = incomeTotal - fixed;
  const remaining = disposableBudget - variableActual;
  return { incomeRecurring, incomeSpot, incomeTotal, fixed, variableActual, disposableBudget, remaining };
}
