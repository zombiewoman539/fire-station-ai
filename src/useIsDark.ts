import { useState, useEffect } from 'react';

/** Reactively returns true when the dark theme is active. */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => !document.documentElement.classList.contains('light')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(!document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}
