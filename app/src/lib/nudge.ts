/**
 * Nudge delivery channels. The OS won't let an app send a message on the
 * user's behalf, so "automatic" here means: the composer of their chosen
 * platform opens with the nudge already written — one tap left to send.
 * Channels that can't prefill text (e.g. Messenger) aren't offered; the
 * share sheet remains the universal fallback.
 */

import { Linking, Platform, Share } from 'react-native';
import { Borrower, Loan, NudgeTone } from './types';
import { loanLabel, shortDate } from './format';

export type NudgeChannel = 'share' | 'whatsapp' | 'sms' | 'viber';

export const NUDGE_CHANNELS: { value: NudgeChannel; label: string }[] = [
  { value: 'share', label: 'Ask me' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'Messages' },
  { value: 'viber', label: 'Viber' },
];

/** Deep link that opens `channel`'s composer prefilled with `message`, or
 *  null for the share-sheet channel. When the borrower has a `phone`, WhatsApp
 *  and SMS pre-address it too — so it's genuinely one tap. May still fail at
 *  open time if the app isn't installed — callers fall back to the share sheet. */
export function channelUrl(channel: NudgeChannel, message: string, phone?: string): string | null {
  const text = encodeURIComponent(message);
  const digits = phone?.replace(/[^\d]/g, '') || '';
  switch (channel) {
    case 'whatsapp':
      return digits ? `whatsapp://send?phone=${digits}&text=${text}` : `whatsapp://send?text=${text}`;
    case 'sms':
      // iOS wants `sms:<n>&body=`, Android `sms:<n>?body=`. Without a number the
      // user picks who; the message is already written either way.
      return Platform.OS === 'ios' ? `sms:${digits}&body=${text}` : `sms:${digits}?body=${text}`;
    case 'viber':
      return `viber://forward?text=${text}`;
    case 'share':
      return null;
  }
}

export const NUDGE_TONES: { value: NudgeTone; emoji: string; label: string }[] = [
  { value: 'friendly', emoji: '😊', label: 'Friendly' },
  { value: 'casual', emoji: '🙂', label: 'Casual' },
  { value: 'pointed', emoji: '👀', label: 'Pointed' },
];

/** The pre-written nudge copy — OweMe is the bad guy so the lender isn't. */
export function nudgeMessage(tone: NudgeTone, what: string, who: string, when: string): string {
  switch (tone) {
    case 'friendly':
      return `Hey ${who}! 😊 No rush at all — just a gentle nudge from OweMe that you've still got my ${what} (since ${when}). Whenever's good! 🙏`;
    case 'casual':
      return `Hey ${who} 🙂 OweMe here — reminder that my ${what} is still with you from ${when}. Mind sending it back when you get a sec?`;
    case 'pointed':
      return `${who}… 👀 OweMe says my ${what} has been out in the wild since ${when}. It misses home. Time to bring it back? 📦`;
  }
}

/** Open `channel`'s composer prefilled with `message` (one tap to send), falling
 *  back to the share sheet when the channel can't prefill or its app is missing.
 *  Returns true if a composer/sheet actually opened. */
async function deliver(message: string, channel: NudgeChannel, phone?: string): Promise<boolean> {
  const url = channelUrl(channel, message, phone);
  if (url) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // app not installed — fall through to the share sheet
    }
  }
  const res = await Share.share({ message });
  return res.action !== Share.dismissedAction;
}

/**
 * Send a nudge for `loan` via the chosen channel: opens that app's composer
 * prefilled (one tap to send), or the share sheet for `share` / when the app
 * isn't installed. Returns true if a composer/sheet actually opened — callers
 * use that to record the nudge only when it went somewhere.
 */
export async function deliverNudge(
  loan: Loan,
  borrower: Borrower,
  tone: NudgeTone,
  channel: NudgeChannel,
  link?: string | null,
): Promise<boolean> {
  const what = loanLabel(loan);
  let message = nudgeMessage(tone, what, borrower.name, shortDate(loan.lentAt));
  // When the lender is signed in, a one-tap "mark it returned" link rides along —
  // the borrower closes the loop with zero install/signup (the killer feature).
  if (link) message += `\n\n📦 Tap to mark it returned: ${link}`;
  return deliver(message, channel, borrower.phone);
}

/** The pre-written thank-you, sent once a loan comes home — the warm bookend to
 *  a nudge, so the last word in the thread isn't a reminder. */
export function thanksMessage(what: string, who: string): string {
  return `Thanks ${who}! 🙏 Got my ${what} back — OweMe can rest easy now. 💛`;
}

/** Send a thank-you for a returned `loan` via the chosen channel. Same delivery
 *  path as a nudge (prefilled composer or share sheet). */
export async function deliverThanks(
  loan: Loan,
  borrower: Borrower,
  channel: NudgeChannel,
): Promise<boolean> {
  return deliver(thanksMessage(loanLabel(loan), borrower.name), channel, borrower.phone);
}
