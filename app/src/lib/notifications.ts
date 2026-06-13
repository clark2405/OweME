/**
 * Local nudge reminders, driven by each loan's `reminder` cadence. The store
 * calls `syncLoanReminder` after every write that could change a loan's
 * schedule, so the pending notifications always mirror the ledger:
 * one repeating notification per active loan with a cadence, none otherwise.
 *
 * All calls are fire-and-forget — a denied permission or a simulator without
 * notification support should never break a ledger write.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Loan, ReminderCadence } from './types';
import { money } from './format';

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// Show nudges even while the app is foregrounded — quiet banner, no sound.
if (IS_NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Category + action ids for the long-press actions on a nudge reminder. */
export const NUDGE_CATEGORY = 'loan-nudge';
export const ACTION_NUDGE = 'send-nudge';
export const ACTION_RETURNED = 'mark-returned';

// Register the long-press actions once. Both open the app: "nudge" needs the
// composer, and with the in-memory store a background "returned" wouldn't
// persist anyway — so we surface it in-app (with an Undo toast) instead.
if (IS_NATIVE) {
  void Notifications.setNotificationCategoryAsync(NUDGE_CATEGORY, [
    { identifier: ACTION_NUDGE, buttonTitle: 'Send a nudge 📨', options: { opensAppToForeground: true } },
    { identifier: ACTION_RETURNED, buttonTitle: 'Mark returned 🎉', options: { opensAppToForeground: true } },
  ]).catch(() => {});
}

const DAY = 24 * 60 * 60;
const CADENCE_SECONDS: Record<Exclude<ReminderCadence, 'off'>, number> = {
  weekly: 7 * DAY,
  biweekly: 14 * DAY,
  monthly: 30 * DAY,
};

let granted: boolean | null = null;

/** Ask once, remember the answer for the session. */
export async function ensureNotifPermission(): Promise<boolean> {
  if (granted !== null) return granted;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return (granted = true);
  const asked = await Notifications.requestPermissionsAsync();
  granted = asked.granted;
  return granted;
}

export type NotifPermission = 'granted' | 'denied' | 'undetermined';

/** Read the current OS permission without prompting. Also refreshes the session
 *  cache, so re-enabling notifications in iOS Settings takes effect without an
 *  app restart (the next schedule sees the fresh value). */
export async function getNotifPermission(): Promise<NotifPermission> {
  if (!IS_NATIVE) return 'granted';
  const p = await Notifications.getPermissionsAsync();
  granted = p.granted;
  if (p.granted) return 'granted';
  return p.status === 'undetermined' ? 'undetermined' : 'denied';
}

/** Prompt for permission (the OS only shows the dialog while undetermined). */
export async function requestNotifPermission(): Promise<NotifPermission> {
  if (!IS_NATIVE) return 'granted';
  const p = await Notifications.requestPermissionsAsync();
  granted = p.granted;
  if (p.granted) return 'granted';
  return p.status === 'undetermined' ? 'undetermined' : 'denied';
}

const idFor = (loanId: string) => `loan-${loanId}`;

export function cancelLoanReminder(loanId: string) {
  Notifications.cancelScheduledNotificationAsync(idFor(loanId)).catch(() => {});
}

export function cancelAllReminders() {
  Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/** Make this loan's pending notification match its current state. */
export async function syncLoanReminder(loan: Loan, borrowerName: string, nudgesEnabled: boolean) {
  cancelLoanReminder(loan.id);
  if (!nudgesEnabled || loan.status !== 'active' || !loan.reminder || loan.reminder === 'off') {
    return;
  }
  if (!(await ensureNotifPermission())) return;

  const what =
    loan.type === 'item' ? `your ${loan.itemName}` : money(loan.amount, loan.currency);
  await Notifications.scheduleNotificationAsync({
    identifier: idFor(loan.id),
    content: {
      title: 'Still out in the wild 📦',
      body: `${borrowerName} still has ${what}. Want to send a nudge?`,
      data: { loanId: loan.id },
      categoryIdentifier: NUDGE_CATEGORY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: CADENCE_SECONDS[loan.reminder],
      repeats: true,
    },
  }).catch(() => {});
}
