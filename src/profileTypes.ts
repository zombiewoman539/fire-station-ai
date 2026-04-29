import { FireInputs } from './types';

export interface NoteEntry {
  id: string;
  createdAt: string;
  updatedAt?: string;
  body: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: FireInputs;
  // CRM / activity tracking
  lastMeetingDate: string | null;  // YYYY-MM-DD
  nextReviewDate: string | null;   // YYYY-MM-DD
  /** @deprecated kept for legacy data; new writes use noteEntries */
  notes: string;
  noteEntries: NoteEntry[];        // newest-first
}
