// scripts/lib/disposable.mjs
import { monthlyRecurringContribution } from '../../lib/cashflow/rolling.mjs';

function inMonth(date, year, month) {
  return date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`;
}

export function computeMonthlyDisposable(txs, recurringItems, { year, month, overrides }) {
  const overrideRows = overrides ?? [];
  const monthTx = txs.filter(t => t.included && inMonth(t.date, year, month));
  const fixedIncomeItems = recurringItems.filter(r => r.kind === 'income' && r.active && r.amount_type !== 'variable');
  const recIncomeNames = new Set(fixedIncomeItems.map(r => r.name));

  const incomeRecurring = fixedIncomeItems
    .reduce((s, r) => s + monthlyRecurringContribution(r, year, month, overrideRows), 0);

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
