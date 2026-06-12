/**
 * Shared handlers for the loan-card swipe shortcuts, so home and the full
 * loans screen behave identically:
 *   return → mark returned + an "Undo" toast (no detail-screen confetti here)
 *   nudge  → fire the default-tone nudge through the user's chosen channel
 */

import { markReturned, recordNudge, unreturn, useSettings } from './store';
import { deliverNudge } from './nudge';
import { showToast } from './toast';
import { haptics } from './haptics';
import { LoanWithBorrower } from './types';

export function useLoanQuickActions() {
  const { channel } = useSettings();

  const onReturn = ({ loan }: LoanWithBorrower) => {
    haptics.success();
    markReturned(loan.id);
    showToast({
      message: 'Marked returned 🎉',
      actionLabel: 'Undo',
      onAction: () => unreturn(loan.id),
    });
  };

  const onNudge = async ({ loan, borrower }: LoanWithBorrower) => {
    const sent = await deliverNudge(loan, borrower, 'friendly', channel);
    if (sent) {
      recordNudge(loan.id);
      showToast({ message: `Nudge sent to ${borrower.name} 📨` });
    }
  };

  return { onReturn, onNudge };
}
