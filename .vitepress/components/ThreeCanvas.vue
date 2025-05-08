<template>
  <div ref="canvasContainer" class="canvas-container"></div>
  <div id="article-title" class="terminal-text"></div>
  <div class="logo-overlay">
    <div class="logo-container">
      <div class="logo-part red"></div>
      <div class="logo-part yellow"></div>
      <div class="logo-part green"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useRouter } from "vitepress";

// SDFGeometryGenerator implementation
class SDFGeometryGenerator {
  constructor(renderer) {
    this.renderer = renderer;
    this.worker = null;
    this.workerBlob = null;
    this.workerUrl = null;
  }

  generate(resolution, shader, bounds) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const indices = [];

    const step = (2 * bounds) / resolution;
    const halfBounds = bounds;

    // Generate vertices
    for (let x = 0; x <= resolution; x++) {
      for (let y = 0; y <= resolution; y++) {
        for (let z = 0; z <= resolution; z++) {
          const px = x * step - halfBounds;
          const py = y * step - halfBounds;
          const pz = z * step - halfBounds;

          positions.push(px, py, pz);
          normals.push(0, 0, 0);
        }
      }
    }

    // Generate indices for triangles
    for (let x = 0; x < resolution; x++) {
      for (let y = 0; y < resolution; y++) {
        for (let z = 0; z < resolution; z++) {
          const i = x * (resolution + 1) * (resolution + 1) + y * (resolution + 1) + z;

          // First triangle
          indices.push(i, i + 1, i + (resolution + 1));
          indices.push(i + 1, i + (resolution + 1) + 1, i + (resolution + 1));

          // Second triangle
          indices.push(i + 1, i + (resolution + 1) * (resolution + 1), i + (resolution + 1) * (resolution + 1) + 1);
          indices.push(
            i + (resolution + 1),
            i + (resolution + 1) * (resolution + 1),
            i + (resolution + 1) * (resolution + 1) + 1
          );
        }
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    return geometry;
  }
}

const canvasContainer = ref(null);
const router = useRouter();

const articles = [
  {
    title: "Spend less time on your phone",
    link: "/recommended-reading",
    urlPath: "/recommended-reading",
    position: new THREE.Vector3(0, 4, 0),
  },
];

// Shader code for Mandelbrot
const shader = /* glsl */ `
  float dist(vec3 p) {
    p.xyz = p.xzy;
    p *= 1.2;
    vec3 z = p;
    vec3 dz=vec3(0.0);
    float power = 8.0;
    float r, theta, phi;
    float dr = 1.0;

    float t0 = 1.0;
    for(int i = 0; i < 7; ++i) {
      r = length(z);
      if(r > 2.0) continue;
      theta = atan(z.y / z.x);
      phi = asin(z.z / r);

      dr = pow(r, power - 1.0) * dr * power + 1.0;

      r = pow(r, power);
      theta = theta * power;
      phi = phi * power;

      z = r * vec3(cos(theta)*cos(phi), sin(theta)*cos(phi), sin(phi)) + p;

      t0 = min(t0, r);
    }

    return 0.5 * log(r) * r / dr;
  }
`;

const settings = {
  res: 4,
  bounds: 1,
  autoRotate: true,
  wireframe: true,
  material: "depth",
  vertexCount: "0",
};

onMounted(() => {
  let renderer, scene, camera, controls, particleSystem, raycaster, mouse;
  let animationFrameId;
  let meshFromSDF;
  let clock;
  let mouseSphere;
  let plasmaStrands = [];
  let particleVelocities = [];
  let currentTypingInterval;
  let currentDisplayedTitle = "";

  function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 2000);
    camera.position.z = 800;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.value.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    clock = new THREE.Clock();

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("click", handleParticleClick);
    window.addEventListener("mousemove", onMouseMove);

    createParticles();
    compile();

    // Create glowing mouse sphere
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 glow = vec3(0.0, 1.0, 0.0) * intensity * 2.0;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    mouseSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    mouseSphere.visible = false;
    scene.add(mouseSphere);

    // Create plasma strands
    articles.forEach((article) => {
      const strandGeometry = new THREE.BufferGeometry();
      const strandPositions = new Float32Array(50 * 3);
      strandGeometry.setAttribute("position", new THREE.BufferAttribute(strandPositions, 3));

      const strandMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        linewidth: 5,
      });

      const strand = new THREE.Line(strandGeometry, strandMaterial);
      plasmaStrands.push(strand);
      scene.add(strand);
    });

    animate();
  }

  function createParticles() {
    const particleGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    particleVelocities = [];

    for (let i = 0; i < 800; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 200 + Math.random() * 100;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions.push(x, y, z);
      colors.push(0.3, 1.0, 0.3);

      particleVelocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      });
    }

    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      map: texture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
  }

  function compile() {
    const generator = new SDFGeometryGenerator(renderer);
    const geometry = generator.generate(Math.pow(2, settings.res + 2), shader, settings.bounds);
    geometry.computeVertexNormals();

    meshFromSDF = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: settings.wireframe,
        transparent: true,
        opacity: 0.4,
      })
    );

    const scale = 100;
    meshFromSDF.scale.set(scale, scale, scale);
    meshFromSDF.position.set(0, 0, 0);
    scene.add(meshFromSDF);
  }

  function handleParticleClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(meshFromSDF);

    if (intersects.length > 0) {
      let closestStrand = 0;
      let closestDistance = Infinity;

      plasmaStrands.forEach((strand, index) => {
        const distance = intersects[0].point.distanceTo(
          new THREE.Vector3(articles[index].position.x * 100, articles[index].position.y * 100, articles[index].position.z * 100)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestStrand = index;
        }
      });

      if (closestDistance < 500) {
        const article = articles[closestStrand];
        router.go(article.urlPath);
      }
    }
  }

  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (settings.autoRotate) {
      meshFromSDF.rotation.y += Math.PI * 0.03 * clock.getDelta();
    }

    // Update particle positions
    const positions = particleSystem.geometry.attributes.position.array;
    const centerAttraction = 0.1;
    const maxSpeed = 2;
    const minDistance = 180;
    const idealDistance = 200;

    for (let i = 0; i < positions.length; i += 3) {
      const index = i / 3;
      const velocity = particleVelocities[index];

      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const distance = Math.sqrt(x * x + y * y + z * z);

      if (distance < minDistance) {
        const pushFactor = (minDistance - distance) / minDistance;
        velocity.x += (x / distance) * pushFactor;
        velocity.y += (y / distance) * pushFactor;
        velocity.z += (z / distance) * pushFactor;
      }

      const tangentialForce = 0.5;
      velocity.x += (y / distance) * tangentialForce;
      velocity.y -= (x / distance) * tangentialForce;

      const distanceError = (distance - idealDistance) / idealDistance;
      velocity.x -= (x / distance) * distanceError * 0.1;
      velocity.y -= (y / distance) * distanceError * 0.1;
      velocity.z -= (z / distance) * distanceError * 0.1;

      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
      if (speed > maxSpeed) {
        velocity.x = (velocity.x / speed) * maxSpeed;
        velocity.y = (velocity.y / speed) * maxSpeed;
        velocity.z = (velocity.z / speed) * maxSpeed;
      }

      positions[i] += velocity.x;
      positions[i + 1] += velocity.y;
      positions[i + 2] += velocity.z;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Update plasma strands and mouse sphere
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(meshFromSDF);

    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;
      mouseSphere.position.copy(intersectPoint);
      mouseSphere.visible = true;

      let closestArticle = null;
      let closestDistance = Infinity;

      articles.forEach((article, index) => {
        const distance = intersectPoint.distanceTo(
          new THREE.Vector3(article.position.x * 100, article.position.y * 100, article.position.z * 100)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestArticle = article;
        }
      });

      if (closestDistance < 500) {
        typeText(closestArticle.title);
      } else {
        document.getElementById("article-title").style.opacity = "0";
        currentDisplayedTitle = "";
      }

      mouseSphere.material.uniforms.time.value = clock.getElapsedTime();

      plasmaStrands.forEach((strand, index) => {
        const positions = strand.geometry.attributes.position.array;
        const article = articles[index];

        const distance = intersectPoint.distanceTo(
          new THREE.Vector3(article.position.x * 100, article.position.y * 100, article.position.z * 100)
        );

        const maxDistance = 300;
        const intensity = Math.max(0, 1 - distance / maxDistance);
        strand.material.opacity = intensity;

        for (let i = 0; i < positions.length; i += 3) {
          const t = i / positions.length;
          const noise = new THREE.Vector3(
            (Math.random() - 0.5) * 15 * t,
            (Math.random() - 0.5) * 15 * t,
            (Math.random() - 0.5) * 15 * t
          );

          positions[i] = intersectPoint.x * (1 - t) + article.position.x * 100 * t + noise.x;
          positions[i + 1] = intersectPoint.y * (1 - t) + article.position.y * 100 * t + noise.y;
          positions[i + 2] = intersectPoint.z * (1 - t) + article.position.z * 100 * t + noise.z;
        }

        strand.geometry.attributes.position.needsUpdate = true;
      });
    } else {
      mouseSphere.visible = false;
      document.getElementById("article-title").style.opacity = "0";
      currentDisplayedTitle = "";
      plasmaStrands.forEach((strand) => {
        strand.material.opacity *= 0.95;
      });
    }

    controls.update();
    renderer.render(scene, camera);
  }

  function typeText(text) {
    if (text === currentDisplayedTitle) return;

    currentDisplayedTitle = text;
    if (currentTypingInterval) clearInterval(currentTypingInterval);

    const titleElement = document.getElementById("article-title");
    titleElement.style.opacity = "1";
    let index = 0;
    titleElement.textContent = "";

    const article = articles.find((a) => a.title === text);
    titleElement.style.cursor = "pointer";
    titleElement.onclick = () => {
      if (article) {
        router.go(article.urlPath);
      }
    };

    currentTypingInterval = setInterval(() => {
      if (index < text.length) {
        titleElement.textContent += text.charAt(index);
        index++;
      } else {
        clearInterval(currentTypingInterval);
      }
    }, 50);
  }

  init();

  onUnmounted(() => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("click", handleParticleClick);
    window.removeEventListener("mousemove", onMouseMove);
    if (renderer) {
      renderer.dispose();
    }
    if (scene) {
      scene.clear();
    }
    if (currentTypingInterval) {
      clearInterval(currentTypingInterval);
    }
  });
});
</script>

<style scoped>
.canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: hidden;
  pointer-events: auto;
}
.terminal-text {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #00ff00;
  font-family: monospace;
  font-size: 24px;
  text-align: center;
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 10px 20px;
  border-radius: 5px;
  z-index: 100;
}
</style>
