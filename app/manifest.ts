import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Training App',
    short_name: 'Training',
    description: 'Track your Push/Pull/Legs workouts',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#f9fafb',
    orientation: 'portrait',
  };
}
