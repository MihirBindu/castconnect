import { createContext, useContext } from 'react';

export type ProfileGateStatus = 'idle' | 'checking' | 'incomplete' | 'complete' | 'error';

export interface ProfileGateValue {
  /** Marks the signed-in user's profile complete after a successful save so the
   *  root gate lets them into the dashboard without a second round-trip. */
  markComplete: () => void;
  /** Re-runs the profile-completion check (used by the retry screen). */
  refresh: () => void;
}

export const ProfileGateContext = createContext<ProfileGateValue>({
  markComplete: () => {},
  refresh: () => {},
});

export function useProfileGate(): ProfileGateValue {
  return useContext(ProfileGateContext);
}
