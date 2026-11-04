import { useState, useEffect, useLayoutEffect } from 'react';

// Pages are prerendered without a browser session, so anything that depends on
// sessionStorage must wait until after hydration or React reports a mismatch.
// The layout effect re-renders before the first paint, so there is no flash.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const useHasMounted = () => {
  const [hasMounted, setHasMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
};

export default useHasMounted;
