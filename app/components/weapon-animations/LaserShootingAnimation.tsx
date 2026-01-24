"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface LaserShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

export function LaserShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: LaserShootingAnimationProps) {
  const [lines, setLines] = useState<
    Array<{ id: number; endX: number; endY: number }>
  >([]);
  const lineIdRef = useRef(0);

  // Calculate cell centers relative to grid container
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;

      // Calculate position relative to grid container (not screen)
      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Create a new line
  const createLine = useCallback(() => {
    if (!gridContainerRef.current) return;

    const targetCenter = getCellCenter(targetRow, targetCol);

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    // Random point within center 50% of target cell
    const randomX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.5;
    const randomY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.5;

    const newLine = {
      id: lineIdRef.current++,
      endX: randomX,
      endY: randomY,
    };

    setLines((prev) => [...prev, newLine]);

    // Remove line after fade animation (0.5s)
    setTimeout(() => {
      setLines((prev) => prev.filter((line) => line.id !== newLine.id));
    }, 500);
  }, [targetRow, targetCol, getCellCenter]);

  // Continuously create new lines
  useEffect(() => {
    // Create first line immediately
    createLine();

    // Create new lines continuously
    const interval = setInterval(() => {
      createLine();
    }, 500); // Create a new line every 0.5 seconds

    return () => clearInterval(interval);
  }, [createLine]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();
  const attackerCenter = getCellCenter(attackerRow, attackerCol);

  return (
    <svg
      className="absolute pointer-events-none z-5"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {lines.map((line) => {
        // Calculate line length and angle
        const dx = line.endX - attackerCenter.x;
        const dy = line.endY - attackerCenter.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <rect
            key={line.id}
            x={attackerCenter.x}
            y={attackerCenter.y - 1}
            width={length}
            height="2"
            fill="red"
            stroke="red"
            strokeWidth="0"
            transform={`rotate(${angle} ${attackerCenter.x} ${attackerCenter.y})`}
            className="animate-laser-fade"
          />
        );
      })}
    </svg>
  );
}
