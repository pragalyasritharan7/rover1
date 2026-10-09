import React from 'react';
import { useMissionStore } from '../../store/useMissionStore';
import { GridControls } from './GridControls';

export type CameraMode3D = 'CHASE_CAM' | 'COCKPIT_CAM' | 'TOP_DOWN_MAP' | 'FREE_ORBIT';

interface Mission3DOverlayProps {
  cameraMode: CameraMode3D;
  setCameraMode: (mode: CameraMode3D) => void;
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  gridOpacity: number;
  setGridOpacity: (opacity: number) => void;
  showCoords: boolean;
  setShowCoords: (show: boolean) => void;
}

const ESSENTIAL_CAMERA_MODES: { mode: CameraMode3D; label: string; icon: string }[] = [
  { mode: 'CHASE_CAM', label: 'CHASE CAM (Driving View)', icon: '🏎️' },
  { mode: 'COCKPIT_CAM', label: 'MASTCAM / COCKPIT', icon: '👁️' },
  { mode: 'TOP_DOWN_MAP', label: 'TOP DOWN MAP', icon: '🗺️' },
  { mode: 'FREE_ORBIT', label: 'FREE ORBIT', icon: '🔄' },
];

export const Mission3DOverlay: React.FC<Mission3DOverlayProps> = ({
  cameraMode,
  setCameraMode,
  resetCamera,
  zoomIn,
  zoomOut,
  showGrid,
  setShowGrid,
  gridOpacity,
  setGridOpacity,
  showCoords,
  setShowCoords,
}) => {
  const setActiveTab = useMissionStore((s) => s.setActiveTab);
  const currentSnapshot = useMissionStore((s) => s.currentSnapshot);
  const currentStepIndex = useMissionStore((s) => s.currentStepIndex);
  const snapshots = useMissionStore((s) => s.snapshots);
  const setStep = useMissionStore((s) => s.setStep);
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const setIsPlaying = useMissionStore((s) => s.setIsPlaying);
  const stepForward = useMissionStore((s) => s.stepForward);
  const stepBackward = useMissionStore((s) => s.stepBackward);
  const resetPlayback = useMissionStore((s) => s.resetPlayback);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);

  const rover = currentSnapshot?.rover;
  const metrics = currentSnapshot?.metrics;
  const energyPct = rover ? Math.max(0, Math.round((rover.energy / rover.max_energy) * 100)) : 100;

  const modeColors: Record<string, string> = {
    EXPLORING: '#00e5ff',
    COLLECTING: '#ffaa00',
    RETURNING: '#ff4488',
    UPLOADING: '#a000ff',
    SUCCESS: '#00ff66',
    LOST: '#ff0033',
    INCOMPLETE: '#ffbb00',
  };

  const badgeColor = rover ? modeColors[rover.mode] || '#00e5ff' : '#00e5ff';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px',
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 10,
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 14, 23, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: '10px',
          padding: '10px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#00e5ff',
              boxShadow: '0 0 10px #00e5ff',
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                color: '#ffffff',
              }}
            >
              LOST IN SPACE <span style={{ color: '#00e5ff' }}>// 3D MARS MISSION CONTROL</span>
            </h1>
            <div style={{ fontSize: '11px', color: '#8a99ad', fontFamily: 'monospace' }}>
              STEP {currentSnapshot?.step ?? 0} &bull; POS [{rover?.pos?.[0] ?? 1},{' '}
              {rover?.pos?.[1] ?? 1}] &bull; LAT 18.4° N, LON 77.2° E
            </div>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Energy Gauge */}
          <div style={{ width: '140px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                marginBottom: '4px',
                color: '#c4d1e0',
                fontWeight: 600,
              }}
            >
              <span>ENERGY</span>
              <span>
                {rover?.energy ?? 0} / {rover?.max_energy ?? 250} ({energyPct}%)
              </span>
            </div>
            <div
              style={{
                height: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${energyPct}%`,
                  background:
                    energyPct > 40 ? '#00e5ff' : energyPct > 20 ? '#ffaa00' : '#ff0033',
                  transition: 'width 0.3s ease',
                  boxShadow: `0 0 8px ${energyPct > 40 ? '#00e5ff' : '#ff0033'}`,
                }}
              />
            </div>
          </div>

          {/* Data Carried / Uploaded */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <div style={{ fontSize: '9px', color: '#8a99ad' }}>CARRIED</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffaa00' }}>
                {rover?.data_carried ?? 0} MB
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: '#8a99ad' }}>UPLOADED</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#00ff66' }}>
                {rover?.data_uploaded ?? 0} MB
              </div>
            </div>
          </div>

          {/* Mode Badge */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: `${badgeColor}18`,
              border: `1px solid ${badgeColor}`,
              color: badgeColor,
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '1px',
              boxShadow: `0 0 10px ${badgeColor}33`,
            }}
          >
            {rover?.mode ?? 'EXPLORING'}
          </div>

          {/* Back to 2D Button */}
          <button
            onClick={() => setActiveTab('mission')}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              padding: '8px 18px',
              borderRadius: '6px',
              border: '1px solid #00e5ff',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 150, 255, 0.3))',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '1px',
              boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            &larr; BACK TO 2D
          </button>
        </div>
      </header>

      {/* Middle Workspace: Left Sidebar (Camera Modes & Zoom Controls) & Right Telemetry + Legend */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '10px 0',
        }}
      >
        {/* Left Sidebar */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            width: '200px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#00e5ff',
              letterSpacing: '1px',
            }}
          >
            CAMERA CONTROLS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ESSENTIAL_CAMERA_MODES.map(({ mode, label, icon }) => {
              const isActive = cameraMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: isActive ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isActive ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '11px',
                    textAlign: 'left',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}

            {/* Interactive Zoom Controls */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                onClick={zoomIn}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: '1px solid rgba(0, 229, 255, 0.4)',
                  background: 'rgba(0, 229, 255, 0.12)',
                  color: '#00e5ff',
                  fontWeight: 800,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>🔍</span> + ZOOM IN
              </button>
              <button
                onClick={zoomOut}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: '1px solid rgba(0, 229, 255, 0.4)',
                  background: 'rgba(0, 229, 255, 0.12)',
                  color: '#00e5ff',
                  fontWeight: 800,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>🔍</span> - ZOOM OUT
              </button>
            </div>

            <button
              onClick={resetCamera}
              style={{
                cursor: 'pointer',
                marginTop: '2px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px dashed rgba(0, 229, 255, 0.4)',
                background: 'transparent',
                color: '#00e5ff',
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '0.5px',
              }}
            >
              RESET CAMERA
            </button>
          </div>

          {/* Tactical Grid Controls Card */}
          <GridControls
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            gridOpacity={gridOpacity}
            setGridOpacity={setGridOpacity}
            showCoords={showCoords}
            setShowCoords={setShowCoords}
          />
        </div>

        {/* Right Panel: Telemetry & Legend */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            width: '210px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#8a99ad', letterSpacing: '1px' }}>
            TELEMETRY METRICS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '9px', color: '#8a99ad' }}>EXPLORED</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#00e5ff' }}>
                {metrics?.explored_pct ?? 0}%
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '9px', color: '#8a99ad' }}>REPLANS</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffaa00' }}>
                {metrics?.replans ?? 0}
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '9px', color: '#8a99ad' }}>ENERGY USED</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                {metrics?.energy_used ?? 0} J
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '9px', color: '#8a99ad' }}>BLOCKED</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4488' }}>
                {metrics?.blocked_events ?? 0}
              </div>
            </div>
          </div>

          {/* Tactical Legend Panel */}
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#8a99ad',
                letterSpacing: '0.8px',
                marginBottom: '6px',
              }}
            >
              3D LEGEND
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                <div style={{ width: '12px', height: '3px', background: '#00e5ff' }} />
                <span>Explored Trail</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                <div style={{ width: '12px', height: '2px', background: '#00ffff' }} />
                <span>Planned Path</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                <div style={{ width: '12px', height: '2px', background: '#ffaa00' }} />
                <span>Return Path</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffaa00' }} />
                <span>Data Site</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e5ff' }} />
                <span>Comm Zone</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                <div style={{ width: '8px', height: '8px', background: '#ff2244' }} />
                <span>Hazard Zone</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Playback Bar */}
      <footer
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'rgba(10, 14, 23, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: '10px',
          padding: '10px 18px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Play / Pause / Reset Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: isPlaying ? '#ff4488' : '#00e5ff',
              color: '#070a12',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.5px',
            }}
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            onClick={stepBackward}
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '11px',
            }}
          >
            &lt; STEP
          </button>
          <button
            onClick={stepForward}
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '11px',
            }}
          >
            STEP &gt;
          </button>
          <button
            onClick={resetPlayback}
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#8a99ad',
              fontSize: '11px',
            }}
          >
            RESET
          </button>
        </div>

        {/* Timeline Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, snapshots.length - 1)}
          value={currentStepIndex}
          onChange={(e) => setStep(parseInt(e.target.value, 10))}
          style={{
            flex: 1,
            accentColor: '#00e5ff',
            cursor: 'pointer',
          }}
        />

        {/* Speed Selector */}
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          <option value={200}>0.5x</option>
          <option value={100}>1.0x</option>
          <option value={50}>2.0x</option>
          <option value={25}>4.0x</option>
        </select>
      </footer>
    </div>
  );
};
