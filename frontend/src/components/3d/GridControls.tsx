import React from 'react';

interface GridControlsProps {
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  gridOpacity: number;
  setGridOpacity: (opacity: number) => void;
  showCoords: boolean;
  setShowCoords: (show: boolean) => void;
}

export const GridControls: React.FC<GridControlsProps> = ({
  showGrid,
  setShowGrid,
  gridOpacity,
  setGridOpacity,
  showCoords,
  setShowCoords,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 12px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        borderRadius: '8px',
        color: '#e2e8f0',
        fontSize: '11px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          color: '#00e5ff',
          letterSpacing: '0.5px',
        }}
      >
        <span>TACTICAL GRID</span>
        <button
          onClick={() => setShowGrid(!showGrid)}
          style={{
            cursor: 'pointer',
            padding: '3px 8px',
            borderRadius: '4px',
            border: 'none',
            background: showGrid ? '#00e5ff' : 'rgba(255, 255, 255, 0.1)',
            color: showGrid ? '#070a12' : '#94a3b8',
            fontWeight: 800,
            fontSize: '10px',
          }}
        >
          {showGrid ? 'ON' : 'OFF'}
        </button>
      </div>

      {showGrid && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>OPACITY</span>
              <span>{Math.round(gridOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={gridOpacity}
              onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
              style={{ accentColor: '#00e5ff', cursor: 'pointer', height: '4px' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2px',
            }}
          >
            <span style={{ color: '#94a3b8' }}>CELL COORDS</span>
            <input
              type="checkbox"
              checked={showCoords}
              onChange={(e) => setShowCoords(e.target.checked)}
              style={{ accentColor: '#00e5ff', cursor: 'pointer' }}
            />
          </div>
        </>
      )}
    </div>
  );
};
