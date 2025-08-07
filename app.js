// Main application class
class ModelViewer {
  constructor() {
    // Core Three.js elements
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Model and helpers
    this.model = null;
    this.gridHelper = null;
    this.axesHelper = null;
    this.environmentMap = null;

    // State variables
    this.wireframe = false;
    this.showGrid = false;
    this.showAxes = false;
    this.environmentEnabled = true;
    this.currentLightingPreset = "default";
    this.lightBulbVisible = false;
    this.lightBulb = null;
    this.whiteEnvironment = false;
    this.shadowPlane = null;
    this.showShadowPlane = false;
    this.currentScale = 1;
    this.graphicsPreset = "high"; // New state variable

    // Stats
    this.triangleCount = 0;
    this.vertexCount = 0;
    this.textureCount = 0;

    this.environmentColor = new THREE.Color(0xffffff);

    this.initialCameraPosition = null;

    // Initialize the viewer
    this.init();
  }

  init() {
    this.setupScene();
    this.setupCamera();
    this.setGraphicsPreset("high"); // Set initial graphics preset
    this.setupRenderer();
    this.setupControls();
    this.setupLights();
    this.setupHelpers();
    this.setupUI();
    this.loadModel();
    this.animate();

    // Handle window resize
    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Add environment map
    this.loadEnvironmentMap();
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document
      .getElementById("model-container")
      .appendChild(this.renderer.domElement);
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minPolarAngle = 0;
    this.controls.maxDistance = 50;
    this.controls.minDistance = 1;
    this.controls.enablePan = true;
  }

  setupLights() {
    // Ambient light provides a base level of illumination.
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // Use a single, powerful directional light for casting shadows.
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 10, 7);
    this.directionalLight.castShadow = true;

    // Configure shadow camera and map for high quality.
    // The larger the map size, the more detailed the shadow.
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;

    // Adjust shadow camera frustum to fit the scene and prevent shadow clipping.
    // These values should be generous enough to cover the model and the plane.
    const shadowCameraSize = 15;
    this.directionalLight.shadow.camera.left = -shadowCameraSize;
    this.directionalLight.shadow.camera.right = shadowCameraSize;
    this.directionalLight.shadow.camera.top = shadowCameraSize;
    this.directionalLight.shadow.camera.bottom = -shadowCameraSize;
    this.directionalLight.shadow.camera.near = 1;
    this.directionalLight.shadow.camera.far = 50;

    // A small bias helps prevent "shadow acne," where shadows appear on the object itself.
    this.directionalLight.shadow.bias = -0.0001;

    this.scene.add(this.directionalLight);

    // Disable shadow casting for the other lights to prevent multiple shadows.
    // These lights now act as fill and rim lights without casting shadows.
    this.fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.fillLight.position.set(-5, 5, 5);
    this.scene.add(this.fillLight);

    this.backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    this.backLight.position.set(0, 5, -10);
    this.scene.add(this.backLight);

