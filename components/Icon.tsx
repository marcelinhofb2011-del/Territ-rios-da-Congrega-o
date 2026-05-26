import React from 'react';

export const MapIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Background soft glowing badge */}
      <rect width="100" height="100" rx="28" fill="url(#bg-grad)" />
      
      {/* Modern Folded Map Planes */}
      <path d="M28 35 L48 24 L72 32 M28 35 L28 68 L48 57 L72 65 L72 32 M48 24 L48 57" stroke="url(#map-line-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      
      {/* Highlight glow under the pin */}
      <ellipse cx="50" cy="53" rx="10" ry="4" fill="url(#shadow-grad)" />

      {/* Futuristic sleek Map Pin */}
      <path d="M50 26 C41 26 34 33 34 42 C34 52 50 68 50 68 C50 68 66 52 66 42 C66 33 59 26 50 26 Z" fill="url(#pin-grad)" filter="url(#pin-shadow)" />
      
      {/* Inner glowing core of pin */}
      <circle cx="50" cy="41" r="4.5" fill="#FFFFFF" />

      {/* Definitions for rich modern gradients */}
      <defs>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFF6FF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
        
        <linearGradient id="map-line-grad" x1="28" y1="24" x2="72" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        <linearGradient id="pin-grad" x1="34" y1="26" x2="66" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        <radialGradient id="shadow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>

        <filter id="pin-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#1E1B4B" floodOpacity="0.25" />
        </filter>
      </defs>
    </svg>
  );
};

