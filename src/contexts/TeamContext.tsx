import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  getMyTeamStatus, getPendingInvite,
  TeamStatus, PendingInvite,
} from '../services/teamService';

interface TeamContextValue {
  teamStatus: TeamStatus | null;
  pendingInvite: PendingInvite | null;
  loaded: boolean;
  isManager: boolean;
  refresh: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue>({
  teamStatus: null,
  pendingInvite: null,
  loaded: false,
  isManager: false,
  refresh: async () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoaded(true); return; }

    // Check for an active team membership first
    const status = await getMyTeamStatus();
    setTeamStatus(status);

    // Only look for a pending invite if the user isn't already in a team
    if (!status) {
      const invite = await getPendingInvite();
      setPendingInvite(invite);
    } else {
      setPendingInvite(null);
    }

    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <TeamContext.Provider value={{
      teamStatus,
      pendingInvite,
      loaded,
      isManager: teamStatus?.role === 'manager',
      refresh: load,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => useContext(TeamContext);
