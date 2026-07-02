import { NativeModule, requireNativeModule } from 'expo';

import type { QuoteBreakModuleEvents } from './QuoteBreakModule.types';

declare class QuoteBreakModule extends NativeModule<QuoteBreakModuleEvents> {
  /** Replaces the full list of quotes the background service can pick from. */
  setQuotes(quotes: string[]): void;
  /** Minutes of accumulated screen-on time before a quote notification fires. */
  setThresholdMinutes(minutes: number): void;
  /** Starts the foreground service that tracks screen-on time. */
  startMonitoring(): void;
  /** Stops the foreground service. */
  stopMonitoring(): void;
  /** Whether the foreground service has been started. */
  isMonitoring(): boolean;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<QuoteBreakModule>('QuoteBreakModule');
