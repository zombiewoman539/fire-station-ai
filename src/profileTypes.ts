import { FireInputs } from './types';

export interface ClientProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: FireInputs;
}
