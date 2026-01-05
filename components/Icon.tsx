import React from 'react';

export const MapIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="256" cy="256" r="256" fill="#EFF6FF"/>
      <path fill="#4338CA" d="M256 160c-44.18 0-80 35.82-80 80s80 144 80 144 80-99.82 80-144-35.82-80-80-80Z"/>
      <circle cx="256" cy="240" r="32" fill="#E0E7FF"/>
    </svg>
  );
};
