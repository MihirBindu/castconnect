import { createContext, useContext } from 'react';
import { OnboardingStatus } from './types';

// The gate machine: still-resolving states plus the backend onboarding status.
export type ProfileGateState = 'idle' | 'checking' | 'error' | OnboardingStatus;

export interface ProfileGateValue {
  /** Advance/refresh the gate after a successful onboarding save, so the root
   *  gate routes to the next step (or the dashboard) without a round-trip. */
  setStatus: (status: OnboardingStatus) => void;
  /** Re-run the onboarding-status check (used by the retry screen). */
  refresh: () => void;
}

export const ProfileGateContext = createContext<ProfileGateValue>({
  setStatus: () => {},
  refresh: () => {},
});

export function useProfileGate(): ProfileGateValue {
  return useContext(ProfileGateContext);
}
