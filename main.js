import * as THREE from "three";

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SDFGeometryGenerator } from 'three/addons/geometries/SDFGeometryGenerator.js';
import GUI from 'lil-gui';

let renderer, meshFromSDF, scene, camera, clock, controls;
let particles, particleSystem;
let particleVelocities = [];

const articles = [
  { title: "Building a 3D Portfolio", link: "#article1", position: new THREE.Vector3(2, 1, 1) },
  { title: "WebGL Shaders", link: "#article2", position: new THREE.Vector3(-2, 1, 0) },
  { title: "Three.js Basics", link: "#article3", position: new THREE.Vector3(0, -2, 1) },
  { title: "Particle Systems", link: "#article4", position: new THREE.Vector3(-1, 2, -1) },
  { title: "JavaScript Performance", link: "#article5", position: new THREE.Vector3(1, -1, -2) }
];

const settings = {
  res: 4,
  bounds: 1,
  autoRotate: true,
  wireframe: true,
  material: "depth",
  vertexCount: "0",
};

// Example SDF from https://www.shadertoy.com/view/MdXSWn -->

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
						#ifdef phase_shift_on
						phi = asin(z.z / r) ;
						#else
						phi = asin(z.z / r);
						#endif

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

init();
animate();

function init() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Adjust camera settings
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 800;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Ensure black background

  clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("click", onParticleClick);

  createParticles();
  compile();
}

function createParticles() {
  const particleGeometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  particleVelocities = [];

  // Dramatically increased particle count
  for (let i = 0; i < 800; i++) {  // Increased from 200 to 800
    // Random position in a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 200 + Math.random() * 100;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions.push(x, y, z);

    // Slightly brighter green color
    colors.push(
      0.3,  // Less red for more pure green
      1.0,  // Full green
      0.3   // Less blue for more pure green
    );

    particleVelocities.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2
    });
  }

  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // Create circular texture for particles
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);

  const particleMaterial = new THREE.PointsMaterial({
    size: 1.5,  // Reduced size from 2 to 1.5
    vertexColors: true,
    map: texture,
    transparent: true,
    opacity: 0.6,  // Slightly reduced opacity to prevent overwhelming
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false
  });

  particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
}

function onParticleClick(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 10;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(particleSystem);

  if (intersects.length > 0) {
    const index = intersects[0].index;
    window.location.href = articles[index].link;
  }
}

function compile() {
  const generator = new SDFGeometryGenerator(renderer);
  const geometry = generator.generate(Math.pow(2, settings.res + 2), shader, settings.bounds);
  geometry.computeVertexNormals();

  // Create mesh with proper material
  meshFromSDF = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: settings.wireframe
    })
  );
  scene.add(meshFromSDF);

  // Adjust scale to be visible alongside particles
  const scale = 100; // Reduced from previous value
  meshFromSDF.scale.set(scale, scale, scale);

  // Center the Mandelbrot
  meshFromSDF.position.set(0, 0, 0);

    setMaterial();
    setMaterial();

  setMaterial();

}

function setMaterial() {
  meshFromSDF.material.dispose();
  meshFromSDF.material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: settings.wireframe,
    transparent: true,
    opacity: 0.4
  });
}

function onWindowResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setSize(w, h);

  camera.left = w / -2;
  camera.right = w / 2;
  camera.top = h / 2;
  camera.bottom = h / -2;

  camera.updateProjectionMatrix();
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  if (settings.autoRotate) {
    meshFromSDF.rotation.y += Math.PI * 0.03 * clock.getDelta();
  }

  // Asteroid-like particle movement
  const positions = particleSystem.geometry.attributes.position.array;
  const centerAttraction = 0.1; // Reduced from 0.3 for less inward pull
  const maxSpeed = 2;
  const minDistance = 180; // Minimum distance from center
  const idealDistance = 200; // Ideal orbital distance

  for(let i = 0; i < positions.length; i += 3) {
    const index = i / 3;
    const velocity = particleVelocities[index];

    // Calculate distance to center
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const distance = Math.sqrt(x * x + y * y + z * z);

    // Push particles outward if they get too close to center
    if (distance < minDistance) {
      const pushFactor = (minDistance - distance) / minDistance;
      velocity.x += (x / distance) * pushFactor;
      velocity.y += (y / distance) * pushFactor;
      velocity.z += (z / distance) * pushFactor;
    }

    // Orbital force (tangential to center)
    const tangentialForce = 0.5;
    velocity.x += (y / distance) * tangentialForce;
    velocity.y -= (x / distance) * tangentialForce;

    // Gentle force to maintain ideal distance
    const distanceError = (distance - idealDistance) / idealDistance;
    velocity.x -= (x / distance) * distanceError * 0.1;
    velocity.y -= (y / distance) * distanceError * 0.1;
    velocity.z -= (z / distance) * distanceError * 0.1;

    // Apply speed limit
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    if (speed > maxSpeed) {
      velocity.x = (velocity.x / speed) * maxSpeed;
      velocity.y = (velocity.y / speed) * maxSpeed;
      velocity.z = (velocity.z / speed) * maxSpeed;
    }

    // Update positions
    positions[i] += velocity.x;
    positions[i + 1] += velocity.y;
    positions[i + 2] += velocity.z;
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;

  render();
}
