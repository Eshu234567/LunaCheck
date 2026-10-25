import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sparkles, Eye, ShieldCheck } from 'lucide-react';

interface ThreeRibbonCanvasProps {
  className?: string;
  interactive?: boolean;
  materialPreset?: 'blush' | 'coral' | 'lavender' | 'sage' | 'midnight';
  showControls?: boolean;
  onSelectHotspot?: (name: string, description: string) => void;
}

export const ThreeRibbonCanvas: React.FC<ThreeRibbonCanvasProps> = ({
  className = '',
  interactive = true,
  materialPreset = 'blush',
  showControls = true,
  onSelectHotspot,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<{ name: string; desc: string } | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Store references for dynamic updates without full remount
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const autoRotateRef = useRef(isAutoRotating);
  autoRotateRef.current = isAutoRotating;

  // Material palette lookup based on theme
  const getThemeColors = (preset: string) => {
    switch (preset) {
      case 'coral':
        return {
          main: '#EA580C',
          emissive: '#FB923C',
          sheen: '#FED7AA',
          orbs: ['#FED7AA', '#FFEDD5', '#FDBA74', '#F59E0B'],
        };
      case 'lavender':
        return {
          main: '#9333EA',
          emissive: '#C084FC',
          sheen: '#E9D5FF',
          orbs: ['#E9D5FF', '#F3E8FF', '#D8B4FE', '#C084FC'],
        };
      case 'sage':
        return {
          main: '#0D9488',
          emissive: '#2DD4BF',
          sheen: '#CCFBF1',
          orbs: ['#CCFBF1', '#BBF7D0', '#5EEAD4', '#99F6E4'],
        };
      case 'midnight':
        return {
          main: '#F43F5E',
          emissive: '#FB7185',
          sheen: '#FDA4AF',
          orbs: ['#FB7185', '#E11D48', '#FDA4AF', '#9333EA'],
        };
      case 'blush':
      default:
        return {
          main: '#E11D48',
          emissive: '#FB7185',
          sheen: '#FDA4AF',
          orbs: ['#FED7AA', '#FECDD3', '#FEF08A', '#FFD8C2', '#FDA4AF'],
        };
    }
  };

  useEffect(() => {
    if (materialRef.current) {
      const colors = getThemeColors(materialPreset);
      materialRef.current.color.set(colors.main);
      materialRef.current.emissive.set(colors.emissive);
      materialRef.current.sheenColor?.set(colors.sheen);
    }
  }, [materialPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    let width = container.clientWidth || 400;
    let height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.0);

    // 3. Renderer with antialiasing and alpha
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 4. Ribbon 3D Curve
    const ribbonPoints = [
      new THREE.Vector3(-0.75, -1.45, -0.15),
      new THREE.Vector3(-0.48, -0.85, -0.05),
      new THREE.Vector3(-0.24, -0.15, 0.12),
      new THREE.Vector3(-0.55, 0.45, 0.22),
      new THREE.Vector3(-0.45, 0.95, 0.18),
      new THREE.Vector3(0.0, 1.25, 0.0),
      new THREE.Vector3(0.45, 0.95, -0.18),
      new THREE.Vector3(0.55, 0.45, -0.12),
      new THREE.Vector3(0.24, -0.15, 0.35),
      new THREE.Vector3(0.48, -0.85, 0.45),
      new THREE.Vector3(0.8, -1.45, 0.55),
    ];

    const curve = new THREE.CatmullRomCurve3(ribbonPoints);
    curve.curveType = 'centripetal';

    const tubeGeometry = new THREE.TubeGeometry(curve, 160, 0.14, 24, false);

    const colors = getThemeColors(materialPreset);
    const ribbonMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colors.main),
      emissive: new THREE.Color(colors.emissive),
      emissiveIntensity: 0.14,
      roughness: 0.2,
      metalness: 0.18,
      clearcoat: 0.95,
      clearcoatRoughness: 0.12,
      reflectivity: 0.85,
      sheen: 1.0,
      sheenColor: new THREE.Color(colors.sheen),
      sheenRoughness: 0.25,
    });
    materialRef.current = ribbonMaterial;

    const ribbonMesh = new THREE.Mesh(tubeGeometry, ribbonMaterial);
    ribbonMesh.position.y = 0.08;
    scene.add(ribbonMesh);

    // 5. Interactive 3D Hotspots along awareness zones
    const hotspotsGroup = new THREE.Group();
    const hotspotData = [
      {
        pos: new THREE.Vector3(-0.5, 0.8, 0.2),
        name: 'Upper Outer Quadrant',
        desc: 'Most glandular breast tissue. Highest focus zone during routine checks.',
      },
      {
        pos: new THREE.Vector3(0.0, 1.25, 0.0),
        name: 'Sub-clavicular & Axillary Chain',
        desc: 'Upper collarbone and underarm lymph nodes pathway.',
      },
      {
        pos: new THREE.Vector3(0.5, 0.8, -0.2),
        name: 'Upper Inner Quadrant',
        desc: 'Medial upper zone extending toward the sternum line.',
      },
      {
        pos: new THREE.Vector3(0.0, -0.15, 0.25),
        name: 'Retro-areolar & Concentric Rings',
        desc: 'Circular rings 1 through 4 radiating outwards from the nipple.',
      },
    ];

    const hotspotMeshes: { mesh: THREE.Mesh; data: typeof hotspotData[0] }[] = [];
    const hotspotGeom = new THREE.SphereGeometry(0.065, 16, 16);

    hotspotData.forEach((item) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(hotspotGeom, mat);
      mesh.position.copy(item.pos);

      // Glowing outer ring
      const ringGeom = new THREE.RingGeometry(0.08, 0.12, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.lookAt(camera.position);
      mesh.add(ringMesh);

      hotspotsGroup.add(mesh);
      hotspotMeshes.push({ mesh, data: item });
    });
    scene.add(hotspotsGroup);

    // 6. Floating soft ambient pearls
    const orbsGroup = new THREE.Group();
    const orbGeom = new THREE.SphereGeometry(1, 24, 24);
    const orbData: { mesh: THREE.Mesh; basePos: THREE.Vector3; speed: number; phase: number }[] = [];

    for (let i = 0; i < 16; i++) {
      const scale = 0.04 + Math.random() * 0.09;
      const orbMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colors.orbs[i % colors.orbs.length]),
        roughness: 0.15,
        clearcoat: 1.0,
        transmission: 0.5,
        opacity: 0.85,
        transparent: true,
      });

      const mesh = new THREE.Mesh(orbGeom, orbMat);
      mesh.scale.set(scale, scale, scale);

      const angle = (i / 16) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.9;
      const basePos = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 1.5
      );
      mesh.position.copy(basePos);

      orbsGroup.add(mesh);
      orbData.push({
        mesh,
        basePos,
        speed: 0.7 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    scene.add(orbsGroup);

    // 7. Twinkling Particle Dust
    const particleCount = 60;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 4;
      positions[i + 1] = (Math.random() - 0.5) * 4;
      positions[i + 2] = (Math.random() - 0.5) * 3;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xfecdd3,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 8. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.4);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffe4e6, 1.8);
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xfef3c7, 2.2, 12);
    rimLight.position.set(0, 3, -2.5);
    scene.add(rimLight);

    // 9. Mouse / Raycaster Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouse.x = x;
      mouse.y = y;

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.008;
        targetRotationX += deltaY * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else if (interactive) {
        // Gentle tilt parallax
        targetRotationY = x * 0.35;
        targetRotationX = -y * 0.25;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspotMeshes.map((h) => h.mesh));
      if (intersects.length > 0) {
        const hit = hotspotMeshes.find((h) => h.mesh === intersects[0].object);
        if (hit) {
          setActiveHotspot({ name: hit.data.name, desc: hit.data.desc });
          if (onSelectHotspot) onSelectHotspot(hit.data.name, hit.data.desc);
        }
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('click', handleClick);

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 400;
      height = container.clientHeight || 400;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera/ribbon rotation
      if (autoRotateRef.current && !isDragging) {
        targetRotationY += 0.003;
      }

      currentRotationY += (targetRotationY - currentRotationY) * 0.08;
      currentRotationX += (targetRotationX - currentRotationX) * 0.08;

      ribbonMesh.rotation.y = currentRotationY;
      ribbonMesh.rotation.x = currentRotationX;
      hotspotsGroup.rotation.y = currentRotationY;
      hotspotsGroup.rotation.x = currentRotationX;

      // Natural gentle float
      const floatY = 0.08 + Math.sin(elapsedTime * 1.6) * 0.05;
      ribbonMesh.position.y = floatY;
      hotspotsGroup.position.y = floatY;

      // Rotate particles & orbs
      particles.rotation.y = elapsedTime * 0.03;
      orbsGroup.rotation.y = elapsedTime * 0.06;

      orbData.forEach(({ mesh, basePos, speed, phase }) => {
        mesh.position.y = basePos.y + Math.sin(elapsedTime * speed + phase) * 0.12;
        mesh.position.x = basePos.x + Math.cos(elapsedTime * speed * 0.8 + phase) * 0.08;
      });

      // Pulse hotspot rings
      hotspotMeshes.forEach((item, index) => {
        const ring = item.mesh.children[0] as THREE.Mesh;
        if (ring) {
          const s = 1 + Math.sin(elapsedTime * 3 + index) * 0.18;
          ring.scale.set(s, s, 1);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('click', handleClick);
      tubeGeometry.dispose();
      ribbonMaterial.dispose();
      orbGeom.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive, materialPreset, onSelectHotspot]);

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />

      {/* Floating 3D Canvas Controls */}
      {showControls && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-200/60 dark:border-rose-900/40 shadow-xs text-[11px] font-semibold text-rose-900 dark:text-rose-200">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Interactive 3D Ribbon</span>
            <span className="text-[10px] text-rose-600/70 dark:text-rose-400 font-normal ml-1">
              (Drag to Orbit)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`p-1.5 rounded-full backdrop-blur-md border shadow-xs transition-colors ${
                isAutoRotating
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-white/80 dark:bg-black/60 text-rose-700 dark:text-rose-300 border-rose-200/60'
              }`}
              title={isAutoRotating ? 'Pause Orbit' : 'Resume Orbit'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Hotspot Tooltip / Info Card */}
      {activeHotspot && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-lg animate-soft-pulse">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950 dark:text-rose-100">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                <span>{activeHotspot.name}</span>
              </div>
              <p className="text-[11px] text-rose-900/70 dark:text-rose-300/80 mt-1 leading-relaxed">
                {activeHotspot.desc}
              </p>
            </div>
            <button
              onClick={() => setActiveHotspot(null)}
              className="text-xs text-rose-400 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
