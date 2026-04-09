import { useEffect, useState } from 'react';

const DEFAULT_BREAKPOINT = 1024;

export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT) {
  const getValue = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  };

  const [isMobile, setIsMobile] = useState<boolean>(getValue);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(getValue());
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}