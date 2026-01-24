"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface PlasmaShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

export function PlasmaShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: PlasmaShootingAnimationProps) {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      progress: number;
      spread: number;
      size: number;
      opacity: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      startTime: number;
      travelTime: number;
    }>
  >([]);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Create a new particle
  const createParticle = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getCellCenter(attackerRow, attackerCol);
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Random point within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    // Start particles from the center of the firing ship's cell (y-axis)
    const startY = attackerCenter.y;

    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Create particle with spread (flamethrower effect)
    // Spread increases as it travels (cone shape)
    const spread = (Math.random() - 0.5) * 0.15; // Random spread angle in radians (tighter spread)
    const size = 4 + Math.random() * 4; // Random size between 4-8px
    const opacity = 1.0; // Fully opaque

    const newParticle = {
      id: particleIdRef.current++,
      x: attackerCenter.x,
      y: startY, // Start from below the firing ship
      progress: 0,
      spread,
      size,
      opacity,
      targetX,
      targetY,
      startX: attackerCenter.x,
      startY: startY, // Start from below the firing ship
      startTime: Date.now(),
      travelTime: 0.3 + Math.random() * 0.2, // 0.3-0.5 seconds travel time
    };

    setParticles((prev) => [...prev, newParticle]);

    // Remove particle after it reaches target
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, newParticle.travelTime * 1000);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
  ]);

  // Continuously create particles
  useEffect(() => {
    // Create first particle immediately
    createParticle();

    // Create new particles continuously
    const interval = setInterval(() => {
      createParticle();
    }, 25); // Create a new particle every 25ms for a continuous stream (doubled from 50ms)

    return () => clearInterval(interval);
  }, [createParticle]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const now = Date.now();
      const updatedParticles = particles
        .map((particle) => {
          const elapsed = (now - particle.startTime) / 1000;
          const progress = Math.min(elapsed / particle.travelTime, 1);

          if (progress >= 1) {
            return null; // Particle reached target
          }

          // Calculate position along the path with spread
          const dx = particle.targetX - particle.startX;
          const dy = particle.targetY - particle.startY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Apply spread (cone effect) - spread increases with progress
          const spreadDistance = particle.spread * distance * progress * 0.5;
          const spreadAngle = angle + Math.PI / 2; // Perpendicular to path

          const baseX = particle.startX + dx * progress;
          const baseY = particle.startY + dy * progress;
          const currentX = baseX + Math.cos(spreadAngle) * spreadDistance;
          const currentY = baseY + Math.sin(spreadAngle) * spreadDistance;

          // Keep fully opaque (no fade)
          const currentOpacity = particle.opacity;

          return {
            ...particle,
            x: currentX,
            y: currentY,
            progress,
            opacity: currentOpacity,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setParticles(updatedParticles);

      if (updatedParticles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  return (
    <svg
      className="absolute pointer-events-none z-15"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {particles.map((particle) => (
        <circle
          key={particle.id}
          cx={particle.x}
          cy={particle.y}
          r={particle.size}
          fill="#6495ED"
          opacity={particle.opacity}
        />
      ))}
    </svg>
  );
}
