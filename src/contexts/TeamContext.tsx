import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { getMyTeamStatus, acceptPendingInvite, TeamStatus } from '../services/teamService';

interface TeamContextValue {
  teamStatus: TeamStatus | null;  // null = solo or not loaded yet
  loaded: boolean;
  isManager: boolean;
  refresh: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue>({
  teamStatus: null,
  loaded: false,
  isManager: false,
  refresh: async () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoaded(true); return; }

    // First: try to auto-accept a pending invite (harmless if none exists)
    await acceptPendingInvite();

    const status = await getMyTeamStatus();
    setTeamStatus(status);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <TeamContext.Provider value={{
      teamStatus,
      loaded,
      isManager: teamStatus?.role === 'manager',
      refresh: load,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => useContext(TeamContext);
