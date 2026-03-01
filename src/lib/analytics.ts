type PlausibleArgs = [string, { props?: Record<string, string | number | boolean>; callback?: () => void }?];

declare global {
  interface Window {
    plausible?: (...args: PlausibleArgs) => void;
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>) {
  try {
    window.plausible?.(event, props ? { props } : undefined);
    if (process.env.NODE_ENV === "development") {
      console.log(`[analytics] ${event}`, props ?? "");
    }
  } catch {
    // Silently fail — analytics should never break the app
  }
}
