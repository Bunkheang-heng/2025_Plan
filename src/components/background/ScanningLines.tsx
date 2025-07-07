'use client'
import React from 'react'

export default function ScanningLines() {
  return (
    <div className="absolute inset-0">
      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-30 animate-pulse" />
      <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-30 animate-pulse" />
    </div>
  );
} 