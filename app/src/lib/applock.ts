/**
 * App lock (R1) — a Face ID / Touch ID / device-passcode gate over the private
 * ledger, via expo-local-authentication. Thin wrapper so the lock gate and the
 * Settings toggle share one spot that touches the native module.
 */

import * as LocalAuthentication from 'expo-local-authentication';

/** True only if the device has biometric/passcode hardware AND something is
 *  enrolled — i.e. app lock can actually work here. */
export async function canUseAppLock(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Prompt for Face ID / passcode. Resolves true only on a confirmed success;
 *  the OS may fall back to the device passcode if biometrics fail. */
export async function authenticate(reason = 'Unlock OweMe'): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
