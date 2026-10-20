type BrowserDeviceInfo = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: { mobile: boolean };
};

/** Browser-reported form factor for presentation only; never selects a virtual model. */
export const isPhoneBrowser = (browser: BrowserDeviceInfo): boolean => {
  const { userAgent, platform = "", maxTouchPoints = 0 } = browser;

  // iPad Safari can identify itself as a Mac, including in desktop browsing mode.
  if (
    /iPad|Tablet/i.test(userAgent) ||
    (/Mac/i.test(platform || userAgent) && maxTouchPoints > 1)
  ) {
    return false;
  }

  if (typeof browser.userAgentData?.mobile === "boolean") {
    return browser.userAgentData.mobile;
  }

  return /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini/i.test(
    userAgent,
  );
};
