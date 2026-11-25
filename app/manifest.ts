import type { MetadataRoute } from 'next';

/** The office app installs as a PWA (CLAUDE.md, rule 7). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TruckMates',
    short_name: 'TruckMates',
    description: 'Dispatch, billing and driver pay for carriers with 5 to 50 trucks.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#05080F',
    theme_color: '#05080F',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
