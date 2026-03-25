import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
  attribute float scale;
  attribute vec3 customColor;
  varying vec3 vColor;

  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = scale * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;

  void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

const DEFAULT_PRIMARY_COLOR = "#5D83DE";
const DEFAULT_SECONDARY_COLOR = "#FF1C91";

const buildGridConfig = (width, reducedMotion) => {
  const mobile = width < 768;

  if (reducedMotion) {
    return mobile
      ? { separation: 88, amountX: 34, amountY: 34, speed: 0.01, amplitude: 64, scaleStrength: 15 }
      : { separation: 92, amountX: 48, amountY: 48, speed: 0.012, amplitude: 86, scaleStrength: 17 };
  }

  return mobile
    ? { separation: 84, amountX: 46, amountY: 46, speed: 0.02, amplitude: 92, scaleStrength: 18 }
    : { separation: 86, amountX: 78, amountY: 78, speed: 0.024, amplitude: 126, scaleStrength: 20 };
};

const getCameraPosition = (width) => {
  const mobile = width < 768;
  const distance = mobile ? 2140 : 2500;
  const azimuth = THREE.MathUtils.degToRad(30);

  return {
    x: -Math.sin(azimuth) * distance,
    y: mobile ? 980 : 1200,
    z: Math.cos(azimuth) * distance,
  };
};

const toRgba = (hex, alpha) => {
  const color = new THREE.Color(hex);
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildOverlayStyle = (primaryColor, secondaryColor) => ({
  backgroundImage: `
    radial-gradient(circle at 18% 22%, ${toRgba(primaryColor, 0.26)}, rgba(0, 0, 0, 0) 32%),
    radial-gradient(circle at 78% 24%, ${toRgba(secondaryColor, 0.22)}, rgba(0, 0, 0, 0) 30%),
    radial-gradient(circle at 50% 14%, ${toRgba(primaryColor, 0.18)}, rgba(7, 11, 25, 0.46) 34%, rgba(3, 5, 13, 0.9) 100%)
  `,
});

export const ParticleWaveBackground = ({
  reducedMotion = false,
  className = "",
  primaryColor = DEFAULT_PRIMARY_COLOR,
  secondaryColor = DEFAULT_SECONDARY_COLOR,
}) => {
  const containerRef = useRef(null);
  const overlayStyle = buildOverlayStyle(primaryColor, secondaryColor);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const { separation, amountX, amountY, speed, amplitude, scaleStrength } = buildGridConfig(width, reducedMotion);
    const particleCount = amountX * amountY;
    const colorBlue = new THREE.Color(primaryColor);
    const colorPink = new THREE.Color(secondaryColor);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 10000);
    const initialCameraPosition = getCameraPosition(width);
    camera.position.set(initialCameraPosition.x, initialCameraPosition.y, initialCameraPosition.z);

    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const xWaveFactors = Array.from({ length: amountX }, () => 0.18 + Math.random() * 0.22);
    const yWaveFactors = Array.from({ length: amountY }, () => 0.28 + Math.random() * 0.28);
    const xWavePhases = Array.from({ length: amountX }, () => Math.random() * Math.PI * 2);
    const yWavePhases = Array.from({ length: amountY }, () => Math.random() * Math.PI * 2);

    let index = 0;
    let scaleIndex = 0;

    for (let ix = 0; ix < amountX; ix += 1) {
      for (let iy = 0; iy < amountY; iy += 1) {
        positions[index] = ix * separation - (amountX * separation) / 2;
        positions[index + 1] = 0;
        positions[index + 2] = iy * separation - (amountY * separation) / 2;

        const mixedColor = colorBlue.clone().lerp(colorPink, ix / Math.max(1, amountX - 1));
        colors[index] = mixedColor.r;
        colors[index + 1] = mixedColor.g;
        colors[index + 2] = mixedColor.b;

        scales[scaleIndex] = 1;
        index += 3;
        scaleIndex += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    particles.rotation.x = -0.08;
    scene.add(particles);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    let frameId = 0;
    let count = 0;

    const renderFrame = () => {
      const positionArray = particles.geometry.attributes.position.array;
      const scaleArray = particles.geometry.attributes.scale.array;

      let positionIndex = 0;
      let currentScaleIndex = 0;

      for (let ix = 0; ix < amountX; ix += 1) {
        for (let iy = 0; iy < amountY; iy += 1) {
          const xWave = Math.sin((ix + count) * xWaveFactors[ix] + xWavePhases[ix]);
          const yWave = Math.sin((iy + count) * yWaveFactors[iy] + yWavePhases[iy]);
          const shimmer = Math.sin((ix * 0.08 + iy * 0.06 + count) * 0.85);

          positionArray[positionIndex + 1] =
            xWave * amplitude +
            yWave * amplitude +
            shimmer * (amplitude * 0.22);

          scaleArray[currentScaleIndex] =
            (xWave + 1) * scaleStrength +
            (yWave + 1) * scaleStrength +
            (shimmer + 1) * (scaleStrength * 0.35);

          positionIndex += 3;
          currentScaleIndex += 1;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.scale.needsUpdate = true;
      particles.rotation.z = Math.sin(count * 0.18) * 0.025;

      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      count += speed;
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const handleResize = () => {
      const nextWidth = container.clientWidth || window.innerWidth;
      const nextHeight = container.clientHeight || window.innerHeight;
      const nextCameraPosition = getCameraPosition(nextWidth);
      camera.aspect = nextWidth / nextHeight;
      camera.position.set(nextCameraPosition.x, nextCameraPosition.y, nextCameraPosition.z);
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener("resize", handleResize);
    frameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [primaryColor, reducedMotion, secondaryColor]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute inset-0" style={overlayStyle} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,14,0.1)_0%,rgba(2,4,14,0.22)_38%,rgba(2,4,14,0.74)_100%)]" />
      <div className="absolute inset-x-0 bottom-[-8%] h-[42%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),rgba(255,255,255,0)_62%)] mix-blend-screen" />
    </div>
  );
};
