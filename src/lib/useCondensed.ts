import { useEffect, useState } from 'react';

export function useCondensed(query = '(max-width: 720px)') {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setCondensed(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [query]);

  return condensed;
}
