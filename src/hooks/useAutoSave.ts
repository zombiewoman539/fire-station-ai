import { useState, useRef, useCallback } from 'react';
import { ClientProfile } from '../profileTypes';
import { saveProfile } from '../services/profileStorageSupabase';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(isReadOnly: boolean, onError: (msg: string) => void) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingSaveRef = useRef<ClientProfile | null>(null);

  const scheduleSave = useCallback((profile: ClientProfile) => {
    if (isReadOnly) return;
    pendingSaveRef.current = profile;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveProfile(profile);
        pendingSaveRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
      } catch (e) {
        console.error('Save failed:', e);
        setSaveStatus('error');
        onError('Save failed — check your connection and try again.');
      }
    }, 800);
  }, [isReadOnly, onError]);

  const flushSave = useCallback(async (fallback?: ClientProfile | null): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    const pending = pendingSaveRef.current ?? fallback;
    if (!pending) return true;
    setSaveStatus('saving');
    try {
      await saveProfile(pending);
      pendingSaveRef.current = null;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('error');
      return false;
    }
  }, []);

  const resetStatus = useCallback(() => setSaveStatus('idle'), []);

  return { saveStatus, setSaveStatus, scheduleSave, flushSave, resetStatus };
}
