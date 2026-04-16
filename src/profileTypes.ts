import { FireInputs } from './types';

export interface ClientProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: FireInputs;
  // CRM / activity tracking
  lastMeetingDate: string | null;  // YYYY-MM-DD
  nextReviewDate: string | null;   // YYYY-MM-DD
  notes: string;                   // free-text advisor notes
}
