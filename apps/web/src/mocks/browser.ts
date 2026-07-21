import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** MSW browser worker — started from main.tsx when VITE_USE_MOCKS=1. */
export const worker = setupWorker(...handlers);
