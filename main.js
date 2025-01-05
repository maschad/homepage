import * as THREE from "three";

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SDFGeometryGenerator } from 'three/addons/geometries/SDFGeometryGenerator.js';
import GUI from 'lil-gui';

let renderer, meshFromSDF, scene, camera, clock, controls;
let particleSystem;
let particleVelocities = [];
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let plasmaStrands = [];
let mouseSphere;
let currentTypingInterval;
let titleElement;
let currentDisplayedTitle = '';

const articles = [
  // North
  { title: "Anglican dialectical identity within post-structural Jamaica",
    link: "#article1",
    position: new THREE.Vector3(0, 4, 0) },

  // East
  { title: "Transient Tech, Persistent Pigmentocracy: Hidden Post-Colonial Hierarchies in Global Remote Work",
    link: "#article2",
    position: new THREE.Vector3(4, 0, 0) },

  // South
  { title: "Cybernetic Capital: Distributed Machines, Divided Labor",
    link: "#article3",
    position: new THREE.Vector3(0, -4, 0) },

  // West
  { title: "Subsidiarity in the Digital Age: Localized Cryptocurrencies as tools for reparatory economics in the Caribbean",
    link: "#article4",
    position: new THREE.Vector3(-4, 0, 0) }
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
  window.addEventListener('mousemove', onMouseMove);

  createParticles();
  compile();

  // Create glowing mouse sphere
  const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
  const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
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
    blending: THREE.AdditiveBlending
  });

  mouseSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mouseSphere.visible = false;
  scene.add(mouseSphere);

  // Create plasma strands for each article
  articles.forEach((article, index) => {
    const strandGeometry = new THREE.BufferGeometry();
    const strandPositions = new Float32Array(50 * 3); // 50 points per strand
    strandGeometry.setAttribute('position', new THREE.BufferAttribute(strandPositions, 3));

    // Create thick line using MeshLine
    const strandMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      linewidth: 5  // Note: linewidth only works in WebGL2
    });

    const strand = new THREE.Line(strandGeometry, strandMaterial);
    plasmaStrands.push(strand);
    scene.add(strand);
  });

  titleElement = document.getElementById('article-title');
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
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(meshFromSDF);

  if (intersects.length > 0) {
    // Find closest strand
    let closestStrand = 0;
    let closestDistance = Infinity;

    plasmaStrands.forEach((strand, index) => {
      const distance = intersects[0].point.distanceTo(new THREE.Vector3(
        articles[index].position.x * 100,
        articles[index].position.y * 100,
        articles[index].position.z * 100
      ));

      if (distance < closestDistance) {
        closestDistance = distance;
        closestStrand = index;
      }
    });

    if (closestDistance < 300) { // Only trigger if close enough
      window.location.href = articles[closestStrand].link;
    }
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

  // Update plasma strands and mouse sphere
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(meshFromSDF);

  if (intersects.length > 0) {
    const intersectPoint = intersects[0].point;
    mouseSphere.position.copy(intersectPoint);
    mouseSphere.visible = true;

    // Find closest article for title display
    let closestArticle = null;
    let closestDistance = Infinity;

    articles.forEach((article, index) => {
      const distance = intersectPoint.distanceTo(new THREE.Vector3(
        article.position.x * 100,
        article.position.y * 100,
        article.position.z * 100
      ));

      if (distance < closestDistance) {
        closestDistance = distance;
        closestArticle = article;
      }
    });

    if (closestDistance < 500) {
      typeText(closestArticle.title);
    } else {
      titleElement.style.opacity = '0';
      currentDisplayedTitle = '';
    }

    // Update sphere glow
    mouseSphere.material.uniforms.time.value = clock.getElapsedTime();

    plasmaStrands.forEach((strand, index) => {
      const positions = strand.geometry.attributes.position.array;
      const article = articles[index];

      const distance = intersectPoint.distanceTo(new THREE.Vector3(
        article.position.x * 100,
        article.position.y * 100,
        article.position.z * 100
      ));

      // Enhanced strand animation
      const maxDistance = 300;
      const intensity = Math.max(0, 1 - (distance / maxDistance));
      strand.material.opacity = intensity;

      // Create more dramatic lightning-like path
      for(let i = 0; i < positions.length; i += 3) {
        const t = i / positions.length;
        const noise = new THREE.Vector3(
          (Math.random() - 0.5) * 15 * t,  // Increased noise
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
    titleElement.style.opacity = '0';
    currentDisplayedTitle = '';
    plasmaStrands.forEach(strand => {
      strand.material.opacity *= 0.95;
    });
  }

  render();
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function typeText(text) {
  if (text === currentDisplayedTitle) return;

  currentDisplayedTitle = text;
  if (currentTypingInterval) clearInterval(currentTypingInterval);

  titleElement.style.opacity = '1';
  let index = 0;
  titleElement.textContent = '';

  currentTypingInterval = setInterval(() => {
    if (index < text.length) {
      titleElement.textContent += text.charAt(index);
      index++;
    } else {
      clearInterval(currentTypingInterval);
    }
  }, 50);
}
