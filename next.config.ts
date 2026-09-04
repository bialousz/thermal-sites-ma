import type { NextConfig } from 'next';

// The atlas is entirely client-side once its researched data and source images
// are bundled, so it can be pre-rendered as a portable static site.
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
