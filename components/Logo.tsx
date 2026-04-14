'use client';

import { useState } from 'react';
// components/Logo.tsx
import Image from 'next/image';

type LogoProps = {
  width?: number;
  height?: number;
  className?: string;
  size?: number; // optional size prop for convenience
};

export default function Logo({ width = 40, height = 40, className }: LogoProps) {
  return (
    <img
      src="/assets/images/nday-logo.png" // adjust if needed
      alt="NdaY Logo"
      width={width}
      height={height}
      className={className}
    />
  );
}