import * as THREE from 'three';

export interface Rover3DModel {
  group: THREE.Group;
  chassisGroup: THREE.Group;
  updateWheels: (distMoved: number) => void;
  setArmAngle: (angle: number) => void;
  updatePose: (worldX: number, worldZ: number, getTerrainHeight: (x: number, z: number) => number) => void;
}

export function createRoverModel(): Rover3DModel {
  const group = new THREE.Group();
  const chassisGroup = new THREE.Group();
  group.add(chassisGroup);

  // ----------------------------------------------------
  // MATERIAL PALETTES
  // ----------------------------------------------------
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce2, // Weathered silver-white metal
    metalness: 0.82,
    roughness: 0.35,
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Gold thermal insulation blanket
    metalness: 0.95,
    roughness: 0.2,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d24, // Dark structural titanium/steel
    metalness: 0.88,
    roughness: 0.45,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x121417, // Vulcanized dark tread rubber
    roughness: 0.92,
    metalness: 0.08,
  });

  const wheelHubMat = new THREE.MeshStandardMaterial({
    color: 0x7a8a9a,
    metalness: 0.9,
    roughness: 0.3,
  });

  const boltMat = new THREE.MeshStandardMaterial({
    color: 0xe0e5ec,
    metalness: 0.95,
    roughness: 0.2,
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x0099dd,
    emissiveIntensity: 0.85,
    metalness: 0.9,
    roughness: 0.1,
  });

  const solarDeckMat = new THREE.MeshStandardMaterial({
    color: 0x0b1320, // Dark solar cell panel
    metalness: 0.92,
    roughness: 0.22,
  });

  const conduitMat = new THREE.MeshStandardMaterial({
    color: 0xffa000, // Gold/orange cable wrap
    metalness: 0.6,
    roughness: 0.35,
  });

  // ----------------------------------------------------
  // 1. MAIN CHASSIS & UPPER DECK
  // ----------------------------------------------------
  // Main chassis box
  const bodyGeo = new THREE.BoxGeometry(2.3, 0.95, 3.3);
  const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat);
  bodyMesh.position.y = 0.95;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  chassisGroup.add(bodyMesh);

  // Bevel edge panel accents & seam lines
  const seamGeo = new THREE.BoxGeometry(2.32, 0.05, 0.06);
  for (let z = -1.3; z <= 1.3; z += 0.52) {
    const seam = new THREE.Mesh(seamGeo, darkFrameMat);
    seam.position.set(0, 0.95, z);
    chassisGroup.add(seam);
  }

  // Fastener rivets along top edge
  const rivetGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8);
  for (let z = -1.5; z <= 1.5; z += 0.5) {
    const rivetLeft = new THREE.Mesh(rivetGeo, boltMat);
    rivetLeft.position.set(-1.12, 1.43, z);
    chassisGroup.add(rivetLeft);

    const rivetRight = new THREE.Mesh(rivetGeo, boltMat);
    rivetRight.position.set(1.12, 1.43, z);
    chassisGroup.add(rivetRight);
  }

  // Gold thermal foil blanket underside
  const foilGeo = new THREE.BoxGeometry(2.2, 0.45, 3.2);
  const foilMesh = new THREE.Mesh(foilGeo, goldFoilMat);
  foilMesh.position.y = 0.68;
  foilMesh.castShadow = true;
  chassisGroup.add(foilMesh);

  // Top Solar Panel Deck
  const deckGeo = new THREE.BoxGeometry(2.1, 0.06, 3.0);
  const deckMesh = new THREE.Mesh(deckGeo, solarDeckMat);
  deckMesh.position.y = 1.45;
  chassisGroup.add(deckMesh);

  // Equipment Compartment boxes on top deck
  const box1Geo = new THREE.BoxGeometry(0.75, 0.45, 0.85);
  const box1 = new THREE.Mesh(box1Geo, darkFrameMat);
  box1.position.set(-0.65, 1.68, -0.4);
  box1.castShadow = true;
  chassisGroup.add(box1);

  const box2Geo = new THREE.BoxGeometry(0.65, 0.38, 0.75);
  const box2 = new THREE.Mesh(box2Geo, chassisMat);
  box2.position.set(0.55, 1.65, -0.5);
  box2.castShadow = true;
  chassisGroup.add(box2);

  // RTG (Radioisotope Thermoelectric Generator) Nuclear Power Unit at rear
  const rtgGroup = new THREE.Group();
  rtgGroup.position.set(0, 1.45, -1.6);

  const rtgCylGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.15, 16);
  const rtgCyl = new THREE.Mesh(rtgCylGeo, darkFrameMat);
  rtgCyl.rotation.x = Math.PI / 2;
  rtgCyl.castShadow = true;
  rtgGroup.add(rtgCyl);

  // RTG Radiator Cooling Fins
  const finGeo = new THREE.BoxGeometry(1.0, 0.04, 1.05);
  for (let a = 0; a < 4; a++) {
    const fin = new THREE.Mesh(finGeo, darkFrameMat);
    fin.rotation.z = (a * Math.PI) / 4;
    rtgGroup.add(fin);
  }
  chassisGroup.add(rtgGroup);

  // High-Gain Parabolic UHF Antenna Dish
  const antennaGroup = new THREE.Group();
  antennaGroup.position.set(0.8, 1.88, -0.85);

  const dishGeo = new THREE.ConeGeometry(0.45, 0.22, 20, 1, true);
  const dish = new THREE.Mesh(dishGeo, chassisMat);
  dish.rotation.x = -Math.PI / 3;
  dish.rotation.z = Math.PI / 6;
  dish.castShadow = true;
  antennaGroup.add(dish);

  const dishFeedGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8);
  const dishFeed = new THREE.Mesh(dishFeedGeo, darkFrameMat);
  dishFeed.rotation.x = -Math.PI / 3;
  dishFeed.position.set(0, 0.1, 0.16);
  antennaGroup.add(dishFeed);
  chassisGroup.add(antennaGroup);

  // Low-Gain Antenna Whip
  const whipGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8);
  const whip = new THREE.Mesh(whipGeo, darkFrameMat);
  whip.position.set(-0.85, 2.05, -1.2);
  chassisGroup.add(whip);

  // Conduit Cable Harnesses
  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.65, 1.45, 0.9),
    new THREE.Vector3(-0.85, 1.25, 0.3),
    new THREE.Vector3(-0.75, 0.95, -0.8),
    new THREE.Vector3(0, 1.15, -1.4),
  ]);
  const conduitGeo = new THREE.TubeGeometry(conduitCurve, 20, 0.035, 8, false);
  const conduitMesh = new THREE.Mesh(conduitGeo, conduitMat);
  chassisGroup.add(conduitMesh);

  // ----------------------------------------------------
  // 2. UNDERCARRIAGE MECHANICAL DETAILS (For BOTTOM VIEW)
  // ----------------------------------------------------
  const subframeGeo = new THREE.BoxGeometry(2.36, 0.22, 3.36);
  const subframe = new THREE.Mesh(subframeGeo, darkFrameMat);
  subframe.position.y = 0.44;
  subframe.castShadow = true;
  chassisGroup.add(subframe);

  // Bottom Skid Plate
  const skidGeo = new THREE.BoxGeometry(2.1, 0.08, 3.0);
  const skid = new THREE.Mesh(skidGeo, darkFrameMat);
  skid.position.y = 0.32;
  chassisGroup.add(skid);

  // Central Differential Pivot Bar across underside
  const diffBarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12);
  const diffBar = new THREE.Mesh(diffBarGeo, darkFrameMat);
  diffBar.rotation.z = Math.PI / 2;
  diffBar.position.set(0, 0.38, 0.2);
  chassisGroup.add(diffBar);

  // Drive Motor Housing Cylinders underneath
  for (let z = -1.2; z <= 1.2; z += 1.2) {
    const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12);
    const motorLeft = new THREE.Mesh(motorGeo, darkFrameMat);
    motorLeft.rotation.z = Math.PI / 2;
    motorLeft.position.set(-1.0, 0.35, z);
    chassisGroup.add(motorLeft);

    const motorRight = new THREE.Mesh(motorGeo, darkFrameMat);
    motorRight.rotation.z = Math.PI / 2;
    motorRight.position.set(1.0, 0.35, z);
    chassisGroup.add(motorRight);
  }

  // ----------------------------------------------------
  // 3. STEREO CAMERA MAST ASSEMBLY
  // ----------------------------------------------------
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0.55, 1.45, 1.15);

  const poleGeo = new THREE.CylinderGeometry(0.065, 0.075, 1.45, 12);
  const pole = new THREE.Mesh(poleGeo, chassisMat);
  pole.position.y = 0.725;
  pole.castShadow = true;
  mastGroup.add(pole);

  const mastJointGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12);
  const mastJoint = new THREE.Mesh(mastJointGeo, darkFrameMat);
  mastJoint.position.y = 1.45;
  mastGroup.add(mastJoint);

  const headGeo = new THREE.BoxGeometry(0.68, 0.34, 0.38);
  const head = new THREE.Mesh(headGeo, darkFrameMat);
  head.position.set(0, 1.62, 0.06);
  head.castShadow = true;
  mastGroup.add(head);

  // Dual stereo optical camera lenses (NavCam & MastCam)
  const lensCylGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.13, 16);
  const lensLeft = new THREE.Mesh(lensCylGeo, lensMat);
  lensLeft.rotation.x = Math.PI / 2;
  lensLeft.position.set(-0.19, 1.62, 0.24);
  mastGroup.add(lensLeft);

  const lensRight = new THREE.Mesh(lensCylGeo, lensMat);
  lensRight.rotation.x = Math.PI / 2;
  lensRight.position.set(0.19, 1.62, 0.24);
  mastGroup.add(lensRight);

  // ChemCam Laser Spectrometer Center Lens
  const chemCamGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.15, 12);
  const chemCam = new THREE.Mesh(chemCamGeo, lensMat);
  chemCam.rotation.x = Math.PI / 2;
  chemCam.position.set(0, 1.72, 0.24);
  mastGroup.add(chemCam);

  chassisGroup.add(mastGroup);

  // ----------------------------------------------------
  // 4. FRONT ARTICULATED ROBOTIC ARM
  // ----------------------------------------------------
  const armGroup = new THREE.Group();
  armGroup.position.set(-0.55, 0.85, 1.55);

  const shoulderGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const shoulder = new THREE.Mesh(shoulderGeo, darkFrameMat);
  armGroup.add(shoulder);

  const seg1Geo = new THREE.CylinderGeometry(0.065, 0.065, 0.85, 12);
  const seg1 = new THREE.Mesh(seg1Geo, chassisMat);
  seg1.rotation.x = Math.PI / 3;
  seg1.position.set(0, 0.32, 0.32);
  seg1.castShadow = true;
  armGroup.add(seg1);

  const elbowGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12);
  const elbow = new THREE.Mesh(elbowGeo, darkFrameMat);
  elbow.rotation.z = Math.PI / 2;
  elbow.position.set(0, 0.58, 0.62);
  armGroup.add(elbow);

  const seg2Geo = new THREE.CylinderGeometry(0.055, 0.055, 0.75, 12);
  const seg2 = new THREE.Mesh(seg2Geo, chassisMat);
  seg2.rotation.x = -Math.PI / 6;
  seg2.position.set(0, 0.58, 1.0);
  seg2.castShadow = true;
  armGroup.add(seg2);

  const drillGeo = new THREE.ConeGeometry(0.11, 0.38, 12);
  const drill = new THREE.Mesh(drillGeo, darkFrameMat);
  drill.rotation.x = Math.PI / 2;
  drill.position.set(0, 0.48, 1.38);
  drill.castShadow = true;
  armGroup.add(drill);

  chassisGroup.add(armGroup);

  // ----------------------------------------------------
  // 5. SIX DETAILED WHEELS & ROCKER-BOGIE SUSPENSION
  // ----------------------------------------------------
  const wheelMeshes: THREE.Mesh[] = [];
  const wheelRadius = 0.48;

  const wheelLayout = [
    { name: 'FL', x: -1.45, z: 1.3 },   // Front Left
    { name: 'FR', x: 1.45, z: 1.3 },    // Front Right
    { name: 'ML', x: -1.5, z: 0.0 },    // Mid Left
    { name: 'MR', x: 1.5, z: 0.0 },     // Mid Right
    { name: 'RL', x: -1.45, z: -1.3 },  // Rear Left
    { name: 'RR', x: 1.45, z: -1.3 },   // Rear Right
  ];

  wheelLayout.forEach((pos) => {
    const isLeft = pos.x < 0;

    // Rocker / Bogie arm linkage connecting body subframe to wheel hub
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(isLeft ? -0.85 : 0.85, 0.85, pos.z * 0.4),
      new THREE.Vector3(isLeft ? -1.15 : 1.15, 0.65, pos.z * 0.7),
      new THREE.Vector3(pos.x, wheelRadius, pos.z),
    ]);
    const armTubeGeo = new THREE.TubeGeometry(armCurve, 12, 0.055, 8, false);
    const armTube = new THREE.Mesh(armTubeGeo, darkFrameMat);
    armTube.castShadow = true;
    chassisGroup.add(armTube);

    // Wheel Group
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(pos.x, wheelRadius, pos.z);

    // Main Tire Cylinder (Dark vulcanized rubber surface)
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.45, 24);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    wheelGroup.add(tire);

    // Metallic Hub Cap & Axle Hub
    const hubGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.47, 16);
    const hub = new THREE.Mesh(hubGeo, wheelHubMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    // Inner ring of 6 structural mounting bolts on hub face
    for (let b = 0; b < 6; b++) {
      const angleB = (b / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.48, 8), boltMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0, Math.sin(angleB) * 0.16, Math.cos(angleB) * 0.16);
      wheelGroup.add(bolt);
    }

    // 12 Repeated Tread Ridges / Chevron Cleats
    const treadCount = 12;
    const ridgeGeo = new THREE.BoxGeometry(0.08, 0.11, 0.47);
    for (let i = 0; i < treadCount; i++) {
      const ridge = new THREE.Mesh(ridgeGeo, darkFrameMat);
      const angle = (i / treadCount) * Math.PI * 2;
      ridge.position.set(Math.sin(angle) * wheelRadius, Math.cos(angle) * wheelRadius, 0);
      ridge.rotation.z = angle;
      wheelGroup.add(ridge);
    }

    // Axle Shaft Connector
    const axleGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.32, 8);
    const axle = new THREE.Mesh(axleGeo, darkFrameMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(isLeft ? 0.22 : -0.22, 0, 0);
    wheelGroup.add(axle);

    chassisGroup.add(wheelGroup);
    wheelMeshes.push(tire);
  });

  let cumulativeWheelAngle = 0;

  return {
    group,
    chassisGroup,
    updateWheels: (distMoved: number) => {
      cumulativeWheelAngle += distMoved / wheelRadius;
      wheelMeshes.forEach((w) => {
        w.rotation.x = cumulativeWheelAngle;
      });
    },
    setArmAngle: (angle: number) => {
      armGroup.rotation.y = angle;
    },
    updatePose: (worldX: number, worldZ: number, getTerrainHeight: (x: number, z: number) => number) => {
      const flH = getTerrainHeight(worldX - 1.45, worldZ + 1.3);
      const frH = getTerrainHeight(worldX + 1.45, worldZ + 1.3);
      const rlH = getTerrainHeight(worldX - 1.45, worldZ - 1.3);
      const rrH = getTerrainHeight(worldX + 1.45, worldZ - 1.3);

      const avgHeight = (flH + frH + rlH + rrH) / 4;

      const frontAvg = (flH + frH) / 2;
      const rearAvg = (rlH + rrH) / 2;
      const pitch = Math.atan2(frontAvg - rearAvg, 2.6);

      const leftAvg = (flH + rlH) / 2;
      const rightAvg = (frH + rrH) / 2;
      const roll = Math.atan2(rightAvg - leftAvg, 2.9);

      group.position.set(worldX, avgHeight, worldZ);
      chassisGroup.rotation.x = pitch;
      chassisGroup.rotation.z = roll;
    },
  };
}
