import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image で使用している quality を許可（Next 16 の既定は [75] のみ）
  images: {
    qualities: [75, 84, 85, 88, 92],
  },
};

export default nextConfig;
