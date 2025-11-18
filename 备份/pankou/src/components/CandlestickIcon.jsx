import React from "react";

const CandlestickIcon = ({ width = 24, height = 24, color = "currentColor" }) => {
  const lines = [
    { x: 6, y1: 6, y2: 18 },
    { x: 12, y1: 4, y2: 20 },
    { x: 18, y1: 8, y2: 16 },
  ];

  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      {lines.map((line, index) => (
        <line
          key={index}
          x1={line.x}
          y1={line.y1}
          x2={line.x}
          y2={line.y2}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export default CandlestickIcon;
