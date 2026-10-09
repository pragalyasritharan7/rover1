import * as THREE from 'three';

export interface MarsTerrainScene {
  terrainGroup: THREE.Group;
  getTerrainHeight: (x: number, z: number) => number;
  setGridVisibility: (visible: boolean) => void;
  setGridOpacity: (opacity: number) => void;
  updateMarkers: (
    knownMap: (number | null)[][],
    plannedPath: [number, number][],
    trail: [number, number][],
    roverPos: [number, number] | null,
    gridWidth: number,
    gridHeight: number,
    scale: number,
    mode?: string
  ) => void;
}

// Helper to generate a procedural ground canvas texture
function createProceduralMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Base rust red / ochre gradient
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 360);
    grad.addColorStop(0, '#c2522b');
    grad.addColorStop(0.5, '#a33d1c');
    grad.addColorStop(1, '#78260f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Dust noise grain & rock specs
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.4));
    }
    ctx.putImageData(imgData, 0, 0);

    // Darker regolith patches
    ctx.fillStyle = 'rgba(60, 20, 10, 0.15)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * 512,
        Math.random() * 512,
        20 + Math.random() * 60,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

export function createMarsTerrain(
  gridWidth: number = 25,
  gridHeight: number = 25,
  scale: number = 2.0
): MarsTerrainScene {
  const terrainGroup = new THREE.Group();

  const worldWidth = gridWidth * scale;
  const worldHeight = gridHeight * scale;
  const halfW = worldWidth / 2;
  const halfH = worldHeight / 2;

  // ----------------------------------------------------
  // 1. ELEVATION FUNCTION (Dunes, Craters & Distant Rim)
  // ----------------------------------------------------
  const getTerrainHeight = (x: number, z: number): number => {
    const distFromCenter = Math.sqrt(x * x + z * z);
    const maxNavRadius = Math.max(worldWidth, worldHeight) * 0.65;

    // Smooth rolling dunes and shallow depressions
    let h =
      Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.5 +
      Math.sin(x * 0.35 + z * 0.25) * 0.2 +
      Math.cos(x * 0.06 - z * 0.08) * 0.6;

    // Distant mountain rim elevation outside navigable boundary
    if (distFromCenter > maxNavRadius) {
      const delta = distFromCenter - maxNavRadius;
      h += Math.pow(delta * 0.28, 1.3);
    }

    return h;
  };

  // ----------------------------------------------------
  // 2. MAIN TERRAIN MESH WITH PROCEDURAL TEXTURE
  // ----------------------------------------------------
  const segments = 120;
  const planeGeo = new THREE.PlaneGeometry(
    worldWidth * 2.2,
    worldHeight * 2.2,
    segments,
    segments
  );
  planeGeo.rotateX(-Math.PI / 2);

  const posAttr = planeGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, getTerrainHeight(vx, vz));
  }
  planeGeo.computeVertexNormals();

  const marsTexture = createProceduralMarsTexture();
  const marsMat = new THREE.MeshStandardMaterial({
    map: marsTexture,
    bumpMap: marsTexture,
    bumpScale: 0.12,
    color: 0xbd4a2b,
    roughness: 0.92,
    metalness: 0.08,
  });

  const terrainMesh = new THREE.Mesh(planeGeo, marsMat);
  terrainMesh.receiveShadow = true;
  terrainGroup.add(terrainMesh);

  // ----------------------------------------------------
  // 3. INSTANCED ROCKS & BOULDERS SCATTERING
  // ----------------------------------------------------
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a2315,
    roughness: 0.95,
    metalness: 0.1,
  });

  const rockGeo = new THREE.DodecahedronGeometry(0.4, 1);
  const numRocks = 180;
  const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, numRocks);
  instancedRocks.castShadow = true;
  instancedRocks.receiveShadow = true;

  const dummy = new THREE.Object3D();
  // Deterministic seed placement
  let rockIndex = 0;
  for (let i = 0; i < numRocks; i++) {
    const angle = (i / numRocks) * Math.PI * 2 + (i % 7) * 0.5;
    const dist = 3 + ((i * 13) % (worldWidth * 0.9));
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const ry = getTerrainHeight(rx, rz);

    const scaleS = 0.2 + ((i * 17) % 10) * 0.08;
    dummy.position.set(rx, ry + scaleS * 0.3, rz);
    dummy.rotation.set((i * 0.4) % Math.PI, (i * 0.8) % Math.PI, 0);
    dummy.scale.set(scaleS, scaleS * (0.6 + ((i * 3) % 5) * 0.1), scaleS);
    dummy.updateMatrix();

    instancedRocks.setMatrixAt(rockIndex++, dummy.matrix);
  }
  instancedRocks.instanceMatrix.needsUpdate = true;
  terrainGroup.add(instancedRocks);

  // ----------------------------------------------------
  // 4. DISTANT HORIZON MESAS & MOUNTAIN CLIFFS
  // ----------------------------------------------------
  const mesaMat = new THREE.MeshStandardMaterial({
    color: 0x752b19,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mesaCount = 8;
  for (let i = 0; i < mesaCount; i++) {
    const angle = (i / mesaCount) * Math.PI * 2;
    const dist = worldWidth * 1.05;
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist;
    const my = getTerrainHeight(mx, mz);

    const mesaGeo = new THREE.CylinderGeometry(
      3 + (i % 3) * 2,
      6 + (i % 3) * 3,
      8 + (i % 4) * 3,
      7
    );
    const mesa = new THREE.Mesh(mesaGeo, mesaMat);
    mesa.position.set(mx, my + 3, mz);
    mesa.rotation.y = angle;
    mesa.castShadow = true;
    terrainGroup.add(mesa);
  }

  // ----------------------------------------------------
  // 5. SIMULATION-ALIGNED TACTICAL GRID OVERLAY
  // ----------------------------------------------------
  const gridGroup = new THREE.Group();
  terrainGroup.add(gridGroup);

  const gridLineMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.35,
    linewidth: 1,
  });

  // Build grid lines following terrain height
  const gridPoints: THREE.Vector3[] = [];

  // Vertical cell grid lines (X constant, Z varying)
  for (let x = 0; x <= gridWidth; x++) {
    const wx = x * scale - halfW;
    for (let y = 0; y < gridHeight; y++) {
      const wz1 = y * scale - halfH;
      const wz2 = (y + 1) * scale - halfH;
      gridPoints.push(
        new THREE.Vector3(wx, getTerrainHeight(wx, wz1) + 0.08, wz1),
        new THREE.Vector3(wx, getTerrainHeight(wx, wz2) + 0.08, wz2)
      );
    }
  }

  // Horizontal cell grid lines (Z constant, X varying)
  for (let y = 0; y <= gridHeight; y++) {
    const wz = y * scale - halfH;
    for (let x = 0; x < gridWidth; x++) {
      const wx1 = x * scale - halfW;
      const wx2 = (x + 1) * scale - halfW;
      gridPoints.push(
        new THREE.Vector3(wx1, getTerrainHeight(wx1, wz) + 0.08, wz),
        new THREE.Vector3(wx2, getTerrainHeight(wx2, wz) + 0.08, wz)
      );
    }
  }

  const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
  const gridLinesMesh = new THREE.LineSegments(gridGeo, gridLineMat);
  gridGroup.add(gridLinesMesh);

  // Active Rover Cell Highlight Box Mesh
  const activeCellGeo = new THREE.PlaneGeometry(scale * 0.95, scale * 0.95);
  activeCellGeo.rotateX(-Math.PI / 2);
  const activeCellMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const activeCellMesh = new THREE.Mesh(activeCellGeo, activeCellMat);
  gridGroup.add(activeCellMesh);

  // Active Cell Border Line
  const borderGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-scale * 0.48, 0, -scale * 0.48),
    new THREE.Vector3(scale * 0.48, 0, -scale * 0.48),
    new THREE.Vector3(scale * 0.48, 0, scale * 0.48),
    new THREE.Vector3(-scale * 0.48, 0, scale * 0.48),
    new THREE.Vector3(-scale * 0.48, 0, -scale * 0.48),
  ]);
  const activeCellBorder = new THREE.Line(
    borderGeo,
    new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 })
  );
  activeCellMesh.add(activeCellBorder);

  // ----------------------------------------------------
  // 6. DYNAMIC MARKERS, TRAIL & PATH RIBBONS
  // ----------------------------------------------------
  const markersGroup = new THREE.Group();
  terrainGroup.add(markersGroup);

  const commBeaconMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.35,
  });

  const dataSiteMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff7700,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xaa0022,
    emissiveIntensity: 0.7,
  });

  return {
    terrainGroup,
    getTerrainHeight,

    setGridVisibility: (visible: boolean) => {
      gridGroup.visible = visible;
    },

    setGridOpacity: (opacity: number) => {
      gridLineMat.opacity = opacity;
    },

    updateMarkers: (
      knownMap: (number | null)[][],
      plannedPath: [number, number][],
      trail: [number, number][],
      roverPos: [number, number] | null,
      w: number,
      h: number,
      sc: number,
      mode?: string
    ) => {
      // 1. Update Active Cell position
      if (roverPos) {
        const [rx, ry] = roverPos;
        const wx = rx * sc - halfW + sc / 2;
        const wz = ry * sc - halfH + sc / 2;
        const gh = getTerrainHeight(wx, wz);
        activeCellMesh.position.set(wx, gh + 0.12, wz);
        activeCellMesh.visible = true;
      } else {
        activeCellMesh.visible = false;
      }

      // 2. Clear old dynamic markers
      while (markersGroup.children.length > 0) {
        markersGroup.remove(markersGroup.children[0]);
      }

      // 3. Render Cell Markers from Known Map
      if (knownMap && knownMap.length > 0) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const val = knownMap[y]?.[x];
            if (val === null || val === undefined) continue;

            const wx = x * sc - halfW + sc / 2;
            const wz = y * sc - halfH + sc / 2;
            const gh = getTerrainHeight(wx, wz);

            if (val === 3) {
              // Comm Zone Beacon Beam & Ring Base
              const beamGeo = new THREE.CylinderGeometry(0.6, 0.6, 14, 16, 1, true);
              const beam = new THREE.Mesh(beamGeo, commBeaconMat);
              beam.position.set(wx, gh + 7, wz);
              markersGroup.add(beam);

              const ringGeo = new THREE.RingGeometry(0.5, 0.85, 24);
              ringGeo.rotateX(-Math.PI / 2);
              const ring = new THREE.Mesh(
                ringGeo,
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
              );
              ring.position.set(wx, gh + 0.14, wz);
              markersGroup.add(ring);
            } else if (val === 4) {
              // Data Site Floating Orb
              const orbGeo = new THREE.SphereGeometry(0.45, 16, 16);
              const orb = new THREE.Mesh(orbGeo, dataSiteMat);
              orb.position.set(wx, gh + 1.0, wz);
              markersGroup.add(orb);

              // Small pedestal
              const pedGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.6, 12);
              const ped = new THREE.Mesh(
                pedGeo,
                new THREE.MeshStandardMaterial({ color: 0x333842, metalness: 0.8 })
              );
              ped.position.set(wx, gh + 0.3, wz);
              markersGroup.add(ped);
            } else if (val === 2) {
              // Hazard Pad Warning
              const padGeo = new THREE.BoxGeometry(sc * 0.9, 0.08, sc * 0.9);
              const pad = new THREE.Mesh(padGeo, hazardMat);
              pad.position.set(wx, gh + 0.09, wz);
              markersGroup.add(pad);
            }
          }
        }
      }

      // 4. Render Historical Explored Trail Line
      if (trail && trail.length > 1) {
        const trailPoints: THREE.Vector3[] = trail.map(([tx, ty]) => {
          const wx = tx * sc - halfW + sc / 2;
          const wz = ty * sc - halfH + sc / 2;
          return new THREE.Vector3(wx, getTerrainHeight(wx, wz) + 0.2, wz);
        });
        const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
        const trailMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 3 });
        const trailMesh = new THREE.Line(trailGeo, trailMat);
        markersGroup.add(trailMesh);
      }

      // 5. Render Planned / Return Path Line
      if (plannedPath && plannedPath.length > 1) {
        const isReturn = mode === 'RETURNING';
        const pathColor = isReturn ? 0xffaa00 : 0x00ffff;

        const planPoints: THREE.Vector3[] = plannedPath.map(([px, py]) => {
          const wx = px * sc - halfW + sc / 2;
          const wz = py * sc - halfH + sc / 2;
          return new THREE.Vector3(wx, getTerrainHeight(wx, wz) + 0.3, wz);
        });
        const planGeo = new THREE.BufferGeometry().setFromPoints(planPoints);
        const planMat = new THREE.LineDashedMaterial({
          color: pathColor,
          dashSize: 0.5,
          gapSize: 0.25,
          linewidth: 2,
        });
        const plannedMesh = new THREE.Line(planGeo, planMat);
        plannedMesh.computeLineDistances();
        markersGroup.add(plannedMesh);
      }
    },
  };
}
