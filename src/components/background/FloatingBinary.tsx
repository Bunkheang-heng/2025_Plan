'use client'
import React from 'react'

interface FloatingBinaryProps {
  count?: number;
}

export default function FloatingBinary({ count = 12 }: FloatingBinaryProps) {
  const binaryPatterns = ['1010', '0110', '1001', '0101', '1100', '0011'];

  return (
    <div className="absolute inset-0">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute opacity-5 text-green-400 font-mono text-xs animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        >
          {binaryPatterns[i % 6]}
        </div>
      ))}
    </div>
  );
} 