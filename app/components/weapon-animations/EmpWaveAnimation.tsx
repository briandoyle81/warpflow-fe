"use client";

import React, { useCallback, useMemo } from "react";

interface EmpWaveAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

export function EmpWaveAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: EmpWaveAnimationProps) {
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };
      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 17;
      const cellHeight = gridRect.height / 11;
      return { x: col * cellWidth + cellWidth / 2, y: row * cellHeight + cellHeight / 2 };
    },
    [gridContainerRef]
  );

  const geom = useMemo(() => {
    if (!gridContainerRef.current) return null;

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 17;
    const cellHeight = gridRect.height / 11;
    const avgCell = (cellWidth + cellHeight) / 2;

    const a = getCellCenter(attackerRow, attackerCol);
    const t = getCellCenter(targetRow, targetCol);

    const dx = t.x - a.x;
    const dy = t.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    // Extend only slightly past the target center so it reads as "entering"
    // without overshooting beyond the ship's middle.
    const extend = avgCell * 0.08;
    const endX = t.x + ux * extend;
    const endY = t.y + uy * extend;

    return {
      gridRect,
      avgCell,
      a,
      t,
      endX,
      endY,
    };
  }, [gridContainerRef, attackerRow, attackerCol, targetRow, targetCol, getCellCenter]);

  if (!geom) return null;

  const { gridRect, avgCell, a, t, endX, endY } = geom;
  const pathD = `M ${a.x} ${a.y} L ${endX} ${endY}`;

  const baseWidth = Math.max(4, avgCell * 0.18);
  const glowWidth = baseWidth * 1.6;
  const highlightWidth = Math.max(2, baseWidth * 0.45);

  const gradientId = `emp-wave-gradient-${attackerRow}-${attackerCol}-${targetRow}-${targetCol}`;
  const impactId = `emp-impact-gradient-${attackerRow}-${attackerCol}-${targetRow}-${targetCol}`;

  return (
    <svg
      className="absolute pointer-events-none z-30"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1={a.x} y1={a.y} x2={endX} y2={endY} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#56d6ff" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#56d6ff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ffb84d" stopOpacity="0.95" />
          <stop offset="75%" stopColor="#56d6ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#56d6ff" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={impactId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb84d" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#56d6ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#56d6ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft cyan glow underlay */}
      <path
        d={pathD}
        fill="none"
        stroke="#56d6ff"
        strokeOpacity="0.28"
        strokeWidth={glowWidth}
        strokeLinecap="round"
      />

      {/* Main traveling wave (blue/yellow) */}
      <path
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={baseWidth}
        strokeLinecap="round"
        className="emp-wave emp-wave--a"
      />

      {/* Yellow highlight ripples */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffb84d"
        strokeOpacity="0.9"
        strokeWidth={highlightWidth}
        strokeLinecap="round"
        className="emp-wave emp-wave--b"
      />

      {/* Impact pulse at the target */}
      <g className="emp-impact">
        <circle cx={t.x} cy={t.y} r={avgCell * 0.15} fill={`url(#${impactId})`} />
        <circle cx={t.x} cy={t.y} r={avgCell * 0.06} fill="#ffb84d" opacity="0.85" />
      </g>
    </svg>
  );
}

