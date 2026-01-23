"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface RailgunShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

export function RailgunShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: RailgunShootingAnimationProps) {
  const [projectiles, setProjectiles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      angle: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      startTime: number;
      travelTime: number;
    }>
  >([]);
  const projectileIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 25;
      const cellHeight = gridRect.height / 13;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Spawn a new projectile
  const spawnProjectile = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getCellCenter(attackerRow, attackerCol);
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Select a random target spot within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // High speed constant rate (faster than missiles)
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const SPEED = avgCellSize * 8; // 8 cells per second (2x faster than missiles)
    const travelTime = distance / SPEED; // Constant speed, travel time varies by distance

    const newProjectile = {
      id: projectileIdRef.current++,
      x: attackerCenter.x,
      y: attackerCenter.y,
      angle,
      targetX,
      targetY,
      startX: attackerCenter.x,
      startY: attackerCenter.y,
      startTime: Date.now(),
      travelTime,
    };

    setProjectiles((prev) => [...prev, newProjectile]);

    // Remove projectile after it reaches target
    setTimeout(() => {
      setProjectiles((prev) => prev.filter((p) => p.id !== newProjectile.id));
    }, travelTime * 1000);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
  ]);

  // Handle projectile despawn and respawn
  useEffect(() => {
    if (projectiles.length === 0) {
      // All projectiles despawned, wait before spawning next one (slow rate of fire)
      timeoutRef.current = setTimeout(() => {
        spawnProjectile();
      }, 2000); // 2 seconds between shots (slower than missiles which are 1 second)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectiles, spawnProjectile]);

  // Animate projectiles
  useEffect(() => {
    if (projectiles.length === 0) return;
    if (!gridContainerRef.current) return;

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const SPEED = avgCellSize * 8; // Constant speed

    const animate = () => {
      const now = Date.now();
      const updatedProjectiles = projectiles
        .map((projectile) => {
          const elapsed = (now - projectile.startTime) / 1000;
          const progress = Math.min(elapsed / projectile.travelTime, 1);

          if (progress >= 1) {
            // Projectile reached target - mark for removal
            return null;
          }

          // Constant speed movement
          const currentX =
            projectile.startX +
            (projectile.targetX - projectile.startX) * progress;
          const currentY =
            projectile.startY +
            (projectile.targetY - projectile.startY) * progress;

          // Always point at target
          const angleDx = projectile.targetX - currentX;
          const angleDy = projectile.targetY - currentY;
          const angle = Math.atan2(angleDy, angleDx) * (180 / Math.PI);

          return {
            ...projectile,
            x: currentX,
            y: currentY,
            angle,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setProjectiles(updatedProjectiles);

      if (updatedProjectiles.length > 0) {
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
  }, [projectiles, gridContainerRef]);

  // Start first projectile
  useEffect(() => {
    spawnProjectile();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [spawnProjectile]);

  if (!gridContainerRef.current || projectiles.length === 0) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  // Create cylinder shape (small rectangle)
  const cylinderWidth = 3; // Width of cylinder (reduced by 50%)
  const cylinderHeight = 6; // Length of cylinder (reduced by 50%)

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
      {projectiles.map((projectile) => (
        <rect
          key={projectile.id}
          x={-cylinderWidth / 2}
          y={-cylinderHeight / 2}
          width={cylinderWidth}
          height={cylinderHeight}
          fill="white"
          stroke="white"
          strokeWidth="1"
          transform={`translate(${projectile.x}, ${projectile.y}) rotate(${
            projectile.angle + 90
          })`}
        />
      ))}
    </svg>
  );
}
