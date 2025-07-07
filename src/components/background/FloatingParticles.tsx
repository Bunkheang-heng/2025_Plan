'use client'
import React from 'react'

interface FloatingParticlesProps {
  count?: number;
}

export default function FloatingParticles({ count = 25 }: FloatingParticlesProps) {
  return (
    <div className="absolute inset-0">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-bounce opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${8 + Math.random() * 4}s`
          }}
        />
      ))}
    </div>
  );
}