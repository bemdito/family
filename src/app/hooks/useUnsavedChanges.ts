import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router';

export function useUnsavedChanges(hasChanges: boolean) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Bloquear navegação pelo React Router
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return hasChanges && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowPrompt(true);
      setPendingNavigation(() => () => blocker.proceed());
    }
  }, [blocker]);

  // Bloquear fechamento da janela/aba
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const confirmNavigation = () => {
    if (pendingNavigation) {
      pendingNavigation();
    }
    setShowPrompt(false);
    setPendingNavigation(null);
  };

  const cancelNavigation = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    setShowPrompt(false);
    setPendingNavigation(null);
  };

  return {
    showPrompt,
    confirmNavigation,
    cancelNavigation
  };
}