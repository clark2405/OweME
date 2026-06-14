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

  // Clear the overdue pile in one go: fire each loan's composer in turn. The OS
  // only lets one message be sent at a time, so this is sequential — for the
  // share channel each sheet hands control back when dismissed, so it reads as
  // "rapid-fire, one tap each" rather than a true silent batch.
  const onNudgeAll = async (list: LoanWithBorrower[]) => {
    if (list.length === 0) return;
    haptics.tap();
    let sent = 0;
    for (const { loan, borrower } of list) {
      if (await deliverNudge(loan, borrower, 'friendly', channel)) {
        recordNudge(loan.id);
        sent += 1;
      }
    }
    if (sent > 0) {
      showToast({ message: `Nudged ${sent} ${sent === 1 ? 'person' : 'people'} 📨` });
    }
  };

  return { onReturn, onNudge, onNudgeAll };
}
