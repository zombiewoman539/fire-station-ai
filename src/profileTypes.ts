import { FireInputs } from './types';

export interface NoteEntry {
  id: string;
  createdAt: string;
  updatedAt?: string;
  body: string;
  /** When set, this entry represents a meeting that occurred on this date (YYYY-MM-DD). */
  meetingDate?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  /** Auth user id of the owner. Compared against the current session to detect read-only views
   *  (e.g. a manager viewing a teammate's client). Optional only for legacy local-dev profiles. */
  userId?: string;
  createdAt: string;
  updatedAt: string;
  inputs: FireInputs;
  // CRM / activity tracking
  lastMeetingDate: string | null;  // YYYY-MM-DD
  nextReviewDate: string | null;   // YYYY-MM-DD
  /** @deprecated kept for legacy data; new writes use noteEntries */
  notes: string;
  noteEntries: NoteEntry[];        // newest-first
  /** Free-text tags (e.g. "VIP", "warm", "do-not-contact"). Filterable via saved-views chips. */
  tags: string[];
}
