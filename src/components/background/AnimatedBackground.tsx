'use client'
import React from 'react'
import FloatingParticles from './FloatingParticles'
import FloatingShapes from './FloatingShapes'
import FloatingTechIcons from './FloatingTechIcons'
import FloatingBinary from './FloatingBinary'
import CircuitPattern from './CircuitPattern'
import ScanningLines from './ScanningLines'

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <CircuitPattern />
      <FloatingParticles />
      <FloatingShapes />
      <FloatingTechIcons />
      <FloatingBinary />
      <ScanningLines />
    </div>
  );
} 