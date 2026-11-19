import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { Events } from '../events';

import store from '../store';

import FBO from './FBO';

import simVertex from './shaders/simulation.vert';
import simFragment from './shaders/simulation.frag';
import particlesVertex from './shaders/particles.vert';
import particlesFragment from './shaders/particles.frag';
import fullScreenVertex from './shaders/fullscreen.vert';
import fullScreenFragment from './shaders/fullscreen.frag';
import eyeVertex from './shaders/eye.vert';
import eyeFragment from './shaders/eye.frag';

import { getRandomSpherePoint } from '../utils';

import GUI from '../gui';

export default new class {
  constructor() {
    this.renderer = new THREE.WebGL1Renderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(store.bounds.ww, store.bounds.wh);
    this.renderer.setClearColor(0x121110, 1);

    this.camera = new THREE.PerspectiveCamera(
      45,
      store.bounds.ww / store.bounds.wh,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 4);

    this.scene = new THREE.Scene();

    this.canvas = null;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.clock = new THREE.Clock();
    this.time = null;

    this.init();
  }

  init() {
    this.addCanvas();
    this.addEvents();
    this.setGui();
    this.createFBO();
    this.createScreenQuad();
    this.createEye();
    // Ensure first frame renders (in case ticker hasn't fired yet)
    requestAnimationFrame(() => this.render());
  }

  addCanvas() {
    this.canvas = this.renderer.domElement;
    this.canvas.classList.add('webgl');
    document.body.appendChild(this.canvas);
  }

  addEvents() {
    Events.on('tick', this.render.bind(this));
    Events.on('resize', this.resize.bind(this));
  }

  setGui() {
    this.tweaks = {
      pointSize: 1,
      speed: 1,
      curlFreq: 0.25,
      opacity: 0.3,
      bandFreq: 3.2,
      bandSpeed: 0.035,
      bandLow: 0.1,
    };
  }

  createFBO() {
    // width and height of FBO
    const width = 512;
    const height = 512;

    // Populate a Float32Array of random positions
    let length = width * height * 3;
    let data = new Float32Array(length);
    for (let i = 0; i < length; i += 3) {
      // Random positions inside a sphere
      const point = getRandomSpherePoint();
      data[i + 0] = point.x;
      data[i + 1] = point.y;
      data[i + 2] = point.z;

      // // Replaced with this if you want
      // // random positions inside a cube
      // data[i + 0] = Math.random() - 0.5;
      // data[i + 1] = Math.random() - 0.5;
      // data[i + 2] = Math.random() - 0.5;
    }

    // Convert the data to a FloatTexture
    const positions = new THREE.DataTexture(data, width, height, THREE.RGBFormat, THREE.FloatType);
    positions.needsUpdate = true;

    // Simulation shader material used to update the particles' positions
    this.simMaterial = new THREE.ShaderMaterial({
      vertexShader: simVertex,
      fragmentShader: simFragment,
      uniforms: {
        positions: { value: positions },
        uTime: { value: 0 },
        uSpeed: { value: this.tweaks.speed },
        uCurlFreq: { value: this.tweaks.curlFreq },
      },
    });

    // Render shader material to display the particles on screen
    // the positions uniform will be set after the this.fbo.update() call
    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: particlesVertex,
      fragmentShader: particlesFragment,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uPointSize: { value: this.tweaks.pointSize },
        uOpacity: { value: this.tweaks.opacity },
        uColor: { value: new THREE.Color(0xece8dc) },
        uBandFreq: { value: this.tweaks.bandFreq },
        uBandSpeed: { value: this.tweaks.bandSpeed },
        uBandLow: { value: this.tweaks.bandLow },
      },
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    // Initialize the FBO
    this.fbo = new FBO(width, height, this.renderer, this.simMaterial, this.renderMaterial);
    // Add the particles to the scene
    this.scene.add(this.fbo.particles);
  }

  createScreenQuad() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: fullScreenVertex,
      fragmentShader: fullScreenFragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(store.bounds.ww, store.bounds.wh) },
      },
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    this.fullScreenQuad = new THREE.Mesh(geometry, material);
    this.scene.add(this.fullScreenQuad);
  }

  createEye() {
    // A single red "eye" on the cloud, always facing the camera.
    // It drifts toward the cursor and returns home when the cursor rests.
    const geometry = new THREE.PlaneGeometry(0.6, 0.6);
    const material = new THREE.ShaderMaterial({
      vertexShader: eyeVertex,
      fragmentShader: eyeFragment,
      uniforms: {
        uTime: { value: 0 },
        uActive: { value: 0 },
        uColor: { value: new THREE.Color(0xff4a3d) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.eyeHome = new THREE.Vector3(-0.55, -0.12, 0.6);
    this.eyeTarget = this.eyeHome.clone();
    this.eyeActive = 0;
    this.lastPointerMove = 0;

    this.eye = new THREE.Mesh(geometry, material);
    this.eye.position.copy(this.eyeHome);
    this.eye.renderOrder = 10;
    this.scene.add(this.eye);

    // The canvas ignores pointer events, so listen on the window
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.eyeHome.z);
    const hit = new THREE.Vector3();
    const maxReach = 1.3;

    window.addEventListener('pointermove', (e) => {
      pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(pointer, this.camera);

      if (raycaster.ray.intersectPlane(plane, hit)) {
        const reach = Math.hypot(hit.x, hit.y);
        const k = reach > maxReach ? maxReach / reach : 1;
        this.eyeTarget.set(hit.x * k, hit.y * k, this.eyeHome.z);
      }

      this.lastPointerMove = performance.now();
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', () => {
      this.lastPointerMove = 0;
    });
  }

  updateEye() {
    const resting = performance.now() - this.lastPointerMove > 2500;
    const target = resting ? this.eyeHome : this.eyeTarget;

    this.eye.position.lerp(target, resting ? 0.025 : 0.08);
    this.eyeActive += ((resting ? 0 : 1) - this.eyeActive) * 0.05;

    this.eye.quaternion.copy(this.camera.quaternion);
    this.eye.material.uniforms.uTime.value = this.time;
    this.eye.material.uniforms.uActive.value = this.eyeActive;
  }

  resize() {
    let width = store.bounds.ww;
    let height = store.bounds.wh;

    this.camera.aspect = width / height;
    this.renderer.setSize(width, height);

    this.camera.updateProjectionMatrix();

    this.fullScreenQuad.material.uniforms.uResolution.value.x = store.bounds.ww;
    this.fullScreenQuad.material.uniforms.uResolution.value.y = store.bounds.wh;
  }

  render() {
    this.controls.update();

    this.time = this.clock.getElapsedTime();

    this.fbo.update(this.time);

    this.fullScreenQuad.material.uniforms.uTime.value = this.time;
    this.renderMaterial.uniforms.uTime.value = this.time;

    this.updateEye();

    this.renderer.render(this.scene, this.camera);
  }
}