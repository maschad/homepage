import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import * as THREE from "three";

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SDFGeometryGenerator } from 'three/addons/geometries/SDFGeometryGenerator.js';
import { marked } from 'marked';
import hljs from 'highlight.js';

function Home() {
  const navigate = useNavigate();
  const sceneRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const meshRef = useRef(null);
  const cameraRef = useRef(null);
  const articlesRef = useRef([
    // North
    {
      title: "Advanced Unit Testing in React Native",
      link: "articles/advance_unit_testing_react_native.md",
      urlPath: "articles/advance_unit_testing_react_native",
      position: new THREE.Vector3(0, 4, 0)
    },
    // East
    {
      title: "Sovereign Parallelized Rollups",
      link: "articles/sovereign_rollups.md",
      urlPath: "articles/sovereign_rollups",
      position: new THREE.Vector3(4, 0, 0)
    },
    // South
    {
      title: "Cybernetic Capital: Distributed Machines, Divided Labor",
      link: "articles/cybernetic_capital.md",
      urlPath: "articles/cybernetic_capital",
      position: new THREE.Vector3(0, -4, 0)
    },
    // West
    {
      title: "Subsidiarity in the Digital Age: Localized Cryptocurrencies as tools for reparatory economics in the Caribbean",
      link: "articles/subsidiarity_digital_age.md",
      urlPath: "articles/subsidiarity_digital_age",
      position: new THREE.Vector3(-4, 0, 0)
    }
  ]);
  const plasmaStrandsRef = useRef([]);

  const handleParticleClick = (event) => {
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      let closestStrand = 0;
      let closestDistance = Infinity;

      plasmaStrandsRef.current.forEach((strand, index) => {
        const distance = intersects[0].point.distanceTo(new THREE.Vector3(
          articlesRef.current[index].position.x * 100,
          articlesRef.current[index].position.y * 100,
          articlesRef.current[index].position.z * 100
        ));

        if (distance < closestDistance) {
          closestDistance = distance;
          closestStrand = index;
        }
      });

      if (closestDistance < 500) {
        const article = articlesRef.current[closestStrand];
        navigate('/' + article.urlPath);
      }
    }
  };

  useEffect(() => {
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
    let currentArticle = null;
    let isDirectArticleLoad = false;

    const articles = [
      // North
      {
        title: "Advanced Unit Testing in React Native",
        link: "articles/advance_unit_testing_react_native.md", // file path
        urlPath: "articles/advance_unit_testing_react_native", // URL path
        position: new THREE.Vector3(0, 4, 0)
      },

      // East
      {
        title: "Sovereign Parallelized Rollups",
        link: "articles/sovereign_rollups.md",
        urlPath: "articles/sovereign_rollups",
        position: new THREE.Vector3(4, 0, 0)
      },

      // South
      {
        title: "Cybernetic Capital: Distributed Machines, Divided Labor",
        link: "articles/cybernetic_capital.md",
        urlPath: "articles/cybernetic_capital",
        position: new THREE.Vector3(0, -4, 0)
      },

      // West
      {
        title: "Subsidiarity in the Digital Age: Localized Cryptocurrencies as tools for reparatory economics in the Caribbean",
        link: "articles/subsidiarity_digital_age.md",
        urlPath: "articles/subsidiarity_digital_age",
        position: new THREE.Vector3(-4, 0, 0)
      }
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

    function init() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Adjust camera settings
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      camera.position.z = 800;
      cameraRef.current = camera;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000); // Ensure black background

      clock = new THREE.Clock();

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      sceneRef.current.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      window.addEventListener("resize", onWindowResize);
      window.addEventListener("click", handleParticleClick);
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

      console.log("Articles configuration:", articles.map(a => ({
        title: a.title,
        link: a.link,
        position: a.position
      })));

      handleRoute();

      // Add popstate event listener for browser back/forward
      window.addEventListener('popstate', (event) => {
        handleRoute();
      });

      // Store meshFromSDF in ref
      meshRef.current = meshFromSDF;

      // Store plasmaStrands in ref
      plasmaStrandsRef.current = plasmaStrands;
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

      // Find the corresponding article
      const article = articles.find(a => a.title === text);

      // Add click handler to the title element
      titleElement.style.cursor = 'pointer';
      titleElement.onclick = () => {
        if (article) {
          navigate('/' + article.urlPath);
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

    // Add this function to parse and render markdown articles
    function renderArticle(markdown) {
      const sections = markdown.split('###');

      // Parse title (first # section)
      const titleMatch = sections[0].match(/# (.*?)\n/);
      const title = titleMatch ? titleMatch[1] : '';

      // Parse metadata section (everything between ## Metadata and ### Body)
      const metadataSection = sections[0].split('## Metadata')[1];
      if (!metadataSection) return 'Error: No metadata section found';

      // Split metadata into lines and process them
      const metadataLines = metadataSection
          .split('\n')
          .filter(line => line.trim() !== '');

      // Process each line, with special handling for [original article] link
      const processedMetadataLines = metadataLines.map(line => {
          if (line.includes('[original article]')) {
              const match = line.match(/\[original article\]\((.*?)\)/);
              if (match) {
                  const url = match[1];
                  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="original-article-link">original article</a>`;
              }
          }
          return line;
      });

      const metadata = processedMetadataLines.join('\n');

      // Parse body (### section)
      const body = sections[1] ? sections[1].replace('Body', '').trim() : '';

      // Configure marked with highlighting and custom renderer
      marked.setOptions({
          highlight: function(code, lang) {
              if (!code) return '';
              if (lang && hljs.getLanguage(lang)) {
                  return hljs.highlight(code, { language: lang }).value;
              }
              return code;
          },
          langPrefix: 'hljs language-'
      });

      // Custom renderer to wrap code blocks in copyable container
      const renderer = new marked.Renderer();
      renderer.code = function(code, language) {
          const codeText = typeof code === 'object' ? code.text : code;
          const codeLang = typeof code === 'object' ? code.lang : language;

          if (!codeText) return '';

          const validLanguage = codeLang && hljs.getLanguage(codeLang) ? codeLang : 'plaintext';
          const highlightedCode = hljs.highlight(codeText, { language: validLanguage }).value;

          return `
              <div class="code-block-container">
                  <button class="copy-button" data-code="${encodeURIComponent(codeText)}">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                  </button>
                  <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
              </div>
          `;
      };

      const articleHTML = `
          <div class="article-container">
              <div class="article-title">${title}</div>
              <div class="article-metadata">
                  <pre>${metadata}</pre>
              </div>
              <div class="article-body">
                  ${marked(body, { renderer })}
              </div>
          </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = articleHTML;

      setupCopyButtons();

      return articleHTML;
    }

    // Handle copy button clicks
    function setupCopyButtons() {
      document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
          const code = decodeURIComponent(button.dataset.code);
          navigator.clipboard.writeText(code);
        });
      });
    }

    function getArticleByPath(path) {
      return articles.find(article => article.urlPath === path || article.urlPath === path.replace('.md', ''));
    }

    function handleRoute() {
      const path = window.location.pathname;

      // Check if we're on an article path
      if (path.startsWith('/articles/')) {
        const articlePath = path.substring(1); // Remove leading slash
        const article = getArticleByPath(articlePath);

        if (article) {
          isDirectArticleLoad = true;
          loadAndDisplayArticle(article);
        }
      }
    }

    async function loadAndDisplayArticle(article) {
      try {
        const response = await fetch(article.link);
        if (!response.ok) throw new Error('Article not found');

        const markdown = await response.text();
        const articleHTML = renderArticle(markdown);

        let articleContainer = document.getElementById('article-container');
        if (!articleContainer) {
          articleContainer = document.createElement('div');
          articleContainer.id = 'article-container';
          document.body.appendChild(articleContainer);
        }

        // Add the article-content class to enable styling
        articleContainer.innerHTML = `
          <div class="article-overlay">
            <button class="close-button">×</button>
            <div class="article-content">
              ${articleHTML}
            </div>
          </div>
        `;

        // Setup copy buttons for code blocks
        setupCopyButtons();

        // Update URL with clean path
        if (!isDirectArticleLoad) {
          history.pushState({}, '', '/' + article.urlPath);
        }
        isDirectArticleLoad = false;

        // Add close button handler
        document.querySelector('.close-button').addEventListener('click', () => {
          articleContainer.remove();
          history.pushState({}, '', '/');
        });

        // Add escape key handler
        document.addEventListener('keydown', function closeOnEscape(e) {
          if (e.key === 'Escape') {
            articleContainer.remove();
            history.pushState({}, '', '/');
            document.removeEventListener('keydown', closeOnEscape);
          }
        });

      } catch (error) {
        console.error('Error loading article:', error);
      }
    }

    // Initialize the scene
    init();
    animate();

    // Event listeners
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("click", handleParticleClick);
    window.addEventListener('mousemove', onMouseMove);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("click", handleParticleClick);
      window.removeEventListener('mousemove', onMouseMove);

      if (renderer) {
        renderer.dispose();
      }
      if (scene) {
        scene.clear();
      }
      if (currentTypingInterval) {
        clearInterval(currentTypingInterval);
      }

      // Remove the canvas from the DOM
      if (sceneRef.current && renderer) {
        sceneRef.current.removeChild(renderer.domElement);
      }
    };
  }, [navigate, handleParticleClick]); // Add handleParticleClick to dependencies

  return (
    <>
      <div
        ref={sceneRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'auto'  // Ensure clicks are captured
        }}
      />
      <div id="article-title" className="terminal-text" />
    </>
  );
}

export default Home;