    // Update the model's shadow properties if it's already loaded.
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }
  setupHelpers() {
    // Grid helper
    this.gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
    this.gridHelper.visible = this.showGrid;
    this.scene.add(this.gridHelper);

    // Axes helper
    this.axesHelper = new THREE.AxesHelper(5);
    this.axesHelper.visible = this.showAxes;
    this.scene.add(this.axesHelper);
  }

  /* Base styles */
  setupUI() {
    // Reset view
    document
      .getElementById("reset-view")
      .addEventListener("click", () => this.resetView());

    // Fullscreen toggle
    document
      .getElementById("toggle-fullscreen")
      .addEventListener("click", () => this.toggleFullscreen());

    document
      .getElementById("scale-reset")
      .addEventListener("click", () => this.resetScale());

    // Wireframe toggle
    const wireframeBtn = document.getElementById("toggle-wireframe");
    wireframeBtn.addEventListener("click", () => {
      this.wireframe = !this.wireframe;
      this.toggleWireframe();
      wireframeBtn.classList.toggle("active", this.wireframe);
    });

    // Grid toggle
    const gridBtn = document.getElementById("toggle-grid");
    gridBtn.addEventListener("click", () => {
      this.showGrid = !this.showGrid;
      this.gridHelper.visible = this.showGrid;
      gridBtn.classList.toggle("active", this.showGrid);
    });

    // Axes toggle
    const axesBtn = document.getElementById("toggle-axes");
    axesBtn.addEventListener("click", () => {
      this.showAxes = !this.showAxes;
      this.axesHelper.visible = this.showAxes;
      axesBtn.classList.toggle("active", this.showAxes);
    });

    // Environment toggle
    const environmentBtn = document.getElementById("toggle-environment");
    environmentBtn.addEventListener("click", () => {
      this.environmentEnabled = !this.environmentEnabled;
      this.toggleEnvironment();
      environmentBtn.classList.toggle("active", this.environmentEnabled);
    });

    // Lighting presets
    document.querySelectorAll(".dropdown-content a").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        this.setLightingPreset(e.target.dataset.preset);
      });
    });

    const lightBulbBtn = document.getElementById("toggle-light-bulb");
    lightBulbBtn.addEventListener("click", () => {
      this.toggleLightBulb();
      lightBulbBtn.classList.toggle("active", this.lightBulbVisible);
    });

    const whiteEnvBtn = document.getElementById("toggle-white-env");
    whiteEnvBtn.addEventListener("click", () => {
      this.toggleWhiteEnvironment();
      whiteEnvBtn.classList.toggle("active", this.whiteEnvironment);
    });

    const shadowPlaneBtn = document.getElementById("toggle-shadow-plane");
    shadowPlaneBtn.addEventListener("click", () => {
      this.toggleShadowPlane();
      shadowPlaneBtn.classList.toggle("active", this.showShadowPlane);
    });

    // Scale controls
    document
      .getElementById("scale-up")
      .addEventListener("click", () => this.scaleModel(1.1));
    document
      .getElementById("scale-down")
      .addEventListener("click", () => this.scaleModel(0.9));
    document
      .getElementById("scale-reset")
      .addEventListener("click", () => this.resetScale());

    // Light intensity slider
    document
      .getElementById("light-intensity")
      .addEventListener("input", (e) => {
        this.updateLightIntensity(e.target.value);
      });

    // Environment color picker (using debounce for better performance)
    const envColorPicker = document.getElementById("env-color-picker");
    if (envColorPicker) {
      envColorPicker.addEventListener(
        "input",
        debounce((e) => {
          this.setEnvironmentColor(e.target.value);
        }, 100)
      );
    }

    // Graphics presets
    document
      .querySelectorAll(".graphics-dropdown-content a")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          this.setGraphicsPreset(e.target.dataset.preset);
        });
      });

    // Update light bulb position when camera moves
    this.controls.addEventListener("change", () => {
      if (this.lightBulbVisible) {
        this.updateLightBulbPosition();
      }
    });

    // Debounce utility function
    function debounce(func, wait) {
      let timeout;
      return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    }
  }

  setGraphicsPreset(preset) {
    this.graphicsPreset = preset;
    let antialias = false;
    let pixelRatio = 1;
    let shadowMapSize = 1024;
    let toneMappingExposure = 1.0;

    if (preset === "high") {
      antialias = true;
      pixelRatio = window.devicePixelRatio;
      shadowMapSize = 4096;
      toneMappingExposure = 1.0;
    } else if (preset === "low") {
      antialias = false;
      pixelRatio = 1;
      shadowMapSize = 1024;
      toneMappingExposure = 0.8;
    }

    // If renderer exists, apply the settings
    if (this.renderer) {
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = preset === "high";
      if (this.directionalLight) {
        this.directionalLight.shadow.mapSize.width = shadowMapSize;
        this.directionalLight.shadow.mapSize.height = shadowMapSize;
      }
      this.renderer.toneMappingExposure = toneMappingExposure;
      this.renderer.domElement.style.imageRendering =
        preset === "low" ? "pixelated" : "auto";
    }

    // Update UI button state
    const highBtn = document.querySelector('[data-preset="high"]');
    const lowBtn = document.querySelector('[data-preset="low"]');
    if (highBtn && lowBtn) {
      highBtn.classList.toggle("active", preset === "high");
      lowBtn.classList.toggle("active", preset === "low");
    }
  }

  setEnvironmentColor(color) {
    this.environmentColor.set(color);

    // Create a new cube render target with the selected color
    const size = 512;
    const rt = new THREE.WebGLCubeRenderTarget(size, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });

    const colorData = new Uint8Array(size * size * 4);
    const colorVector = new THREE.Vector3(
      this.environmentColor.r * 255,
      this.environmentColor.g * 255,
      this.environmentColor.b * 255
    );
    for (let i = 0; i < size * size * 4; i += 4) {
      colorData[i] = colorVector.x;
      colorData[i + 1] = colorVector.y;
      colorData[i + 2] = colorVector.z;
      colorData[i + 3] = 255;
    }
    const colorTexture = new THREE.DataTexture(
      colorData,
      size,
      size,
      THREE.RGBAFormat
    );
    colorTexture.needsUpdate = true;

    rt.fromEquirectangularTexture(this.renderer, colorTexture);

    this.scene.background = rt.texture;
    this.scene.environment = rt.texture;

    // Update model materials to reflect the new environment color
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((mat) => {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.envMap = rt.texture;
              mat.needsUpdate = true;
            }
          });
        }
      });
    }
  }

  loadEnvironmentMap() {
    const loader = new THREE.CubeTextureLoader();
    const path = "https://threejs.org/examples/textures/cube/pisa/";
    const format = ".png";
    const urls = [
      path + "px" + format,
      path + "nx" + format,
      path + "py" + format,
      path + "ny" + format,
      path + "pz" + format,
      path + "nz" + format,
    ];

    this.environmentMap = loader.load(urls);
    this.scene.environment = this.environmentMap;
  }

  loadModel() {
    // For a complete project, you would replace this with your actual model loading code
    // This example uses a placeholder car model from Three.js examples

    const loader = new THREE.GLTFLoader();

    // Optional: Add DRACO loader for compressed models
    // const dracoLoader = new THREE.DRACOLoader();
    // dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    // loader.setDRACOLoader(dracoLoader);

    // Show loading progress
    loader.load(
      "assets/models/kansai_spirit_3.0_tdi.glb", // Replace with your model path
      (gltf) => {
        this.model = gltf.scene;

        // Center the model
        this.centerModel();

        // Calculate model statistics
        this.calculateModelStats();

        // Add to scene
        this.scene.add(this.model);

        // Hide loading overlay
        document.getElementById("loading-overlay").style.display = "none";

        // Update stats panel
        this.updateStatsPanel();

        // Store initial camera position
        this.initialCameraPosition = this.camera.position.clone();
        this.initialControlsTarget = this.controls.target.clone();
      },
      (xhr) => {
        // Progress callback
        const percent = ((xhr.loaded / xhr.total) * 100).toFixed(0);
        document.getElementById("loading-progress").textContent = `${percent}%`;
      },
      (error) => {
        console.error("Error loading model:", error);
        document.getElementById("loading-text").textContent =
          "Error loading model";
        document.getElementById("loading-progress").textContent = "";
      }
    );
  }

  centerModel() {
    if (!this.model) return;

    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    this.model.position.x += this.model.position.x - center.x;
    this.model.position.y += -box.min.y;
    this.model.position.z += this.model.position.z - center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2.0;

    // Set initial camera position
    this.initialCameraPosition = new THREE.Vector3(0, maxDim / 2, cameraZ);
    this.initialControlsTarget = new THREE.Vector3(0, maxDim / 2, 0);

    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.update();
  }

  calculateModelStats() {
    if (!this.model) return;

    this.triangleCount = 0;
    this.vertexCount = 0;
    this.textureCount = 0;

    this.model.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;

        if (geometry.index) {
          this.triangleCount += geometry.index.count / 3;
        } else {
          this.triangleCount += geometry.attributes.position.count / 3;
        }

        this.vertexCount += geometry.attributes.position.count;

        if (child.material) {
          if (child.material.map) this.textureCount++;
          if (child.material.normalMap) this.textureCount++;
          if (child.material.roughnessMap) this.textureCount++;
          if (child.material.metalnessMap) this.textureCount++;
          if (child.material.emissiveMap) this.textureCount++;
          if (child.material.aoMap) this.textureCount++;
        }
      }
    });
  }

  updateStatsPanel() {
    document.getElementById("triangle-count").textContent =
      this.triangleCount.toLocaleString();
    document.getElementById("vertex-count").textContent =
      this.vertexCount.toLocaleString();
    document.getElementById("texture-count").textContent = this.textureCount;
  }

  toggleWireframe() {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (child.isMesh) {
        child.material.wireframe = this.wireframe;

        // For models with multiple materials
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = this.wireframe;
          });
        }
      }
    });
  }

  toggleEnvironment() {
    this.scene.environment = this.environmentEnabled
      ? this.environmentMap
      : null;

    // Also update materials to reflect environment changes
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                mat.envMap = this.environmentEnabled
                  ? this.environmentMap
                  : null;
                mat.needsUpdate = true;
              }
            });
          } else {
            if (
              child.material.isMeshStandardMaterial ||
              child.material.isMeshPhysicalMaterial
            ) {
              child.material.envMap = this.environmentEnabled
                ? this.environmentMap
                : null;
              child.material.needsUpdate = true;
            }
          }
        }
      });
    }
  }

  setLightingPreset(preset) {
    this.currentLightingPreset = preset;

    switch (preset) {
      case "default":
        this.ambientLight.intensity = 0.5;
        this.directionalLight.intensity = 1.0;
        this.directionalLight.position.set(5, 10, 7);
        this.fillLight.intensity = 0.5;
        this.fillLight.position.set(-5, 5, 5);
        this.backLight.intensity = 0.3;
        this.backLight.position.set(0, 5, -10);
        this.renderer.toneMappingExposure = 1.0;
        break;

      case "studio":
        this.ambientLight.intensity = 0.7;
        this.directionalLight.intensity = 1.2;
        this.directionalLight.position.set(3, 5, 5);
        this.fillLight.intensity = 0.8;
        this.fillLight.position.set(-3, 3, 3);
        this.backLight.intensity = 0.5;
        this.backLight.position.set(0, 2, -5);
        this.renderer.toneMappingExposure = 1.2;
        break;

      case "outdoor":
        this.ambientLight.intensity = 0.8;
        this.directionalLight.intensity = 1.5;
        this.directionalLight.position.set(10, 20, 10);
        this.fillLight.intensity = 0.3;
        this.fillLight.position.set(-5, 5, 5);
        this.backLight.intensity = 0.1;
        this.backLight.position.set(0, 5, -15);
        this.renderer.toneMappingExposure = 0.8;
        break;

      case "night":
        this.ambientLight.intensity = 0.1;
        this.directionalLight.intensity = 0.5;
        this.directionalLight.position.set(0, 10, 5);
        this.fillLight.intensity = 0.2;
        this.fillLight.position.set(-2, 2, 2);
        this.backLight.intensity = 0.1;
        this.backLight.position.set(0, 5, -5);
        this.renderer.toneMappingExposure = 0.5;
        break;
    }
  }

  resetView() {
    if (this.model) {
      this.centerModel();
    } else {
      this.camera.position.set(5, 5, 5);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    // Update light bulb position if visible
    if (this.lightBulbVisible && this.lightBulbElement) {
      this.updateLightBulbPosition();
    }

    this.renderer.render(this.scene, this.camera);
  }

  setupLightBulb() {
    const bulbGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2,
    });
    this.lightBulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    this.lightBulb.position.copy(this.directionalLight.position);
    this.scene.add(this.lightBulb);
    this.lightBulb.visible = false;
  }
  updateLightBulbPosition() {
    if (this.lightBulb) {
      this.lightBulb.position.copy(this.directionalLight.position);
    }
  }
  toggleLightBulb() {
    this.lightBulbVisible = !this.lightBulbVisible;

    if (this.lightBulbVisible && !this.lightBulb) {
      this.setupLightBulb();
    }

    if (this.lightBulb) {
      this.lightBulb.visible = this.lightBulbVisible;
    }

    document
      .getElementById("toggle-light-bulb")
      .classList.toggle("active", this.lightBulbVisible);
  }

  toggleWhiteEnvironment() {
    this.whiteEnvironment = !this.whiteEnvironment;

    if (this.whiteEnvironment) {
      // Create a brighter white environment with reflections
      const size = 512; // Higher resolution for better reflections
      const white = new THREE.Color(0xffffff);

      // Create a white cube render target
      const rt = new THREE.WebGLCubeRenderTarget(size, {
        format: THREE.RGBAFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });

      // Fill the texture with pure white
      const whiteData = new Uint8Array(size * size * 4).fill(255);
      const whiteTexture = new THREE.DataTexture(
        whiteData,
        size,
        size,
        THREE.RGBAFormat
      );
      whiteTexture.needsUpdate = true;

      // Convert to cube texture
      rt.fromEquirectangularTexture(this.renderer, whiteTexture);

      // Apply to scene
      this.scene.background = rt.texture;
      this.scene.environment = rt.texture;

      // Increase lighting for better visibility
      this.ambientLight.intensity = 1.0;
      this.directionalLight.intensity = 1.5;

      // Enable reflections on all materials
      this.scene.traverse((child) => {
        if (child.isMesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((mat) => {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.envMap = rt.texture;
              mat.envMapIntensity = 1.0;
              mat.metalness = 0.9; // Increase metalness for glossy look
              mat.roughness = 0.1; // Decrease roughness for more shine
              mat.needsUpdate = true;
            }
          });
        }
      });
    } else {
      // Restore original settings
      this.scene.background = new THREE.Color(0x1a1a1a);
      this.scene.environment = this.environmentMap;

      // Reset lighting
      this.ambientLight.intensity = 0.5;
      this.directionalLight.intensity = 1.0;

      // Reset materials
      this.scene.traverse((child) => {
        if (child.isMesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((mat) => {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.envMap = this.environmentMap;
              mat.envMapIntensity = 1.0;
              mat.metalness = 0.5;
              mat.roughness = 0.5;
              mat.needsUpdate = true;
            }
          });
        }
      });
    }

    document
      .getElementById("toggle-white-env")
      .classList.toggle("active", this.whiteEnvironment);
  }

  createShadowPlane() {
    if (this.shadowPlane) {
      this.scene.remove(this.shadowPlane);
    }

    if (!this.model) return;

    // Use a bounding box to determine the size of the plane
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const planeSize = maxDim * 3;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.3,
      transparent: true,
    });

    this.shadowPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.shadowPlane.rotation.x = -Math.PI / 2;

    // Position the plane at a fixed y-coordinate, such as 0.
    this.shadowPlane.position.y = -0.01; // This line is changed to a fixed value
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // Make sure all meshes in the model can cast shadows
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
  }

  toggleShadowPlane() {
    this.showShadowPlane = !this.showShadowPlane;

    if (this.showShadowPlane) {
      if (!this.shadowPlane) {
        this.createShadowPlane();
      } else {
        this.shadowPlane.visible = true;
      }
    } else if (this.shadowPlane) {
      this.shadowPlane.visible = false;
    }

    document
      .getElementById("toggle-shadow-plane")
      .classList.toggle("active", this.showShadowPlane);
  }

  scaleModel(factor) {
    if (!this.model) return;

    this.currentScale *= factor;
    this.model.scale.set(
      this.currentScale,
      this.currentScale,
      this.currentScale
    );
  }

  resetScale() {
    if (!this.model) return;

    // Reset scale
    this.currentScale = 1;
    this.model.scale.set(1, 1, 1);

    // Reset camera position if we have it stored
    if (this.initialCameraPosition) {
      this.camera.position.copy(this.initialCameraPosition);
      this.controls.target.copy(this.initialControlsTarget);
      this.controls.update();
    }
  }

  updateLightIntensity(value) {
    this.directionalLight.intensity = parseFloat(value);
    document.getElementById("light-intensity-value").textContent = value;
  }
}

// Initialize the viewer when the page loads
window.addEventListener("DOMContentLoaded", () => {
  const viewer = new ModelViewer();
});