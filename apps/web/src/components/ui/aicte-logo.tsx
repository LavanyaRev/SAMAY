"use client";

import React from "react";

interface AicteLogoProps {
  className?: string;
  size?: number;
}

export function AicteLogo({
  className = "h-8 w-8",
  size = 32,
}: AicteLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Official AICTE Emblem"
    >
      {/* Outer Gear Wheel Teeth */}
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke="#EC642A"
        strokeWidth="2.5"
        strokeDasharray="3.5 2.5"
        fill="#FFF9F5"
      />

      {/* Outer Ring */}
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="#FAAA21"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Inner Ring */}
      <circle cx="24" cy="24" r="14" fill="#EC642A" />

      {/* Traditional Diya / Lamp Bowl */}
      <path
        d="M17 26.5C17 29 20.134 31 24 31C27.866 31 31 29 31 26.5H17Z"
        fill="#FFFFFF"
      />
      {/* Lamp Stem / Base */}
      <path d="M21 31H27V33H21V31Z" fill="#FAAA21" />
      {/* Flame of Knowledge */}
      <path
        d="M24 16C24 16 26.5 19.5 26.5 22C26.5 23.38 25.38 24.5 24 24.5C22.62 24.5 21.5 23.38 21.5 22C21.5 19.5 24 16 24 16Z"
        fill="#FAAA21"
      />
      <circle cx="24" cy="22" r="1.2" fill="#FFFFFF" />

      {/* Radiant Gear Points */}
      <g stroke="#EC642A" strokeWidth="2" strokeLinecap="round">
        <line x1="24" y1="1" x2="24" y2="4" />
        <line x1="24" y1="44" x2="24" y2="47" />
        <line x1="1" y1="24" x2="4" y2="24" />
        <line x1="44" y1="24" x2="47" y2="24" />
        <line x1="7.7" y1="7.7" x2="9.8" y2="9.8" />
        <line x1="38.2" y1="38.2" x2="40.3" y2="40.3" />
        <line x1="7.7" y1="40.3" x2="9.8" y2="38.2" />
        <line x1="38.2" y1="9.8" x2="40.3" y2="7.7" />
      </g>
    </svg>
  );
}
