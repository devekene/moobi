export const appendPhonePinDigit = (
  currentPin: string,
  digit: string,
): string | null => {
  if (!/^\d{0,3}$/.test(currentPin) || !/^\d$/.test(digit)) return null;
  return `${currentPin}${digit}`;
};

export const matchesPhonePin = (
  candidate: string,
  configuredPin: string | null,
): boolean =>
  /^\d{4}$/.test(candidate) &&
  configuredPin !== null &&
  /^\d{4}$/.test(configuredPin) &&
  candidate === configuredPin;

export function validatePhonePinSetup(
  pin: string,
  confirmation: string,
): string | null {
  if (!/^\d{4}$/.test(pin)) return "Enter a four-digit passcode.";
  if (pin !== confirmation) return "The passcodes do not match.";
  return null;
}
