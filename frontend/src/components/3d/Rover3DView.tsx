import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMissionStore } from '../../store/useMissionStore';
import { CameraMode3D, Mission3DOverlay } from './Mission3DOverlay';
import { createRoverModel, Rover3DModel } from './RoverModel';
import { createMarsTerrain, MarsTerrainScene } from './MarsTerrain';

export const Rover3DView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode3D>('CHASE_CAM');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [gridOpacity, setGridOpacity] = useState<number>(0.35);
  const [showCoords, setShowCoords] = useState<boolean>(false);

  const currentSnapshot = useMissionStore((s) => s.currentSnapshot);
  const gridWidth = currentSnapshot?.grid_size ? currentSnapshot.grid_size[0] : 25;
  const gridHeight = currentSnapshot?.grid_size ? currentSnapshot.grid_size[1] : 25;

  const scale = 2.0;
  const halfW = (gridWidth * scale) / 2;
  const halfH = (gridHeight * scale) / 2;

  // Persistent Three.js Refs
  const roverModelRef = useRef<Rover3DModel | null>(null);
  const terrainSceneRef = useRef<MarsTerrainScene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const currentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const desiredCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 4, -8));
  const desiredCamTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 4));
  const desiredFovRef = useRef<number>(45);
  const zoomFactorRef = useRef<number>(1.0);
  const prevRoverPosRef = useRef<[number, number] | null>(null);

  // Initialize Three.js Scene, Camera, Renderer, and Controls
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene & Deep Martian Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a0f07);
    scene.fog = new THREE.FogExp2(0x3a140a, 0.0095);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, -8);
    cameraRef.current = camera;

    // 3. Renderer with High-Performance Shadow Maps & ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    containerRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls with Zooming Enabled
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.2;
    controls.maxDistance = 140;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controlsRef.current = controls;

    // 5. Directional Sun & Ambient Lighting
    const sunLight = new THREE.DirectionalLight(0xffb885, 2.2);
    sunLight.position.set(45, 55, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.bias = -0.0003;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xffc2a0, 0x2e0d04, 0.9);
    scene.add(hemiLight);

    // 6. Build Terrain & Rover Model
    const terrain = createMarsTerrain(gridWidth, gridHeight, scale);
    scene.add(terrain.terrainGroup);
    terrainSceneRef.current = terrain;

    const roverModel = createRoverModel();
    scene.add(roverModel.group);
    roverModelRef.current = roverModel;

    // Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Main Render Loop with Smooth Driving Chase Lerp & Dynamic Zoom
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Lerp rover ground position and pitch/roll pose
      if (roverModelRef.current && terrainSceneRef.current) {
        currentPosRef.current.lerp(targetPosRef.current, 0.15);
        roverModelRef.current.updatePose(
          currentPosRef.current.x,
          currentPosRef.current.z,
          terrainSceneRef.current.getTerrainHeight
        );
      }

      // Smooth camera interpolation & focal length (FOV) transitions
      if (controlsRef.current && cameraRef.current) {
        if (cameraMode !== 'FREE_ORBIT') {
          const targetCamPos = desiredCamPosRef.current.clone();
          if (cameraMode === 'CHASE_CAM') {
            targetCamPos.y += Math.sin(elapsedTime * 1.5) * 0.03;
          }

          cameraRef.current.position.lerp(targetCamPos, 0.1);
          controlsRef.current.target.lerp(desiredCamTargetRef.current, 0.1);

          if (Math.abs(cameraRef.current.fov - desiredFovRef.current) > 0.05) {
            cameraRef.current.fov += (desiredFovRef.current - cameraRef.current.fov) * 0.1;
            cameraRef.current.updateProjectionMatrix();
          }
        }
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Clean up WebGL resources on unmount
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Calculate Vehicle Game Camera Positions Relative to Rover Heading & Zoom Factor
  const updateVehicleGameCameraPreset = (mode: CameraMode3D) => {
    if (!roverModelRef.current) return;
    const pos = currentPosRef.current;
    const heading = roverModelRef.current.group.rotation.y;
    const zf = zoomFactorRef.current;

    // Helper to rotate local camera offset vector (dx, dy, dz) by rover heading angle
    const transformOffset = (dx: number, dy: number, dz: number): THREE.Vector3 => {
      const wx = dx * Math.cos(heading) + dz * Math.sin(heading);
      const wz = -dx * Math.sin(heading) + dz * Math.cos(heading);
      return new THREE.Vector3(pos.x + wx, pos.y + dy, pos.z + wz);
    };

    if (mode === 'CHASE_CAM') {
      // 🏎️ Driving Chase Cam with Zoom
      desiredCamPosRef.current.copy(transformOffset(0, 3.2 * zf, -7.5 * zf));
      desiredCamTargetRef.current.copy(transformOffset(0, 1.2, 4.0));
      desiredFovRef.current = 45;
    } else if (mode === 'COCKPIT_CAM') {
      // 👁️ Driver Cockpit View with Zoom
      desiredCamPosRef.current.copy(transformOffset(0.55, 2.9 * zf, 1.15));
      desiredCamTargetRef.current.copy(transformOffset(0.55, 2.7, 8.0));
      desiredFovRef.current = 55;
    } else if (mode === 'TOP_DOWN_MAP') {
      // 🗺️ Overhead Mini-Map View with Zoom
      desiredCamPosRef.current.set(pos.x, pos.y + 18.0 * zf, pos.z + 0.01);
      desiredCamTargetRef.current.set(pos.x, pos.y + 0.5, pos.z);
      desiredFovRef.current = 35;
    } else if (mode === 'FREE_ORBIT') {
      // 🔄 Free Orbit Inspect Cam
      desiredCamPosRef.current.copy(transformOffset(4.5 * zf, 2.5 * zf, 5.5 * zf));
      desiredCamTargetRef.current.set(pos.x, pos.y + 0.8, pos.z);
      desiredFovRef.current = 45;
    }
  };

  // Zoom In / Zoom Out Action Handlers
  const zoomIn = () => {
    zoomFactorRef.current = Math.max(0.4, zoomFactorRef.current * 0.82);
    updateVehicleGameCameraPreset(cameraMode);
  };

  const zoomOut = () => {
    zoomFactorRef.current = Math.min(2.8, zoomFactorRef.current * 1.22);
    updateVehicleGameCameraPreset(cameraMode);
  };

  // Keyboard shortcut listener (+ / = for Zoom In, - / _ for Zoom Out)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMode]);

  // Update Tactical Grid visibility & opacity controls
  useEffect(() => {
    if (terrainSceneRef.current) {
      terrainSceneRef.current.setGridVisibility(showGrid);
      terrainSceneRef.current.setGridOpacity(gridOpacity);
    }
  }, [showGrid, gridOpacity]);

  // Synchronize 3D Rover position, heading, wheels, and markers when snapshot updates
  useEffect(() => {
    if (!currentSnapshot || !roverModelRef.current) return;

    const [rx, ry] = currentSnapshot.rover.pos;
    const wx = rx * scale - halfW + scale / 2;
    const wz = ry * scale - halfH + scale / 2;

    targetPosRef.current.set(wx, 0, wz);

    // Chassis heading rotation & wheel rotation
    if (prevRoverPosRef.current) {
      const [px, py] = prevRoverPosRef.current;
      const dx = rx - px;
      const dy = ry - py;
      if (dx !== 0 || dy !== 0) {
        const targetAngle = Math.atan2(dx, dy);
        roverModelRef.current.group.rotation.y = targetAngle;
        const dist = Math.sqrt(dx * dx + dy * dy) * scale;
        roverModelRef.current.updateWheels(dist);
      }
    } else {
      currentPosRef.current.set(wx, 0, wz);
    }

    prevRoverPosRef.current = [rx, ry];

    // Update dynamic 3D markers & paths
    if (terrainSceneRef.current) {
      terrainSceneRef.current.updateMarkers(
        currentSnapshot.known_map,
        currentSnapshot.planned_path,
        currentSnapshot.trail,
        currentSnapshot.rover.pos,
        gridWidth,
        gridHeight,
        scale,
        currentSnapshot.rover.mode
      );
    }

    updateVehicleGameCameraPreset(cameraMode);
  }, [currentSnapshot]);

  // Update camera preset target when camera mode changes
  useEffect(() => {
    updateVehicleGameCameraPreset(cameraMode);
  }, [cameraMode]);

  const resetCamera = () => {
    zoomFactorRef.current = 1.0;
    setCameraMode('CHASE_CAM');
    updateVehicleGameCameraPreset('CHASE_CAM');
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#070a12',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <Mission3DOverlay
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        resetCamera={resetCamera}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        gridOpacity={gridOpacity}
        setGridOpacity={setGridOpacity}
        showCoords={showCoords}
        setShowCoords={setShowCoords}
      />
    </div>
  );
};

export default Rover3DView;
