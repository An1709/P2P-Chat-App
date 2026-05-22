import React, { useEffect, useRef, useState } from 'react';
import NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';

export default function ThreeBackground() {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      setVantaEffect(
        NET({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          
          // Colors (warm accent + VSCode blue)
          color: 0xf6851b,           // Orange nodes
          color2: 0x007acc,          // Blue connections           // Main node color (orange)
          backgroundColor: 0x1e1e1e, // VSCode dark background
          
          // Network settings
          points: 20.00,              // Number of connection nodes
          maxDistance: 23.00,         // Max distance for connections
          spacing: 17.00,             // Space between nodes
          
          // Visual settings
          showDots: true,             // Show node dots
          backgroundAlpha: 1.0        // Background opacity
        })
      );
    }

    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [vantaEffect]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (vantaEffect) {
        vantaEffect.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [vantaEffect]);

  return (
    <div 
      ref={vantaRef} 
      style={{ 
        position: 'fixed',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: 0
      }}
    />
  );
}
