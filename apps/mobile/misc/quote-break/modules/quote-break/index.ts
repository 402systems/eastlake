// Re-export the native module. On web, it will be resolved to QuoteBreakModule.web.ts
// and on native platforms to QuoteBreakModule.ts
export { default } from './src/QuoteBreakModule';
export * from './src/QuoteBreakModule.types';
