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
