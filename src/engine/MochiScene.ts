import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { AccessoryId, AnimationState, EyeStyle, PetMood, PetProfile } from '../types.ts';

export interface MochiSceneCallbacks {
  onPetClick: () => void;
  onDragDrop: () => void;
  onHoverChange: (hovering: boolean) => void;
  onContextMenu: (screenX: number, screenY: number) => void;
  onAnchorUpdate: (anchor: { x: number; y: number; visible: boolean }) => void;
  onContextLost: (lost: boolean) => void;
}

// Pre-allocated math helpers outside render loop (zero per-frame GC)
const _vec3 = new THREE.Vector3();
const _anchorVec = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _dragIntersect = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();
const _deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03);
const _lookTarget = new THREE.Vector3(0, 0.65, 3);
const _raycaster = new THREE.Raycaster();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createBodyGradientTexture(primaryHex: string, secondaryHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, primaryHex);
  grad.addColorStop(0.58, primaryHex);
  grad.addColorStop(1, secondaryHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle organic mochi powder sheen grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 650; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 19341.123) % 1;
    ctx.fillRect(Math.abs(x) * 256, Math.abs(y) * 256, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createEyeTexture(eyeStyle: EyeStyle, eyeColorHex: string, mood: PetMood): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const cx = 128;
  const cy = 128;

  if (eyeStyle === 'sleepy' || mood === 'sleepy') {
    ctx.strokeStyle = eyeColorHex;
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 62, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();

    // Soft tiny lash tips
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(cx + 58, cy - 6);
    ctx.lineTo(cx + 76, cy - 18);
    ctx.stroke();
  } else {
    // Glossy anime / sparkle / star base iris
    const radiusX = eyeStyle === 'sparkle' ? 68 : 60;
    const radiusY = eyeStyle === 'sparkle' ? 82 : 72;

    ctx.fillStyle = eyeColorHex;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft lower iris highlight crescent
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + radiusY * 0.42, radiusX * 0.68, radiusY * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    if (eyeStyle === 'star') {
      // Crisp 4-point star pupil
      ctx.fillStyle = '#FFF7D6';
      ctx.beginPath();
      const spikes = 4;
      const outerR = 32;
      const innerR = 12;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Primary catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy - 26, 20, 22, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Secondary catchlight
    ctx.beginPath();
    ctx.arc(cx + 22, cy + 20, 10, 0, Math.PI * 2);
    ctx.fill();

    if (eyeStyle === 'sparkle') {
      ctx.beginPath();
      ctx.arc(cx + 24, cy - 26, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(18, 20, 28, 0.42)');
  grad.addColorStop(0.55, 'rgba(18, 20, 28, 0.16)');
  grad.addColorStop(1, 'rgba(18, 20, 28, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createAuraParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.65)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class MochiScene {
  private container: HTMLElement;
  private callbacks: MochiSceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();

  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  // Stage & lighting
  private deskPadMat!: THREE.MeshStandardMaterial;
  private deskTrimMat!: THREE.MeshStandardMaterial;
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private contactShadowMesh!: THREE.Mesh;

  // Pet hierarchy
  private petRoot = new THREE.Group();
  private petSquashGroup = new THREE.Group();
  private headTiltGroup = new THREE.Group();
  private bodyMat!: THREE.MeshPhysicalMaterial;
  private bellyMat!: THREE.MeshStandardMaterial;
  private limbMat!: THREE.MeshStandardMaterial;
  private cheekLeftMat!: THREE.MeshStandardMaterial;
  private cheekRightMat!: THREE.MeshStandardMaterial;
  private eyeLeftMesh!: THREE.Mesh;
  private eyeRightMesh!: THREE.Mesh;
  private eyeMat!: THREE.MeshBasicMaterial;
  private mouthSmileMesh!: THREE.Mesh;
  private mouthOpenMesh!: THREE.Mesh;
  private leftArmMesh!: THREE.Mesh;
  private rightArmMesh!: THREE.Mesh;
  private leftFootMesh!: THREE.Mesh;
  private rightFootMesh!: THREE.Mesh;

  // Accessories
  private accessoryGroups: Record<AccessoryId, THREE.Group> = {
    cat_ears: new THREE.Group(),
    bunny_ears: new THREE.Group(),
    antenna: new THREE.Group(),
    wings: new THREE.Group(),
    halo: new THREE.Group(),
    beret: new THREE.Group(),
  };
  private wingLeftPivot = new THREE.Group();
  private wingRightPivot = new THREE.Group();
  private bunnyEarLeftPivot = new THREE.Group();
  private bunnyEarRightPivot = new THREE.Group();
  private antennaPivot = new THREE.Group();
  private accessoryAccentMat!: THREE.MeshStandardMaterial;
  private accessoryInnerMat!: THREE.MeshStandardMaterial;
  private haloMat!: THREE.MeshPhysicalMaterial;
  private antennaOrbMat!: THREE.MeshStandardMaterial;

  // Particles
  private auraPoints!: THREE.Points;
  private auraMat!: THREE.PointsMaterial;
  private auraPositions!: Float32Array;
  private burstPoints!: THREE.Points;
  private burstMat!: THREE.PointsMaterial;
  private burstVelocities: THREE.Vector3[] = [];
  private burstAge = 99;

  // Textures to dispose/swap cleanly
  private currentBodyTex: THREE.Texture | null = null;
  private currentEyeTex: THREE.Texture | null = null;
  private disposables: Array<{ dispose: () => void }> = [];

  // Interactive & animation state
  private profile: PetProfile;
  private animState: AnimationState = 'idle';
  private isSpeaking = false;
  private cameraShiftX = 0;

  private petDeskPos = new THREE.Vector3(0, 0.03, 0);
  private petTargetPos = new THREE.Vector3(0, 0.03, 0);
  private petLiftY = 0;
  private squashY = 1;
  private squashVel = 0;
  private blinkTimer = 2.8;
  private blinkAmount = 0;
  private walkAngle = 0;
  private jumpPhase = 0;

  private isHoveringPet = false;
  private isDraggingPet = false;
  private pointerDownPos = { x: 0, y: 0 };
  private pointerMovedDuringPress = false;
  private cursorWorldTarget = new THREE.Vector3(0, 0.8, 3);
  private lastAnchorEmit = 0;
  private lastHoverRaycast = 0;

  constructor(container: HTMLElement, initialProfile: PetProfile, callbacks: MochiSceneCallbacks) {
    this.container = container;
    this.profile = initialProfile;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 1.55, 4.35);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Studio environment map for crisp PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.disposables.push(envTex);
    pmremGenerator.dispose();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.6;
    this.controls.maxDistance = 7.2;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 0.65, 0);

    this.setupLightingAndStage();
    this.buildMochiCharacter();
    this.buildAuraAndBurstParticles();
    this.applyProfile(initialProfile);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.tick();
  }

  private setupLightingAndStage() {
    this.hemiLight = new THREE.HemisphereLight(0xdce7ff, 0xe0d7ce, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff4e6, 1.55);
    this.keyLight.position.set(3.2, 5.2, 3.6);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 16;
      const d = 3.5;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0xe4eeff, 0.65);
    rimLight.position.set(-3.2, 3.0, -3.4);
    this.scene.add(rimLight);

    // Studio desk surface + tactile circular mat
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe8e4dc,
      roughness: 0.92,
      metalness: 0.0,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    this.disposables.push(floorGeo, floorMat);

    const deskPadGeo = new THREE.CylinderGeometry(2.35, 2.42, 0.05, 64);
    this.deskPadMat = new THREE.MeshStandardMaterial({
      color: 0xf7f4ef,
      roughness: 0.84,
      metalness: 0.02,
    });
    const deskPad = new THREE.Mesh(deskPadGeo, this.deskPadMat);
    deskPad.position.y = 0.005;
    deskPad.receiveShadow = true;
    this.scene.add(deskPad);
    this.disposables.push(deskPadGeo, this.deskPadMat);

    const deskTrimGeo = new THREE.TorusGeometry(2.39, 0.016, 12, 96);
    deskTrimGeo.rotateX(Math.PI / 2);
    this.deskTrimMat = new THREE.MeshStandardMaterial({
      color: 0xc9beae,
      roughness: 0.3,
      metalness: 0.72,
    });
    const deskTrim = new THREE.Mesh(deskTrimGeo, this.deskTrimMat);
    deskTrim.position.y = 0.024;
    this.scene.add(deskTrim);
    this.disposables.push(deskTrimGeo, this.deskTrimMat);

    // Grounded contact shadow beneath Mochi
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.45, 1.45);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    this.contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.position.y = 0.032;
    this.scene.add(this.contactShadowMesh);
    this.disposables.push(shadowTex, shadowGeo, shadowMat);
  }

  private buildMochiCharacter() {
    this.petRoot.position.copy(this.petDeskPos);
    this.scene.add(this.petRoot);
    this.petRoot.add(this.petSquashGroup);
    this.petSquashGroup.add(this.headTiltGroup);

    // 1. Sculpted Lathe Mochi Body (bottom-center pivot at y = 0)
    const profilePoints: THREE.Vector2[] = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 = bottom, 1 = top crown
      const angle = t * Math.PI;
      // Plump pear-shaped mochi profile with flat grounded bottom
      let r = Math.sin(angle) * 0.62;
      if (t < 0.22) {
        r *= 0.82 + 0.18 * (t / 0.22);
      } else if (t > 0.55) {
        r *= 1.0 - (t - 0.55) * 0.16;
      }
      const y = 0.05 + (1 - Math.cos(angle)) * 0.54;
      profilePoints.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const bodyGeo = new THREE.LatheGeometry(profilePoints, 48);
    bodyGeo.computeVertexNormals();

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.02,
      sheen: 0.6,
      sheenRoughness: 0.42,
      clearcoat: 0.26,
      clearcoatRoughness: 0.38,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.headTiltGroup.add(bodyMesh);
    this.disposables.push(bodyGeo, this.bodyMat);

    // 2. Soft Belly Patch
    const bellyGeo = new THREE.SphereGeometry(0.42, 32, 24);
    bellyGeo.scale(0.95, 0.85, 0.35);
    this.bellyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.0,
    });
    const bellyMesh = new THREE.Mesh(bellyGeo, this.bellyMat);
    bellyMesh.position.set(0, 0.42, 0.44);
    this.headTiltGroup.add(bellyMesh);
    this.disposables.push(bellyGeo, this.bellyMat);

    // 3. Expressive Eyes
    const eyeGeo = new THREE.PlaneGeometry(0.21, 0.21);
    this.eyeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.eyeLeftMesh = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.eyeLeftMesh.position.set(-0.2, 0.69, 0.525);
    this.eyeLeftMesh.rotation.y = -0.22;

    this.eyeRightMesh = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.eyeRightMesh.position.set(0.2, 0.69, 0.525);
    this.eyeRightMesh.rotation.y = 0.22;

    this.headTiltGroup.add(this.eyeLeftMesh, this.eyeRightMesh);
    this.disposables.push(eyeGeo, this.eyeMat);

    // 4. Blushing Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.09, 20, 16);
    cheekGeo.scale(1.15, 0.72, 0.22);
    this.cheekLeftMat = new THREE.MeshStandardMaterial({
      color: 0xff8fa3,
      roughness: 0.75,
      transparent: true,
      opacity: 0.65,
    });
    this.cheekRightMat = this.cheekLeftMat.clone();
    const cheekLeft = new THREE.Mesh(cheekGeo, this.cheekLeftMat);
    cheekLeft.position.set(-0.33, 0.56, 0.46);
    cheekLeft.rotation.y = -0.45;
    const cheekRight = new THREE.Mesh(cheekGeo, this.cheekRightMat);
    cheekRight.position.set(0.33, 0.56, 0.46);
    cheekRight.rotation.y = 0.45;
    this.headTiltGroup.add(cheekLeft, cheekRight);
    this.disposables.push(cheekGeo, this.cheekLeftMat, this.cheekRightMat);

    // 5. Sculpted Mouths (:3 smile curve + open talking oval)
    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.075, 0.585, 0.555),
      new THREE.Vector3(-0.038, 0.56, 0.568),
      new THREE.Vector3(0, 0.58, 0.57),
      new THREE.Vector3(0.038, 0.56, 0.568),
      new THREE.Vector3(0.075, 0.585, 0.555),
    ]);
    const smileGeo = new THREE.TubeGeometry(smileCurve, 24, 0.011, 8, false);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3b2d38, roughness: 0.45 });
    this.mouthSmileMesh = new THREE.Mesh(smileGeo, mouthMat);

    const openMouthGeo = new THREE.SphereGeometry(0.038, 16, 12);
    openMouthGeo.scale(1.1, 0.85, 0.35);
    const openMouthMat = new THREE.MeshStandardMaterial({ color: 0xe66a7f, roughness: 0.4 });
    this.mouthOpenMesh = new THREE.Mesh(openMouthGeo, openMouthMat);
    this.mouthOpenMesh.position.set(0, 0.555, 0.56);
    this.mouthOpenMesh.visible = false;

    this.headTiltGroup.add(this.mouthSmileMesh, this.mouthOpenMesh);
    this.disposables.push(smileGeo, mouthMat, openMouthGeo, openMouthMat);

    // 6. Stubby Arms & Feet (4 articulated limbs)
    this.limbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.02,
    });
    const armGeo = new THREE.CapsuleGeometry(0.085, 0.14, 8, 16);
    this.leftArmMesh = new THREE.Mesh(armGeo, this.limbMat);
    this.leftArmMesh.position.set(-0.56, 0.46, 0.14);
    this.leftArmMesh.rotation.z = 0.55;
    this.leftArmMesh.castShadow = true;

    this.rightArmMesh = new THREE.Mesh(armGeo, this.limbMat);
    this.rightArmMesh.position.set(0.56, 0.46, 0.14);
    this.rightArmMesh.rotation.z = -0.55;
    this.rightArmMesh.castShadow = true;

    const footGeo = new THREE.CapsuleGeometry(0.095, 0.1, 8, 16);
    footGeo.rotateX(Math.PI / 2);
    this.leftFootMesh = new THREE.Mesh(footGeo, this.limbMat);
    this.leftFootMesh.position.set(-0.22, 0.085, 0.24);
    this.leftFootMesh.castShadow = true;

    this.rightFootMesh = new THREE.Mesh(footGeo, this.limbMat);
    this.rightFootMesh.position.set(0.22, 0.085, 0.24);
    this.rightFootMesh.castShadow = true;

    this.headTiltGroup.add(this.leftArmMesh, this.rightArmMesh, this.leftFootMesh, this.rightFootMesh);
    this.disposables.push(armGeo, footGeo, this.limbMat);

    // 7. Modular Accessories
    this.buildAccessories();
  }

  private buildAccessories() {
    this.accessoryAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf6c2d0,
      roughness: 0.46,
      metalness: 0.04,
    });
    this.accessoryInnerMat = new THREE.MeshStandardMaterial({
      color: 0xffd9e3,
      roughness: 0.68,
      metalness: 0.0,
    });
    this.haloMat = new THREE.MeshPhysicalMaterial({
      color: 0xf7cf6d,
      emissive: 0x5c3e08,
      emissiveIntensity: 0.35,
      metalness: 0.92,
      roughness: 0.15,
      clearcoat: 1.0,
    });
    this.antennaOrbMat = new THREE.MeshStandardMaterial({
      color: 0xf9a8d4,
      emissive: 0xf9a8d4,
      emissiveIntensity: 1.1,
      roughness: 0.2,
    });
    this.disposables.push(
      this.accessoryAccentMat,
      this.accessoryInnerMat,
      this.haloMat,
      this.antennaOrbMat,
    );

    // A) Cat Ears
    const catEarShape = new THREE.Shape();
    catEarShape.moveTo(-0.14, 0);
    catEarShape.quadraticCurveTo(-0.08, 0.26, 0, 0.3);
    catEarShape.quadraticCurveTo(0.08, 0.26, 0.14, 0);
    catEarShape.closePath();

    const catEarGeo = new THREE.ExtrudeGeometry(catEarShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 4,
    });
    catEarGeo.center();

    const catInnerGeo = new THREE.ConeGeometry(0.075, 0.16, 16);
    catInnerGeo.scale(1, 1, 0.35);

    const catLeft = new THREE.Group();
    const catLeftOuter = new THREE.Mesh(catEarGeo, this.accessoryAccentMat);
    catLeftOuter.castShadow = true;
    const catLeftInner = new THREE.Mesh(catInnerGeo, this.accessoryInnerMat);
    catLeftInner.position.set(0, -0.02, 0.045);
    catLeft.add(catLeftOuter, catLeftInner);
    catLeft.position.set(-0.31, 1.05, 0.02);
    catLeft.rotation.set(0.12, 0.18, 0.36);

    const catRight = catLeft.clone();
    catRight.position.set(0.31, 1.05, 0.02);
    catRight.rotation.set(0.12, -0.18, -0.36);

    this.accessoryGroups.cat_ears.add(catLeft, catRight);
    this.headTiltGroup.add(this.accessoryGroups.cat_ears);
    this.disposables.push(catEarGeo, catInnerGeo);

    // B) Bunny Ears
    const bunnyEarGeo = new THREE.CapsuleGeometry(0.09, 0.36, 10, 20);
    bunnyEarGeo.scale(1.0, 1.0, 0.62);
    const bunnyInnerGeo = new THREE.CapsuleGeometry(0.048, 0.24, 8, 12);
    bunnyInnerGeo.scale(1.0, 1.0, 0.35);

    const bLeftOuter = new THREE.Mesh(bunnyEarGeo, this.accessoryAccentMat);
    bLeftOuter.position.y = 0.22;
    bLeftOuter.castShadow = true;
    const bLeftInner = new THREE.Mesh(bunnyInnerGeo, this.accessoryInnerMat);
    bLeftInner.position.set(0, 0.21, 0.046);
    this.bunnyEarLeftPivot.add(bLeftOuter, bLeftInner);
    this.bunnyEarLeftPivot.position.set(-0.22, 1.02, -0.02);
    this.bunnyEarLeftPivot.rotation.set(0.1, 0, 0.22);

    const bRightOuter = new THREE.Mesh(bunnyEarGeo, this.accessoryAccentMat);
    bRightOuter.position.y = 0.22;
    bRightOuter.castShadow = true;
    const bRightInner = new THREE.Mesh(bunnyInnerGeo, this.accessoryInnerMat);
    bRightInner.position.set(0, 0.21, 0.046);
    this.bunnyEarRightPivot.add(bRightOuter, bRightInner);
    this.bunnyEarRightPivot.position.set(0.22, 1.02, -0.02);
    this.bunnyEarRightPivot.rotation.set(0.1, 0, -0.22);

    this.accessoryGroups.bunny_ears.add(this.bunnyEarLeftPivot, this.bunnyEarRightPivot);
    this.headTiltGroup.add(this.accessoryGroups.bunny_ears);
    this.disposables.push(bunnyEarGeo, bunnyInnerGeo);

    // C) Glowing Spring Antenna
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.03, 0.14, 0.02),
      new THREE.Vector3(-0.02, 0.26, 0.06),
      new THREE.Vector3(0.04, 0.34, 0.1),
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 20, 0.018, 10, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x9aa2b1, metalness: 0.78, roughness: 0.24 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);

    const orbGeo = new THREE.SphereGeometry(0.07, 20, 20);
    const orbMesh = new THREE.Mesh(orbGeo, this.antennaOrbMat);
    orbMesh.position.set(0.04, 0.35, 0.1);

    this.antennaPivot.add(stemMesh, orbMesh);
    this.antennaPivot.position.set(0, 1.11, -0.02);
    this.accessoryGroups.antenna.add(this.antennaPivot);
    this.headTiltGroup.add(this.accessoryGroups.antenna);
    this.disposables.push(stemGeo, stemMat, orbGeo);

    // D) Tiny Fluttering Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.18, 0.2, 0.38, 0.14, 0.34, -0.05);
    wingShape.bezierCurveTo(0.26, -0.15, 0.14, -0.18, 0, -0.09);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
    });
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.05,
      clearcoat: 0.65,
      sheen: 0.5,
    });

    const wLeft = new THREE.Mesh(wingGeo, wingMat);
    wLeft.scale.x = -1;
    wLeft.castShadow = true;
    this.wingLeftPivot.add(wLeft);
    this.wingLeftPivot.position.set(-0.24, 0.6, -0.46);
    this.wingLeftPivot.rotation.y = -0.35;

    const wRight = new THREE.Mesh(wingGeo, wingMat);
    wRight.castShadow = true;
    this.wingRightPivot.add(wRight);
    this.wingRightPivot.position.set(0.24, 0.6, -0.46);
    this.wingRightPivot.rotation.y = 0.35;

    this.accessoryGroups.wings.add(this.wingLeftPivot, this.wingRightPivot);
    this.headTiltGroup.add(this.accessoryGroups.wings);
    this.disposables.push(wingGeo, wingMat);

    // E) Floating Halo
    const haloGeo = new THREE.TorusGeometry(0.27, 0.026, 16, 48);
    haloGeo.rotateX(Math.PI / 2);
    const haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    haloMesh.position.set(0, 1.32, -0.03);
    haloMesh.rotation.x = 0.14;
    this.accessoryGroups.halo.add(haloMesh);
    this.headTiltGroup.add(this.accessoryGroups.halo);
    this.disposables.push(haloGeo);

    // F) Cozy Artist Beret
    const beretGeo = new THREE.SphereGeometry(0.29, 28, 18);
    beretGeo.scale(1.05, 0.36, 1.05);
    const beretMat = new THREE.MeshStandardMaterial({
      color: 0x3b4252,
      roughness: 0.88,
      metalness: 0.0,
    });
    const beretMesh = new THREE.Mesh(beretGeo, beretMat);
    beretMesh.castShadow = true;
    const beretStemGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.06, 10);
    const beretStem = new THREE.Mesh(beretStemGeo, beretMat);
    beretStem.position.y = 0.11;

    this.accessoryGroups.beret.add(beretMesh, beretStem);
    this.accessoryGroups.beret.position.set(0.11, 1.09, 0.02);
    this.accessoryGroups.beret.rotation.z = -0.24;
    this.headTiltGroup.add(this.accessoryGroups.beret);
    this.disposables.push(beretGeo, beretStemGeo, beretMat);
  }

  private buildAuraAndBurstParticles() {
    const auraTex = createAuraParticleTexture();
    const count = 44;
    this.auraPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const rad = 0.72 + (i % 4) * 0.14;
      this.auraPositions[i * 3] = Math.cos(theta) * rad;
      this.auraPositions[i * 3 + 1] = 0.18 + ((i * 0.37) % 1.15);
      this.auraPositions[i * 3 + 2] = Math.sin(theta) * rad;
    }
    const auraGeo = new THREE.BufferGeometry();
    auraGeo.setAttribute('position', new THREE.BufferAttribute(this.auraPositions, 3));
    this.auraMat = new THREE.PointsMaterial({
      map: auraTex,
      size: 0.12,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.auraPoints = new THREE.Points(auraGeo, this.auraMat);
    this.petRoot.add(this.auraPoints);
    this.disposables.push(auraTex, auraGeo, this.auraMat);

    // Click burst particles
    const burstCount = 18;
    const burstPos = new Float32Array(burstCount * 3);
    for (let i = 0; i < burstCount; i++) {
      const a = (i / burstCount) * Math.PI * 2;
      this.burstVelocities.push(
        new THREE.Vector3(Math.cos(a) * (0.6 + (i % 3) * 0.35), 1.1 + (i % 4) * 0.3, Math.sin(a) * 0.6),
      );
    }
    const burstGeo = new THREE.BufferGeometry();
    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
    this.burstMat = new THREE.PointsMaterial({
      map: auraTex,
      color: 0xff8fab,
      size: 0.15,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.burstPoints = new THREE.Points(burstGeo, this.burstMat);
    this.burstPoints.visible = false;
    this.petRoot.add(this.burstPoints);
    this.disposables.push(burstGeo, this.burstMat);
  }

  public applyProfile(profile: PetProfile) {
    this.profile = profile;

    // Theme backdrop & desk palette
    const isNight = profile.studioTheme === 'night';
    const bgHex = isNight ? 0x12151e : 0xf3f0eb;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, 0.042);
    this.deskPadMat.color.setHex(isNight ? 0x1d2230 : 0xf7f4ef);
    this.deskTrimMat.color.setHex(isNight ? 0x454f66 : 0xc9beae);
    this.hemiLight.intensity = isNight ? 0.65 : 0.9;
    this.keyLight.intensity = isNight ? 1.35 : 1.55;

    // Gradient body texture
    if (this.currentBodyTex) this.currentBodyTex.dispose();
    this.currentBodyTex = createBodyGradientTexture(profile.primaryColor, profile.secondaryColor);
    this.currentBodyTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.bodyMat.map = this.currentBodyTex;
    this.bodyMat.needsUpdate = true;

    this.bellyMat.color.set(profile.primaryColor).lerp(new THREE.Color('#ffffff'), 0.45);
    this.limbMat.color.set(profile.secondaryColor).lerp(new THREE.Color(profile.primaryColor), 0.35);
    this.accessoryAccentMat.color.set(profile.primaryColor).lerp(new THREE.Color(profile.secondaryColor), 0.3);
    this.accessoryInnerMat.color.set(profile.secondaryColor);
    this.antennaOrbMat.color.set(profile.auraColor);
    this.antennaOrbMat.emissive.set(profile.auraColor);

    // Eyes
    if (this.currentEyeTex) this.currentEyeTex.dispose();
    this.currentEyeTex = createEyeTexture(profile.eyeStyle, profile.eyeColor, profile.mood);
    this.eyeMat.map = this.currentEyeTex;
    this.eyeMat.needsUpdate = true;

    // Cheeks
    const blush = Math.max(0, Math.min(1, profile.blushIntensity));
    this.cheekLeftMat.opacity = blush * 0.85;
    this.cheekRightMat.opacity = blush * 0.85;

    // Scale
    this.petRoot.scale.setScalar(profile.scale);

    // Accessories visibility
    (Object.keys(this.accessoryGroups) as AccessoryId[]).forEach((acc) => {
      this.accessoryGroups[acc].visible = profile.accessories.includes(acc);
    });

    // Aura particles
    this.auraPoints.visible = profile.auraIntensity > 0.02;
    this.auraMat.color.set(profile.auraColor);
    this.auraMat.opacity = profile.auraIntensity * 0.85;
    this.auraMat.size = 0.09 + profile.auraIntensity * 0.08;
  }

  public setAnimationState(state: AnimationState) {
    this.animState = state;
    if (state === 'jumping') {
      this.jumpPhase = 0;
    }
  }

  public setSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
  }

  public setCameraShiftX(offsetX: number) {
    this.cameraShiftX = offsetX;
  }

  public triggerSquashBounce(strength = 0.34) {
    this.squashY = 1 - strength;
    this.squashVel = strength * 6.5;
    this.triggerBurstParticles();
  }

  public triggerBurstParticles() {
    this.burstAge = 0;
    this.burstPoints.visible = true;
    const posAttr = this.burstPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(i, (Math.random() - 0.5) * 0.3, 0.72 + Math.random() * 0.25, (Math.random() - 0.5) * 0.3);
    }
    posAttr.needsUpdate = true;
    this.burstMat.color.set(this.profile.auraColor);
  }

  public resetPosition() {
    this.petTargetPos.set(0, 0.03, 0);
  }

  private updatePointerNdc(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;

    const onPointerMove = (ev: PointerEvent) => {
      this.updatePointerNdc(ev.clientX, ev.clientY);

      // Update cursor world look target on a virtual plane in front of Mochi
      _raycaster.setFromCamera(_pointerNdc, this.camera);
      _rayOrigin.copy(_raycaster.ray.origin);
      const t = (2.4 - _rayOrigin.z) / (_raycaster.ray.direction.z || -1);
      if (t > 0 && t < 18) {
        this.cursorWorldTarget.copy(_rayOrigin).addScaledVector(_raycaster.ray.direction, t);
      } else {
        this.cursorWorldTarget.set(_pointerNdc.x * 2.2, 0.8 + _pointerNdc.y * 1.4, 2.4);
      }

      if (this.isDraggingPet) {
        const dx = ev.clientX - this.pointerDownPos.x;
        const dy = ev.clientY - this.pointerDownPos.y;
        if (dx * dx + dy * dy > 25) {
          this.pointerMovedDuringPress = true;
        }
        if (_raycaster.ray.intersectPlane(_deskPlane, _dragIntersect)) {
          const r = Math.hypot(_dragIntersect.x, _dragIntersect.z);
          if (r > 1.8) {
            _dragIntersect.x *= 1.8 / r;
            _dragIntersect.z *= 1.8 / r;
          }
          this.petTargetPos.set(_dragIntersect.x, 0.03, _dragIntersect.z);
        }
        return;
      }

      // Throttled hover check
      const now = performance.now();
      if (now - this.lastHoverRaycast > 45) {
        this.lastHoverRaycast = now;
        const hits = _raycaster.intersectObject(this.headTiltGroup, true);
        const hovering = hits.length > 0;
        if (hovering !== this.isHoveringPet) {
          this.isHoveringPet = hovering;
          canvas.style.cursor = hovering ? 'grab' : 'default';
          this.callbacks.onHoverChange(hovering);
        }
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      this.updatePointerNdc(ev.clientX, ev.clientY);
      _raycaster.setFromCamera(_pointerNdc, this.camera);
      const hits = _raycaster.intersectObject(this.headTiltGroup, true);
      if (hits.length > 0) {
        this.isDraggingPet = true;
        this.pointerMovedDuringPress = false;
        this.pointerDownPos = { x: ev.clientX, y: ev.clientY };
        this.controls.enabled = false;
        canvas.style.cursor = 'grabbing';
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.button !== 0 || !this.isDraggingPet) return;
      this.isDraggingPet = false;
      this.controls.enabled = true;
      canvas.style.cursor = this.isHoveringPet ? 'grab' : 'default';

      if (!this.pointerMovedDuringPress) {
        this.triggerSquashBounce(0.32);
        this.callbacks.onPetClick();
      } else {
        this.triggerSquashBounce(0.22);
        this.callbacks.onDragDrop();
      }
    };

    const onContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
      this.callbacks.onContextMenu(ev.clientX, ev.clientY);
    };

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      this.callbacks.onContextLost(true);
    };

    const onContextRestored = () => {
      this.callbacks.onContextLost(false);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    this.disposables.push({
      dispose: () => {
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('contextmenu', onContextMenu);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
      },
    });
  }

  private handleResize() {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  }

  private updateAnimations(dt: number, elapsed: number) {
    // 1. Camera target shift for drawer framing
    this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.cameraShiftX, 6, dt);
    this.controls.update();

    // 2. Squash & stretch spring physics
    const springK = 160;
    const damping = 12;
    const force = (1 - this.squashY) * springK - this.squashVel * damping;
    this.squashVel += force * dt;
    this.squashY += this.squashVel * dt;
    const clampedSY = THREE.MathUtils.clamp(this.squashY, 0.58, 1.42);
    const invXZ = 1 / Math.sqrt(clampedSY);
    this.petSquashGroup.scale.set(invXZ, clampedSY, invXZ);

    // 3. Autonomous / state-driven desk position
    if (!this.isDraggingPet) {
      if (this.animState === 'chasing') {
        _vec3.set(
          THREE.MathUtils.clamp(this.cursorWorldTarget.x * 0.72, -1.55, 1.55),
          0.03,
          THREE.MathUtils.clamp((this.cursorWorldTarget.y - 0.65) * -0.5, -1.1, 1.1),
        );
        this.petTargetPos.lerp(_vec3, 1 - Math.exp(-3.2 * dt));
      } else if (this.animState === 'walking') {
        this.walkAngle += dt * 1.15;
        this.petTargetPos.set(Math.cos(this.walkAngle) * 0.95, 0.03, Math.sin(this.walkAngle) * 0.65);
      }
    }

    this.petDeskPos.x = THREE.MathUtils.damp(this.petDeskPos.x, this.petTargetPos.x, 8, dt);
    this.petDeskPos.z = THREE.MathUtils.damp(this.petDeskPos.z, this.petTargetPos.z, 8, dt);

    // Lift & vertical motion
    let targetLift = this.isDraggingPet ? 0.28 : 0;
    let bodyBobY = Math.sin(elapsed * 2.4) * 0.018;
    let rotZ = 0;
    let rotY = 0;

    if (this.animState === 'happy') {
      bodyBobY = Math.abs(Math.sin(elapsed * 6.5)) * 0.09;
      rotZ = Math.sin(elapsed * 8.0) * 0.14;
    } else if (this.animState === 'dancing') {
      bodyBobY = Math.abs(Math.sin(elapsed * 7.2)) * 0.14;
      rotZ = Math.sin(elapsed * 7.2) * 0.22;
      rotY = Math.sin(elapsed * 3.6) * 0.45;
    } else if (this.animState === 'jumping') {
      this.jumpPhase += dt * 4.8;
      const arc = Math.abs(Math.sin(this.jumpPhase));
      targetLift += arc * 0.55;
      if (arc < 0.05 && this.squashVel < 0.5) {
        this.squashY = 0.78;
        this.squashVel = 2.4;
      }
    } else if (this.animState === 'walking') {
      bodyBobY = Math.abs(Math.sin(elapsed * 8.5)) * 0.06;
      rotZ = Math.sin(elapsed * 8.5) * 0.09;
      rotY = Math.atan2(
        this.petTargetPos.x - this.petDeskPos.x,
        this.petTargetPos.z - this.petDeskPos.z,
      );
    } else if (this.animState === 'sleeping') {
      bodyBobY = Math.sin(elapsed * 1.1) * 0.012;
      rotZ = 0.06;
    }

    this.petLiftY = THREE.MathUtils.damp(this.petLiftY, targetLift, 10, dt);
    this.petRoot.position.set(this.petDeskPos.x, this.petDeskPos.y + this.petLiftY + bodyBobY, this.petDeskPos.z);

    // Contact shadow follows pet horizontally and softens with height
    this.contactShadowMesh.position.set(this.petDeskPos.x, 0.032, this.petDeskPos.z);
    const heightScale = Math.max(0.45, 1 - this.petLiftY * 0.55) * this.profile.scale;
    this.contactShadowMesh.scale.setScalar(heightScale);
    (this.contactShadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.14,
      0.55 - this.petLiftY * 0.45,
    );

    // 4. Cursor tracking (head smoothly turns toward cursor unless walking/sleeping)
    let lookYaw = 0;
    let lookPitch = 0;
    if (this.animState !== 'sleeping' && this.animState !== 'walking' && this.animState !== 'dancing') {
      const dx = this.cursorWorldTarget.x - this.petDeskPos.x;
      const dy = this.cursorWorldTarget.y - 0.7;
      lookYaw = THREE.MathUtils.clamp(dx * 0.28, -0.45, 0.45);
      lookPitch = THREE.MathUtils.clamp(-dy * 0.16, -0.22, 0.25);
    } else if (this.animState === 'walking') {
      lookYaw = rotY;
    } else if (this.animState === 'dancing') {
      lookYaw = rotY;
    } else if (this.animState === 'sleeping') {
      lookPitch = 0.18;
    }

    this.headTiltGroup.rotation.y = THREE.MathUtils.damp(this.headTiltGroup.rotation.y, lookYaw, 7, dt);
    this.headTiltGroup.rotation.x = THREE.MathUtils.damp(this.headTiltGroup.rotation.x, lookPitch, 7, dt);
    this.headTiltGroup.rotation.z = THREE.MathUtils.damp(this.headTiltGroup.rotation.z, rotZ, 9, dt);

    // Subtle breathing on body scale
    const breath = 1 + Math.sin(elapsed * 2.2) * (this.animState === 'sleeping' ? 0.025 : 0.015);
    this.headTiltGroup.scale.set(breath, 1 / Math.sqrt(breath), breath);

    // 5. Natural blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkAmount = 1;
      this.blinkTimer = 2.5 + Math.random() * 3.2;
    }
    this.blinkAmount = THREE.MathUtils.damp(this.blinkAmount, 0, 18, dt);
    const eyeScaleY = this.animState === 'sleeping' ? 0.25 : Math.max(0.08, 1 - this.blinkAmount * 0.92);
    this.eyeLeftMesh.scale.y = eyeScaleY;
    this.eyeRightMesh.scale.y = eyeScaleY;

    // 6. Mouth speech / mood expression
    if (this.isSpeaking) {
      const talkOsc = Math.abs(Math.sin(elapsed * 18));
      this.mouthOpenMesh.visible = talkOsc > 0.25;
      this.mouthSmileMesh.visible = !this.mouthOpenMesh.visible;
      this.mouthOpenMesh.scale.set(1.1, 0.55 + talkOsc * 0.75, 0.35);
    } else {
      const excitedOpen = this.animState === 'happy' || this.animState === 'dancing' || this.profile.mood === 'excited';
      this.mouthOpenMesh.visible = excitedOpen && Math.sin(elapsed * 4) > 0.55;
      this.mouthSmileMesh.visible = !this.mouthOpenMesh.visible;
    }

    // 7. Limbs & secondary accessory physics
    const waveSpeed = this.animState === 'dancing' || this.animState === 'happy' ? 10 : 2.6;
    const waveAmp = this.animState === 'dancing' || this.animState === 'happy' ? 0.48 : 0.08;
    this.leftArmMesh.rotation.z = 0.55 + Math.sin(elapsed * waveSpeed) * waveAmp;
    this.rightArmMesh.rotation.z = -0.55 - Math.cos(elapsed * waveSpeed) * waveAmp;

    if (this.animState === 'walking' || this.animState === 'chasing' || this.animState === 'dancing') {
      this.leftFootMesh.position.z = 0.24 + Math.sin(elapsed * 10) * 0.07;
      this.rightFootMesh.position.z = 0.24 - Math.sin(elapsed * 10) * 0.07;
      this.leftFootMesh.position.y = 0.085 + Math.max(0, Math.cos(elapsed * 10)) * 0.05;
      this.rightFootMesh.position.y = 0.085 + Math.max(0, -Math.cos(elapsed * 10)) * 0.05;
    } else {
      this.leftFootMesh.position.set(-0.22, 0.085, 0.24);
      this.rightFootMesh.position.set(0.22, 0.085, 0.24);
    }

    // Secondary motion on wings, bunny ears, antenna
    const flutterSpeed = this.animState === 'jumping' || this.animState === 'dancing' ? 18 : 5.5;
    const flutterAmp = this.animState === 'sleeping' ? 0.05 : 0.26;
    this.wingLeftPivot.rotation.y = -0.35 - Math.sin(elapsed * flutterSpeed) * flutterAmp;
    this.wingRightPivot.rotation.y = 0.35 + Math.sin(elapsed * flutterSpeed) * flutterAmp;

    this.bunnyEarLeftPivot.rotation.z = 0.22 + Math.sin(elapsed * 3.1) * 0.05 - rotZ * 0.45;
    this.bunnyEarRightPivot.rotation.z = -0.22 - Math.sin(elapsed * 3.1 + 0.4) * 0.05 - rotZ * 0.45;
    this.antennaPivot.rotation.z = -rotZ * 0.7 + Math.sin(elapsed * 4.2) * 0.07;
    this.antennaPivot.rotation.x = Math.cos(elapsed * 3.4) * 0.06;

    // Halo gentle hover
    this.accessoryGroups.halo.position.y = Math.sin(elapsed * 2.8) * 0.035;
    this.accessoryGroups.halo.rotation.y = elapsed * 0.6;

    // 8. Aura particles orbit
    if (this.auraPoints.visible) {
      this.auraPoints.rotation.y = elapsed * 0.45;
      this.auraPoints.position.y = Math.sin(elapsed * 1.6) * 0.04;
    }

    // 9. Click burst particles
    if (this.burstPoints.visible) {
      this.burstAge += dt;
      if (this.burstAge > 0.75) {
        this.burstPoints.visible = false;
      } else {
        const posAttr = this.burstPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          const v = this.burstVelocities[i];
          posAttr.setXYZ(
            i,
            posAttr.getX(i) + v.x * dt,
            posAttr.getY(i) + v.y * dt,
            posAttr.getZ(i) + v.z * dt,
          );
        }
        posAttr.needsUpdate = true;
        this.burstMat.opacity = Math.max(0, 1 - this.burstAge / 0.75);
      }
    }

    // 10. Emit projected screen anchor above Mochi's head (~30fps max to keep DOM crisp)
    const now = performance.now();
    if (now - this.lastAnchorEmit > 32) {
      this.lastAnchorEmit = now;
      _anchorVec.set(
        this.petRoot.position.x,
        this.petRoot.position.y + 1.48 * this.profile.scale,
        this.petRoot.position.z,
      );
      _anchorVec.project(this.camera);
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = ((_anchorVec.x + 1) / 2) * rect.width;
      const y = (-(_anchorVec.y - 1) / 2) * rect.height;
      const visible = _anchorVec.z < 1 && x > -80 && x < rect.width + 80;
      this.callbacks.onAnchorUpdate({ x, y, visible });
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.getElapsedTime();

    this.updateAnimations(dt, elapsed);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();

    if (this.currentBodyTex) this.currentBodyTex.dispose();
    if (this.currentEyeTex) this.currentEyeTex.dispose();
    this.disposables.forEach((d) => d.dispose());

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
