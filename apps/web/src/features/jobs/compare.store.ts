import { create } from 'zustand';
import type { PublicJob } from './jobs.types';

const MAX_COMPARE = 3;

interface CompareState {
  jobs: PublicJob[];
  add: (job: PublicJob) => void;
  remove: (jobId: number) => void;
  clear: () => void;
  has: (jobId: number) => boolean;
  isFull: () => boolean;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  jobs: [],
  add: (job) =>
    set((s) => (s.jobs.length >= MAX_COMPARE ? s : { jobs: [...s.jobs, job] })),
  remove: (jobId) =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.jobId !== jobId) })),
  clear: () => set({ jobs: [] }),
  has: (jobId) => get().jobs.some((j) => j.jobId === jobId),
  isFull: () => get().jobs.length >= MAX_COMPARE,
}));
