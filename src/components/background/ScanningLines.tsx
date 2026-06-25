'use client'
import React from 'react'

export default function ScanningLines() {
  return (
    <div className="absolute inset-0">
      <div className="absolute w-full h-px bg-emerald-400/30 opacity-30 animate-pulse" />
      <div className="absolute w-px h-full bg-emerald-400/30 opacity-30 animate-pulse" />
    </div>
  );
}
