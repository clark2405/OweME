/**
 * Thin wrapper over the OS contact picker, isolated here so the native
 * dependency has one touch point. Uses the legacy `presentContactPickerAsync`,
 * which shows the system picker out-of-process — the app only receives the one
 * contact the user taps, so no contacts permission prompt is needed.
 *
 * Loaded lazily (require at call time, not import at module load): this file
 * is pulled in by the add screen, and an eager import would crash the whole
 * app at startup on any binary that doesn't have the ExpoContacts native
 * module yet (e.g. JS updated via Metro before a rebuild).
 */

export interface PickedContact {
  name?: string;
  phone?: string;
}

/** Present the system picker; resolves to the chosen contact's name + first
 *  phone number, or null if the user cancelled, the native module isn't in
 *  this binary yet, or anything else went wrong. */
export async function pickContact(): Promise<PickedContact | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Contacts = require('expo-contacts/legacy') as typeof import('expo-contacts/legacy');
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;
    return {
      name: contact.name?.trim() || undefined,
      phone: contact.phoneNumbers?.[0]?.number,
    };
  } catch {
    return null;
  }
}
