import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

/** Edit forms open as a right-hand drawer on desktop and a bottom sheet on mobile. */
export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};
