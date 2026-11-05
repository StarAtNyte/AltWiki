export interface DocTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "graphics" | "ai" | "tools" | "hardware";
  content: string;
}

export const templates: DocTemplate[] = [
  {
    id: "visual-effect",
    name: "Visual Effect",
    description: "Shader-based effects, WebGL, Three.js visuals",
    icon: "sparkles",
    category: "graphics",
    content: `# Visual Effect Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Technology** | WebGL 2.0 / Three.js r158+ |
| **GPU Required** | Yes (WebGL 2.0 support) |
| **Performance** | 60 FPS on mid-range hardware |
| **Bundle Size** | ~45KB gzipped |

---

## What This Effect Does

This visual effect creates [describe the visual outcome]. It's commonly used for:

- **Hero sections** - Eye-catching landing page backgrounds
- **Data visualization** - Dynamic representation of data flows
- **Interactive art** - Responsive visuals that react to user input
- **Loading states** - Engaging animations during content loading

### Live Demo

\`\`\`
[Insert demo link or embed code]
\`\`\`

---

## Technical Architecture

### Rendering Pipeline

\`\`\`
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Vertex    │ -> │   Fragment   │ -> │    Post     │
│   Shader    │    │    Shader    │    │  Processing │
└─────────────┘    └──────────────┘    └─────────────┘
      ↑                   ↑                   ↓
  Geometry          Uniforms/Time       Frame Buffer
\`\`\`

### Shader Implementation

**Vertex Shader:**

\`\`\`glsl
#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUv;
out vec3 vPosition;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;

void main() {
    vUv = uv;
    vPosition = position;

    vec3 pos = position;
    // Add vertex displacement here
    pos.z += sin(pos.x * 2.0 + uTime) * 0.1;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
\`\`\`

**Fragment Shader:**

\`\`\`glsl
#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vPosition;

out vec4 fragColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
    // Normalized coordinates
    vec2 uv = vUv;

    // Create gradient based on position and time
    float gradient = sin(uv.x * 3.14159 + uTime * 0.5) * 0.5 + 0.5;

    // Mix colors
    vec3 color = mix(uColor1, uColor2, gradient);

    // Add subtle noise
    float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    color += noise * 0.02;

    fragColor = vec4(color, 1.0);
}
\`\`\`

---

## Configuration Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| \`speed\` | float | 1.0 | 0.1 - 5.0 | Animation speed multiplier |
| \`intensity\` | float | 0.8 | 0.0 - 2.0 | Effect strength |
| \`color1\` | vec3 | #3B82F6 | - | Primary gradient color |
| \`color2\` | vec3 | #8B5CF6 | - | Secondary gradient color |
| \`noiseScale\` | float | 1.0 | 0.1 - 10.0 | Noise texture scale |
| \`pixelRatio\` | float | window.devicePixelRatio | 0.5 - 2.0 | Render resolution |

---

## Integration Examples

### Three.js Setup

\`\`\`javascript
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Custom shader material
const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColor1: { value: new THREE.Color('#3B82F6') },
        uColor2: { value: new THREE.Color('#8B5CF6') },
    },
});

// Geometry
const geometry = new THREE.PlaneGeometry(2, 2, 32, 32);
const mesh = new THREE.Mesh(geometry, shaderMaterial);
scene.add(mesh);

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    shaderMaterial.uniforms.uTime.value = time * 0.001;
    renderer.render(scene, camera);
}
animate(0);
\`\`\`

### React Three Fiber

\`\`\`jsx
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function VisualEffect({ speed = 1.0, intensity = 0.8 }) {
    const materialRef = useRef();

    useFrame(({ clock }) => {
        materialRef.current.uniforms.uTime.value = clock.elapsedTime * speed;
    });

    return (
        <mesh>
            <planeGeometry args={[2, 2, 32, 32]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uIntensity: { value: intensity },
                }}
            />
        </mesh>
    );
}

export default function App() {
    return (
        <Canvas>
            <VisualEffect speed={1.5} />
        </Canvas>
    );
}
\`\`\`

---

## Performance Optimization

### GPU Memory Management

\`\`\`javascript
// Dispose resources when component unmounts
useEffect(() => {
    return () => {
        geometry.dispose();
        material.dispose();
        if (texture) texture.dispose();
    };
}, []);
\`\`\`

### Resolution Scaling

For mobile devices, consider reducing the pixel ratio:

\`\`\`javascript
const pixelRatio = window.innerWidth < 768 ? 1 : Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
\`\`\`

### Performance Benchmarks

| Device | Resolution | FPS (avg) | GPU Usage |
|--------|------------|-----------|-----------|
| MacBook Pro M1 | 2560x1600 | 60 | 15% |
| iPhone 14 | 1170x2532 | 60 | 25% |
| Budget Android | 720x1280 | 45 | 80% |

---

## Browser Compatibility

| Browser | WebGL 1 | WebGL 2 | Notes |
|---------|---------|---------|-------|
| Chrome 90+ | ✅ | ✅ | Full support |
| Firefox 90+ | ✅ | ✅ | Full support |
| Safari 15+ | ✅ | ✅ | WebGL 2 since iOS 15 |
| Edge 90+ | ✅ | ✅ | Full support |

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Black screen | WebGL context lost | Check \`renderer.getContext().isContextLost()\` |
| Low FPS | High pixel ratio | Reduce \`pixelRatio\` to 1 |
| Artifacts | Float precision | Use \`highp\` precision in shaders |
| Memory leak | Undisposed resources | Call \`.dispose()\` on cleanup |

---

## Related Resources

- [Three.js Fundamentals](https://threejs.org/manual/#en/fundamentals)
- [The Book of Shaders](https://thebookofshaders.com/)
- [WebGL2 Fundamentals](https://webgl2fundamentals.org/)
`,
  },
  {
    id: "image-processor",
    name: "Image Processor",
    description: "Pixel manipulation, color processing, image algorithms",
    icon: "photo",
    category: "graphics",
    content: `# Image Processor Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Processing** | CPU / Web Workers |
| **Max Image Size** | 4096x4096 (16MP) |
| **Supported Formats** | PNG, JPEG, WebP, BMP |
| **Output Formats** | PNG, JPEG, WebP |

---

## What This Processor Does

This image processor performs [describe the image operation]. Common applications include:

- **Photo editing** - Color correction, filters, adjustments
- **Data extraction** - OCR preprocessing, feature detection
- **Batch processing** - Automated image transformations
- **Real-time effects** - Camera filter applications

---

## Algorithm Overview

### Processing Pipeline

\`\`\`
┌──────────┐   ┌────────────┐   ┌───────────┐   ┌──────────┐
│  Input   │ → │  Decode    │ → │  Process  │ → │  Encode  │
│  Image   │   │  to RGBA   │   │  Pixels   │   │  Output  │
└──────────┘   └────────────┘   └───────────┘   └──────────┘
\`\`\`

### Core Algorithm

\`\`\`javascript
/**
 * Apply grayscale conversion using luminosity method
 * Formula: 0.299R + 0.587G + 0.114B (ITU-R BT.601)
 */
function grayscale(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Luminosity method preserves perceived brightness
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        data[i] = gray;     // Red
        data[i + 1] = gray; // Green
        data[i + 2] = gray; // Blue
        // Alpha unchanged
    }

    return imageData;
}
\`\`\`

### Complexity Analysis

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Per-pixel transform | O(n) | O(1) |
| Convolution (3x3) | O(n) | O(n) |
| Histogram equalization | O(n) | O(256) |
| Gaussian blur (σ=2) | O(n * k²) | O(n) |

Where n = width × height pixels, k = kernel size

---

## Implementation

### Basic Usage

\`\`\`javascript
class ImageProcessor {
    constructor(options = {}) {
        this.quality = options.quality ?? 0.92;
        this.useWebWorker = options.useWebWorker ?? true;
    }

    async process(imageSource, operations) {
        // Load image
        const imageData = await this.loadImage(imageSource);

        // Apply operations in sequence
        let result = imageData;
        for (const op of operations) {
            result = await this.applyOperation(result, op);
        }

        return result;
    }

    async loadImage(source) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        return new Promise((resolve, reject) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                resolve(ctx.getImageData(0, 0, img.width, img.height));
            };
            img.onerror = reject;
            img.src = source;
        });
    }

    applyOperation(imageData, operation) {
        switch (operation.type) {
            case 'brightness':
                return this.adjustBrightness(imageData, operation.value);
            case 'contrast':
                return this.adjustContrast(imageData, operation.value);
            case 'blur':
                return this.applyBlur(imageData, operation.radius);
            default:
                return imageData;
        }
    }

    adjustBrightness(imageData, value) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + value));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
        }
        return imageData;
    }

    adjustContrast(imageData, value) {
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
        return imageData;
    }
}
\`\`\`

### Web Worker Implementation

\`\`\`javascript
// worker.js
self.onmessage = function(e) {
    const { imageData, operation } = e.data;

    // Process in worker thread
    const result = processImage(imageData, operation);

    // Transfer buffer back to main thread
    self.postMessage({ imageData: result }, [result.data.buffer]);
};

// main.js
const worker = new Worker('worker.js');

async function processWithWorker(imageData, operation) {
    return new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data.imageData);
        worker.postMessage(
            { imageData, operation },
            [imageData.data.buffer]
        );
    });
}
\`\`\`

---

## Available Operations

### Color Adjustments

| Operation | Parameters | Description |
|-----------|------------|-------------|
| \`brightness\` | value: -255 to 255 | Adjust overall brightness |
| \`contrast\` | value: -255 to 255 | Adjust contrast level |
| \`saturation\` | value: -100 to 100 | Adjust color saturation |
| \`hue\` | value: 0 to 360 | Rotate hue values |

### Filters

| Filter | Parameters | Description |
|--------|------------|-------------|
| \`blur\` | radius: 1-20 | Gaussian blur |
| \`sharpen\` | amount: 0.1-5.0 | Unsharp mask |
| \`noise\` | amount: 0-100 | Add random noise |
| \`grayscale\` | - | Convert to grayscale |

### Transformations

| Transform | Parameters | Description |
|-----------|------------|-------------|
| \`resize\` | width, height | Scale image |
| \`crop\` | x, y, width, height | Crop region |
| \`rotate\` | angle: 0-360 | Rotate image |
| \`flip\` | direction: h/v | Flip horizontally/vertically |

---

## Performance Benchmarks

### Processing Time by Image Size

| Image Size | Grayscale | Blur (r=3) | Resize (50%) |
|------------|-----------|------------|--------------|
| 640x480 | 5ms | 25ms | 15ms |
| 1920x1080 | 18ms | 150ms | 45ms |
| 3840x2160 | 72ms | 600ms | 180ms |

### Memory Usage

\`\`\`javascript
// Calculate memory for ImageData
const memoryBytes = width * height * 4; // RGBA = 4 bytes per pixel

// Example: 1920x1080 image
// 1920 * 1080 * 4 = 8,294,400 bytes ≈ 8MB
\`\`\`

---

## Error Handling

\`\`\`javascript
class ImageProcessorError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}

const ErrorCodes = {
    INVALID_INPUT: 'INVALID_INPUT',
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    SIZE_EXCEEDED: 'SIZE_EXCEEDED',
    PROCESSING_FAILED: 'PROCESSING_FAILED',
};

// Usage
try {
    const result = await processor.process(image, operations);
} catch (error) {
    if (error.code === ErrorCodes.SIZE_EXCEEDED) {
        console.error('Image too large. Max size: 4096x4096');
    }
}
\`\`\`

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Canvas 2D | ✅ | ✅ | ✅ | ✅ |
| Web Workers | ✅ | ✅ | ✅ | ✅ |
| OffscreenCanvas | ✅ | ✅ | ✅ (15.4+) | ✅ |
| ImageBitmap | ✅ | ✅ | ✅ (15+) | ✅ |

---

## Related Resources

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Web Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Image Processing Algorithms](https://en.wikipedia.org/wiki/Digital_image_processing)
`,
  },
  {
    id: "3d-visualization",
    name: "3D Visualization",
    description: "Three.js scenes, WebGL, 3D rendering",
    icon: "cube",
    category: "graphics",
    content: `# 3D Visualization Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Framework** | Three.js r158+ |
| **Renderer** | WebGL 2.0 |
| **Target FPS** | 60 |
| **Mobile Support** | Yes (responsive) |

---

## What This Visualization Does

This 3D visualization renders [describe the visualization]. It's designed for:

- **Product showcases** - Interactive 3D product viewers
- **Data visualization** - 3D charts and graphs
- **Architectural walkthroughs** - Building and space exploration
- **Scientific visualization** - Molecular, medical, or physics simulations

---

## Scene Architecture

### Component Hierarchy

\`\`\`
Scene
├── Camera (PerspectiveCamera)
│   └── Controls (OrbitControls)
├── Lights
│   ├── AmbientLight
│   ├── DirectionalLight (with shadows)
│   └── PointLight (optional)
├── Environment
│   ├── Skybox/Background
│   └── Ground Plane
└── Objects
    ├── Main Model
    ├── Interactive Elements
    └── Helper Objects (axes, grid)
\`\`\`

---

## Implementation

### Basic Scene Setup

\`\`\`javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class Visualization {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(5, 5, 5);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Lights
        this.setupLights();

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
    }

    setupLights() {
        // Ambient light for base illumination
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Main directional light with shadows
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 50;
        this.scene.add(directional);

        // Fill light
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);
    }

    async loadModel(url) {
        const loader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;

                    // Center model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);

                    // Enable shadows
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.scene.add(model);
                    resolve(model);
                },
                (progress) => {
                    console.log(\`Loading: \${(progress.loaded / progress.total * 100).toFixed(1)}%\`);
                },
                reject
            );
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    dispose() {
        this.renderer.dispose();
        this.controls.dispose();

        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}

// Usage
const container = document.getElementById('visualization');
const viz = new Visualization(container);
await viz.loadModel('/models/scene.glb');
viz.animate();
\`\`\`

### React Three Fiber Version

\`\`\`jsx
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useRef } from 'react';

function Model({ url, ...props }) {
    const { scene } = useGLTF(url);
    const ref = useRef();

    useFrame((state) => {
        // Optional animation
        ref.current.rotation.y = state.clock.elapsedTime * 0.1;
    });

    return <primitive ref={ref} object={scene} {...props} />;
}

function Visualization() {
    return (
        <Canvas
            camera={{ position: [5, 5, 5], fov: 60 }}
            shadows
            dpr={[1, 2]}
        >
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[5, 10, 5]}
                intensity={0.8}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />

            <Suspense fallback={null}>
                <Model url="/models/scene.glb" />
                <Environment preset="city" />
            </Suspense>

            <ContactShadows
                position={[0, -0.5, 0]}
                opacity={0.5}
                scale={10}
                blur={2}
            />

            <OrbitControls
                enableDamping
                dampingFactor={0.05}
                minDistance={2}
                maxDistance={20}
            />
        </Canvas>
    );
}
\`\`\`

---

## Interaction Controls

### Default Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Rotate | Left-click + drag | One finger drag |
| Pan | Right-click + drag | Two finger drag |
| Zoom | Scroll wheel | Pinch |
| Reset | Double-click | Double-tap |

### Raycasting for Object Selection

\`\`\`javascript
class Picker {
    constructor(camera, scene, domElement) {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.camera = camera;
        this.scene = scene;

        domElement.addEventListener('click', (e) => this.onClick(e));
    }

    onClick(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const selected = intersects[0].object;
            console.log('Selected:', selected.name);
            // Handle selection
        }
    }
}
\`\`\`

---

## Performance Optimization

### Level of Detail (LOD)

\`\`\`javascript
const lod = new THREE.LOD();

// High detail for close up
lod.addLevel(highDetailMesh, 0);
// Medium detail
lod.addLevel(mediumDetailMesh, 10);
// Low detail for far away
lod.addLevel(lowDetailMesh, 30);

scene.add(lod);
\`\`\`

### Instancing for Repeated Objects

\`\`\`javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);

const matrix = new THREE.Matrix4();
for (let i = 0; i < 1000; i++) {
    matrix.setPosition(
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        Math.random() * 100 - 50
    );
    instancedMesh.setMatrixAt(i, matrix);
}

scene.add(instancedMesh);
\`\`\`

### Performance Metrics

| Optimization | Before | After | Improvement |
|--------------|--------|-------|-------------|
| Instancing (1000 objects) | 15 FPS | 60 FPS | 4x |
| LOD (complex model) | 30 FPS | 60 FPS | 2x |
| Texture compression | 150MB | 30MB | 5x memory |

---

## Model Format Support

| Format | Extension | Features | Recommended |
|--------|-----------|----------|-------------|
| glTF | .gltf/.glb | Animation, PBR materials | ✅ Yes |
| FBX | .fbx | Animation, materials | For legacy |
| OBJ | .obj | Basic geometry | No |
| DRACO | .glb (compressed) | Smaller file size | ✅ Yes |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Model not visible | Scale too small/large | Check bounding box, adjust camera |
| Black model | Missing lights | Add AmbientLight + DirectionalLight |
| Jagged edges | No antialiasing | Enable \`antialias: true\` |
| Performance drops | Too many draw calls | Use instancing, merge geometries |

---

## Related Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Sketchfab (free 3D models)](https://sketchfab.com/)
`,
  },
  {
    id: "ai-browser-model",
    name: "AI Browser Model",
    description: "In-browser ML models, Transformers.js, TensorFlow.js",
    icon: "brain",
    category: "ai",
    content: `# Browser AI Model Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Framework** | Transformers.js / TensorFlow.js |
| **Model Size** | ~50MB (quantized) |
| **Inference Time** | ~150ms (CPU) / ~30ms (GPU) |
| **Privacy** | 100% client-side |

---

## What This Model Does

This AI model performs [describe the task] directly in the browser. Benefits include:

- **Privacy** - Data never leaves the user's device
- **Offline** - Works without internet after initial load
- **Low latency** - No network round-trip delay
- **Free** - No API costs after deployment

### Supported Tasks

- Text classification / sentiment analysis
- Image classification / object detection
- Text generation / summarization
- Speech recognition / text-to-speech
- Embeddings / similarity search

---

## Model Architecture

### Pipeline Overview

\`\`\`
┌─────────┐    ┌──────────────┐    ┌─────────┐    ┌────────────┐
│  Input  │ -> │ Tokenize/    │ -> │  Model  │ -> │  Decode    │
│  Data   │    │ Preprocess   │    │ Infer   │    │  Output    │
└─────────┘    └──────────────┘    └─────────┘    └────────────┘
\`\`\`

### Model Specifications

| Specification | Value |
|---------------|-------|
| Architecture | [e.g., DistilBERT, MobileViT] |
| Parameters | [e.g., 67M] |
| Quantization | INT8 / FP16 |
| Input Size | [e.g., 512 tokens, 224x224 pixels] |
| Output | [e.g., 2 classes, 1000 classes] |

---

## Implementation

### Installation

\`\`\`bash
# Using Transformers.js
npm install @xenova/transformers

# Using TensorFlow.js
npm install @tensorflow/tfjs
\`\`\`

### Transformers.js Example

\`\`\`javascript
import { pipeline, env } from '@xenova/transformers';

// Configure caching (optional)
env.cacheDir = './.cache';
env.allowLocalModels = false;

class TextClassifier {
    static instance = null;

    static async getInstance(progressCallback = null) {
        if (this.instance === null) {
            this.instance = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
                progress_callback: progressCallback
            });
        }
        return this.instance;
    }
}

// Usage
async function classifyText(text) {
    const classifier = await TextClassifier.getInstance((progress) => {
        console.log(\`Loading: \${progress.status} - \${(progress.progress || 0).toFixed(1)}%\`);
    });

    const result = await classifier(text);
    return result;
    // Output: [{ label: 'POSITIVE', score: 0.9998 }]
}

// Example
const sentiment = await classifyText('I love this product!');
console.log(sentiment);
\`\`\`

### TensorFlow.js Example

\`\`\`javascript
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

class ImageClassifier {
    static model = null;

    static async getInstance() {
        if (this.model === null) {
            // Use WebGL backend for GPU acceleration
            await tf.setBackend('webgl');
            this.model = await mobilenet.load({
                version: 2,
                alpha: 1.0
            });
        }
        return this.model;
    }
}

// Usage
async function classifyImage(imageElement) {
    const model = await ImageClassifier.getInstance();
    const predictions = await model.classify(imageElement, 5);
    return predictions;
    // Output: [{ className: 'dog', probability: 0.95 }, ...]
}

// With preprocessing
async function classifyWithPreprocess(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
    });

    return await classifyImage(img);
}
\`\`\`

### Web Worker Implementation

\`\`\`javascript
// worker.js
import { pipeline } from '@xenova/transformers';

let classifier = null;

self.onmessage = async (e) => {
    const { type, data } = e.data;

    if (type === 'init') {
        classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
            progress_callback: (progress) => {
                self.postMessage({ type: 'progress', data: progress });
            }
        });
        self.postMessage({ type: 'ready' });
    }

    if (type === 'classify') {
        const result = await classifier(data);
        self.postMessage({ type: 'result', data: result });
    }
};

// main.js
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

worker.onmessage = (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'progress':
            console.log('Loading:', data);
            break;
        case 'ready':
            console.log('Model ready');
            break;
        case 'result':
            console.log('Classification:', data);
            break;
    }
};

// Initialize
worker.postMessage({ type: 'init' });

// Classify
worker.postMessage({ type: 'classify', data: 'This is great!' });
\`\`\`

---

## React Integration

\`\`\`jsx
import { useState, useEffect, useCallback } from 'react';
import { pipeline } from '@xenova/transformers';

function useAIModel(task, model) {
    const [pipe, setPipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadModel() {
            try {
                const p = await pipeline(task, model, {
                    progress_callback: (prog) => {
                        if (!cancelled) {
                            setProgress(prog.progress || 0);
                        }
                    }
                });

                if (!cancelled) {
                    setPipe(() => p);
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err);
                    setLoading(false);
                }
            }
        }

        loadModel();
        return () => { cancelled = true; };
    }, [task, model]);

    const predict = useCallback(async (input) => {
        if (!pipe) throw new Error('Model not loaded');
        return await pipe(input);
    }, [pipe]);

    return { predict, loading, progress, error };
}

// Usage in component
function SentimentAnalyzer() {
    const { predict, loading, progress, error } = useAIModel(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );
    const [text, setText] = useState('');
    const [result, setResult] = useState(null);

    const analyze = async () => {
        const prediction = await predict(text);
        setResult(prediction[0]);
    };

    if (loading) return <p>Loading model... {progress.toFixed(0)}%</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} />
            <button onClick={analyze}>Analyze</button>
            {result && (
                <p>{result.label}: {(result.score * 100).toFixed(1)}%</p>
            )}
        </div>
    );
}
\`\`\`

---

## Performance Benchmarks

### Inference Time by Device

| Device | Backend | Model Load | Inference |
|--------|---------|------------|-----------|
| MacBook M1 | WebGPU | 2s | 25ms |
| Desktop (RTX 3080) | WebGL | 3s | 15ms |
| iPhone 14 | WebGL | 5s | 80ms |
| Budget Android | WASM | 10s | 300ms |

### Memory Usage

| Model | Download Size | Memory (Loaded) |
|-------|---------------|-----------------|
| DistilBERT (INT8) | 67MB | 150MB |
| MobileNet v2 | 14MB | 40MB |
| Whisper Tiny | 39MB | 100MB |

---

## Caching Strategy

\`\`\`javascript
// Models are cached in IndexedDB by default
// Cache location: browser IndexedDB -> transformers-cache

// Check cache status
const cacheExists = await caches.has('transformers-cache');

// Clear cache if needed
await caches.delete('transformers-cache');

// Custom cache directory (Node.js)
import { env } from '@xenova/transformers';
env.cacheDir = './my-model-cache';
\`\`\`

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGL | ✅ 90+ | ✅ 90+ | ✅ 15+ | ✅ 90+ |
| WebGPU | ✅ 113+ | 🔄 Flag | ❌ | ✅ 113+ |
| WASM SIMD | ✅ 91+ | ✅ 89+ | ✅ 16.4+ | ✅ 91+ |
| SharedArrayBuffer | ✅ | ✅ | ✅ | ✅ |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Slow first load | Model downloading | Pre-cache during build or service worker |
| Out of memory | Model too large | Use quantized (INT8) version |
| CORS error | Cross-origin model | Host models on same domain or use CDN |
| WebGL errors | GPU not available | Fall back to WASM backend |

---

## Related Resources

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [TensorFlow.js Guide](https://www.tensorflow.org/js)
- [Hugging Face Model Hub](https://huggingface.co/models)
`,
  },
  {
    id: "ai-cloud-service",
    name: "AI Cloud Service",
    description: "Cloud-hosted AI APIs, model endpoints",
    icon: "cloud",
    category: "ai",
    content: `# AI Cloud Service Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Endpoint** | \`https://api.example.com/v1/ai\` |
| **Authentication** | Bearer Token |
| **Rate Limit** | 100 req/min (Pro), 10 req/min (Free) |
| **Max Input** | 4096 tokens / 10MB file |

---

## What This Service Does

This cloud AI service provides [describe the capability]. It's optimized for:

- **High accuracy** - State-of-the-art model performance
- **Scalability** - Handles thousands of concurrent requests
- **Low latency** - Average response time < 500ms
- **Enterprise features** - SSO, audit logs, SLA guarantees

---

## API Reference

### Authentication

All requests require a Bearer token in the Authorization header:

\`\`\`bash
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxx
\`\`\`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/v1/completions\` | Generate text completion |
| POST | \`/v1/embeddings\` | Generate text embeddings |
| POST | \`/v1/analyze\` | Analyze text/image |
| GET | \`/v1/models\` | List available models |

---

## Request/Response Examples

### Text Completion

**Request:**

\`\`\`bash
curl -X POST https://api.example.com/v1/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "prompt": "Explain quantum computing in simple terms",
    "max_tokens": 500,
    "temperature": 0.7
  }'
\`\`\`

**Response:**

\`\`\`json
{
  "id": "cmpl-abc123",
  "object": "text_completion",
  "created": 1704067200,
  "model": "gpt-4",
  "choices": [
    {
      "text": "Quantum computing uses quantum mechanics to process information...",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 150,
    "total_tokens": 158
  }
}
\`\`\`

### Generate Embeddings

**Request:**

\`\`\`bash
curl -X POST https://api.example.com/v1/embeddings \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": ["Hello world", "How are you?"]
  }'
\`\`\`

**Response:**

\`\`\`json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0023, -0.0089, 0.0156, ...]
    },
    {
      "object": "embedding",
      "index": 1,
      "embedding": [-0.0045, 0.0123, -0.0078, ...]
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
\`\`\`

---

## SDK Examples

### JavaScript/TypeScript

\`\`\`typescript
import { AIClient } from '@example/ai-sdk';

const client = new AIClient({
  apiKey: process.env.AI_API_KEY,
  baseURL: 'https://api.example.com/v1',
});

// Text completion
async function generateText(prompt: string) {
  const response = await client.completions.create({
    model: 'gpt-4',
    prompt,
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].text;
}

// Streaming completion
async function streamText(prompt: string) {
  const stream = await client.completions.create({
    model: 'gpt-4',
    prompt,
    max_tokens: 500,
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.text || '');
  }
}

// With retry and timeout
async function robustRequest(prompt: string) {
  const response = await client.completions.create(
    {
      model: 'gpt-4',
      prompt,
    },
    {
      timeout: 30000, // 30 seconds
      maxRetries: 3,
    }
  );

  return response;
}
\`\`\`

### Python

\`\`\`python
from example_ai import AIClient
import os

client = AIClient(api_key=os.environ["AI_API_KEY"])

# Synchronous request
def generate_text(prompt: str) -> str:
    response = client.completions.create(
        model="gpt-4",
        prompt=prompt,
        max_tokens=500,
        temperature=0.7
    )
    return response.choices[0].text

# Async request
async def generate_text_async(prompt: str) -> str:
    response = await client.completions.acreate(
        model="gpt-4",
        prompt=prompt,
        max_tokens=500
    )
    return response.choices[0].text

# Streaming
def stream_text(prompt: str):
    stream = client.completions.create(
        model="gpt-4",
        prompt=prompt,
        stream=True
    )
    for chunk in stream:
        print(chunk.choices[0].text, end="", flush=True)
\`\`\`

---

## Parameters

### Common Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| \`model\` | string | Yes | - | Model to use |
| \`prompt\` | string | Yes | - | Input text |
| \`max_tokens\` | integer | No | 100 | Max tokens to generate |
| \`temperature\` | float | No | 1.0 | Randomness (0-2) |
| \`top_p\` | float | No | 1.0 | Nucleus sampling |
| \`stream\` | boolean | No | false | Enable streaming |
| \`stop\` | string[] | No | null | Stop sequences |

### Model Options

| Model | Context | Cost | Speed | Best For |
|-------|---------|------|-------|----------|
| \`gpt-4\` | 8K | $$$$ | Medium | Complex reasoning |
| \`gpt-4-turbo\` | 128K | $$$ | Fast | Long documents |
| \`gpt-3.5-turbo\` | 16K | $ | Very Fast | Simple tasks |

---

## Error Handling

### Error Response Format

\`\`\`json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "type": "rate_limit_error",
    "param": null
  }
}
\`\`\`

### Error Codes

| Code | HTTP Status | Description | Action |
|------|-------------|-------------|--------|
| \`invalid_api_key\` | 401 | Invalid API key | Check credentials |
| \`rate_limit_exceeded\` | 429 | Too many requests | Implement backoff |
| \`context_length_exceeded\` | 400 | Input too long | Reduce input size |
| \`server_error\` | 500 | Internal error | Retry with backoff |

### Retry Strategy

\`\`\`javascript
async function requestWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait and retry
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (error.status >= 500) {
        // Server error - retry with backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error; // Don't retry client errors
    }
  }
  throw new Error('Max retries exceeded');
}
\`\`\`

---

## Rate Limits & Pricing

### Rate Limits by Tier

| Tier | Requests/min | Tokens/min | Monthly Limit |
|------|--------------|------------|---------------|
| Free | 10 | 10,000 | 100,000 tokens |
| Pro | 100 | 100,000 | Unlimited |
| Enterprise | 1,000 | 1,000,000 | Unlimited |

### Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gpt-4 | $30.00 | $60.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| gpt-3.5-turbo | $0.50 | $1.50 |
| text-embedding-3-small | $0.02 | - |

---

## Webhooks (Optional)

For long-running tasks, configure webhooks:

\`\`\`json
{
  "webhook_url": "https://your-app.com/webhook",
  "events": ["completion.done", "completion.failed"]
}
\`\`\`

### Webhook Payload

\`\`\`json
{
  "event": "completion.done",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": "cmpl-abc123",
    "status": "completed",
    "result": { ... }
  }
}
\`\`\`

---

## Best Practices

1. **Use streaming** for long responses to improve perceived latency
2. **Cache embeddings** to avoid re-computing for the same inputs
3. **Implement exponential backoff** for rate limit errors
4. **Set reasonable timeouts** (30-60 seconds for most requests)
5. **Monitor usage** to avoid unexpected billing

---

## Related Resources

- [API Reference](https://docs.example.com/api)
- [SDK Documentation](https://docs.example.com/sdk)
- [Pricing Calculator](https://example.com/pricing)
`,
  },
  {
    id: "file-format",
    name: "File Format",
    description: "Custom file formats, readers, writers",
    icon: "file",
    category: "tools",
    content: `# File Format Specification

## Quick Overview

| Property | Value |
|----------|-------|
| **Extension** | \`.fmt\` |
| **MIME Type** | \`application/x-custom-format\` |
| **Version** | 1.0 |
| **Byte Order** | Little Endian |

---

## Purpose

This file format is designed for [describe purpose]. It provides:

- **Compact storage** - Efficient binary encoding
- **Fast parsing** - O(1) random access to sections
- **Extensibility** - Version-aware structure
- **Integrity** - CRC32 checksums

---

## File Structure

### Overview

\`\`\`
┌────────────────────────────────────────┐
│           Header (16 bytes)            │
├────────────────────────────────────────┤
│        Metadata Block (variable)       │
├────────────────────────────────────────┤
│         Data Block 1 (variable)        │
├────────────────────────────────────────┤
│         Data Block 2 (variable)        │
├────────────────────────────────────────┤
│              ... more blocks           │
├────────────────────────────────────────┤
│           Footer (8 bytes)             │
└────────────────────────────────────────┘
\`\`\`

### Header Structure (16 bytes)

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0 | 4 | char[4] | Magic bytes: "FMT1" |
| 4 | 2 | uint16 | Version (major.minor) |
| 6 | 2 | uint16 | Flags |
| 8 | 4 | uint32 | Block count |
| 12 | 4 | uint32 | Total file size |

**Flags:**

| Bit | Name | Description |
|-----|------|-------------|
| 0 | COMPRESSED | Data blocks are compressed |
| 1 | ENCRYPTED | Data blocks are encrypted |
| 2 | INDEXED | File contains index block |
| 3-15 | Reserved | Must be 0 |

### Block Structure

Each block follows this format:

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0 | 4 | uint32 | Block type |
| 4 | 4 | uint32 | Data size (uncompressed) |
| 8 | 4 | uint32 | Data size (actual) |
| 12 | N | bytes | Block data |
| 12+N | 4 | uint32 | CRC32 checksum |

**Block Types:**

| Type ID | Name | Description |
|---------|------|-------------|
| 0x0001 | META | Metadata (JSON) |
| 0x0002 | DATA | Main data content |
| 0x0003 | INDEX | Search index |
| 0x0004 | THUMB | Thumbnail/preview |
| 0xFFFF | END | End marker |

### Footer Structure (8 bytes)

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0 | 4 | uint32 | File CRC32 |
| 4 | 4 | char[4] | End marker: "END!" |

---

## Implementation

### JavaScript Reader

\`\`\`javascript
class FormatReader {
    constructor(arrayBuffer) {
        this.buffer = arrayBuffer;
        this.view = new DataView(arrayBuffer);
        this.offset = 0;
    }

    readHeader() {
        // Read magic bytes
        const magic = this.readString(4);
        if (magic !== 'FMT1') {
            throw new Error('Invalid file format');
        }

        // Read version
        const majorVersion = this.view.getUint8(this.offset);
        const minorVersion = this.view.getUint8(this.offset + 1);
        this.offset += 2;

        // Read flags
        const flags = this.view.getUint16(this.offset, true);
        this.offset += 2;

        // Read block count
        const blockCount = this.view.getUint32(this.offset, true);
        this.offset += 4;

        // Read file size
        const fileSize = this.view.getUint32(this.offset, true);
        this.offset += 4;

        return {
            version: \`\${majorVersion}.\${minorVersion}\`,
            flags: {
                compressed: !!(flags & 0x01),
                encrypted: !!(flags & 0x02),
                indexed: !!(flags & 0x04),
            },
            blockCount,
            fileSize,
        };
    }

    readBlock() {
        const type = this.view.getUint32(this.offset, true);
        this.offset += 4;

        const uncompressedSize = this.view.getUint32(this.offset, true);
        this.offset += 4;

        const actualSize = this.view.getUint32(this.offset, true);
        this.offset += 4;

        const data = new Uint8Array(this.buffer, this.offset, actualSize);
        this.offset += actualSize;

        const checksum = this.view.getUint32(this.offset, true);
        this.offset += 4;

        // Verify checksum
        const calculatedChecksum = this.crc32(data);
        if (calculatedChecksum !== checksum) {
            throw new Error('Block checksum mismatch');
        }

        return {
            type,
            data,
            uncompressedSize,
        };
    }

    readAllBlocks() {
        const header = this.readHeader();
        const blocks = [];

        for (let i = 0; i < header.blockCount; i++) {
            blocks.push(this.readBlock());
        }

        return { header, blocks };
    }

    readString(length) {
        const bytes = new Uint8Array(this.buffer, this.offset, length);
        this.offset += length;
        return String.fromCharCode(...bytes);
    }

    crc32(data) {
        // CRC32 implementation
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
}

// Usage
const buffer = await file.arrayBuffer();
const reader = new FormatReader(buffer);
const { header, blocks } = reader.readAllBlocks();
console.log('Version:', header.version);
console.log('Blocks:', blocks.length);
\`\`\`

### JavaScript Writer

\`\`\`javascript
class FormatWriter {
    constructor() {
        this.blocks = [];
        this.flags = 0;
    }

    setFlag(flag, value) {
        if (value) {
            this.flags |= flag;
        } else {
            this.flags &= ~flag;
        }
    }

    addBlock(type, data) {
        this.blocks.push({ type, data });
    }

    build() {
        // Calculate total size
        let totalSize = 16; // Header
        for (const block of this.blocks) {
            totalSize += 16 + block.data.length; // Block header + data + checksum
        }
        totalSize += 8; // Footer

        // Create buffer
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        let offset = 0;

        // Write header
        const magic = 'FMT1';
        for (let i = 0; i < 4; i++) {
            view.setUint8(offset + i, magic.charCodeAt(i));
        }
        offset += 4;

        view.setUint8(offset, 1); // Major version
        view.setUint8(offset + 1, 0); // Minor version
        offset += 2;

        view.setUint16(offset, this.flags, true);
        offset += 2;

        view.setUint32(offset, this.blocks.length, true);
        offset += 4;

        view.setUint32(offset, totalSize, true);
        offset += 4;

        // Write blocks
        for (const block of this.blocks) {
            view.setUint32(offset, block.type, true);
            offset += 4;

            view.setUint32(offset, block.data.length, true);
            offset += 4;

            view.setUint32(offset, block.data.length, true);
            offset += 4;

            const dataView = new Uint8Array(buffer, offset, block.data.length);
            dataView.set(block.data);
            offset += block.data.length;

            const checksum = this.crc32(block.data);
            view.setUint32(offset, checksum, true);
            offset += 4;
        }

        // Write footer
        const fileChecksum = this.crc32(new Uint8Array(buffer, 0, offset));
        view.setUint32(offset, fileChecksum, true);
        offset += 4;

        const endMarker = 'END!';
        for (let i = 0; i < 4; i++) {
            view.setUint8(offset + i, endMarker.charCodeAt(i));
        }

        return buffer;
    }

    crc32(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
}

// Usage
const writer = new FormatWriter();

// Add metadata block
const metadata = JSON.stringify({ name: 'Example', created: Date.now() });
writer.addBlock(0x0001, new TextEncoder().encode(metadata));

// Add data block
writer.addBlock(0x0002, new Uint8Array([1, 2, 3, 4, 5]));

// Build and save
const buffer = writer.build();
const blob = new Blob([buffer], { type: 'application/x-custom-format' });
const url = URL.createObjectURL(blob);

const a = document.createElement('a');
a.href = url;
a.download = 'example.fmt';
a.click();
\`\`\`

---

## Validation

### Required Checks

1. ✅ Magic bytes match "FMT1"
2. ✅ Version is supported (1.x)
3. ✅ File size matches header value
4. ✅ Block count matches actual blocks
5. ✅ All block checksums valid
6. ✅ Footer checksum valid
7. ✅ End marker present

---

## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial release |

---

## Tools

- **Validator**: Verify file integrity
- **Inspector**: View file structure
- **Converter**: Convert to/from other formats
`,
  },
  {
    id: "hardware-integration",
    name: "Hardware Integration",
    description: "Device APIs, sensors, camera, WebXR",
    icon: "device-mobile",
    category: "hardware",
    content: `# Hardware Integration Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **APIs Used** | MediaDevices, Sensors, Gamepad |
| **Permissions** | Camera, Microphone, Motion |
| **HTTPS Required** | Yes (production) |
| **Mobile Support** | iOS 15+, Android 8+ |

---

## Capabilities

This integration provides access to:

- **Camera** - Photo capture, video streaming, QR scanning
- **Microphone** - Audio recording, voice commands
- **Sensors** - Accelerometer, gyroscope, magnetometer
- **Location** - GPS coordinates, heading
- **Gamepad** - Controller input

---

## Permission Handling

### Permission Flow

\`\`\`
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Check      │ --> │   Request   │ --> │   Access     │
│   Permission │     │   Permission│     │   Hardware   │
└──────────────┘     └─────────────┘     └──────────────┘
       │                    │                    │
       │ denied             │ denied             │ error
       ↓                    ↓                    ↓
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Show       │     │   Guide to  │     │   Fallback   │
│   Rationale  │     │   Settings  │     │   Mode       │
└──────────────┘     └─────────────┘     └──────────────┘
\`\`\`

### Permission Manager

\`\`\`javascript
class PermissionManager {
    static async check(name) {
        try {
            const result = await navigator.permissions.query({ name });
            return result.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            // Permission API not supported for this permission
            return 'prompt';
        }
    }

    static async request(type) {
        switch (type) {
            case 'camera':
                return this.requestCamera();
            case 'microphone':
                return this.requestMicrophone();
            case 'motion':
                return this.requestMotion();
            case 'location':
                return this.requestLocation();
            default:
                throw new Error(\`Unknown permission type: \${type}\`);
        }
    }

    static async requestCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Clean up
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                return false;
            }
            throw error;
        }
    }

    static async requestMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                return false;
            }
            throw error;
        }
    }

    static async requestMotion() {
        // iOS requires explicit permission
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const result = await DeviceMotionEvent.requestPermission();
                return result === 'granted';
            } catch (error) {
                return false;
            }
        }
        return true; // Other platforms don't require explicit permission
    }

    static async requestLocation() {
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                () => resolve(false)
            );
        });
    }
}
\`\`\`

---

## Camera Access

### Photo Capture

\`\`\`javascript
class CameraCapture {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
    }

    async start(facingMode = 'environment') {
        const constraints = {
            video: {
                facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            await this.video.play();
            return true;
        } catch (error) {
            console.error('Camera access failed:', error);
            return false;
        }
    }

    capturePhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.9);
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.video.srcObject = null;
    }

    async switchCamera() {
        const currentFacing = this.stream
            ?.getVideoTracks()[0]
            ?.getSettings()
            ?.facingMode;

        this.stop();
        await this.start(currentFacing === 'user' ? 'environment' : 'user');
    }
}

// Usage
const video = document.getElementById('camera-preview');
const camera = new CameraCapture(video);

document.getElementById('start-btn').onclick = () => camera.start();
document.getElementById('capture-btn').onclick = () => {
    const photo = camera.capturePhoto();
    document.getElementById('preview').src = photo;
};
document.getElementById('switch-btn').onclick = () => camera.switchCamera();
document.getElementById('stop-btn').onclick = () => camera.stop();
\`\`\`

---

## Motion Sensors

### Device Orientation & Motion

\`\`\`javascript
class MotionSensor {
    constructor() {
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.motion = { x: 0, y: 0, z: 0 };
        this.listeners = [];
    }

    async start() {
        // Request permission on iOS
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Motion permission denied');
            }
        }

        // Start listening
        window.addEventListener('deviceorientation', this.handleOrientation);
        window.addEventListener('devicemotion', this.handleMotion);
    }

    stop() {
        window.removeEventListener('deviceorientation', this.handleOrientation);
        window.removeEventListener('devicemotion', this.handleMotion);
    }

    handleOrientation = (event) => {
        this.orientation = {
            alpha: event.alpha || 0, // Compass direction (0-360)
            beta: event.beta || 0,   // Front-back tilt (-180 to 180)
            gamma: event.gamma || 0, // Left-right tilt (-90 to 90)
        };
        this.notifyListeners('orientation', this.orientation);
    };

    handleMotion = (event) => {
        const accel = event.accelerationIncludingGravity || {};
        this.motion = {
            x: accel.x || 0,
            y: accel.y || 0,
            z: accel.z || 0,
        };
        this.notifyListeners('motion', this.motion);
    };

    onUpdate(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notifyListeners(type, data) {
        this.listeners.forEach(l => l(type, data));
    }
}

// Usage
const sensor = new MotionSensor();

sensor.onUpdate((type, data) => {
    if (type === 'orientation') {
        console.log(\`Compass: \${data.alpha.toFixed(1)}°\`);
        console.log(\`Tilt: \${data.beta.toFixed(1)}° / \${data.gamma.toFixed(1)}°\`);
    }
    if (type === 'motion') {
        console.log(\`Acceleration: \${data.x.toFixed(2)}, \${data.y.toFixed(2)}, \${data.z.toFixed(2)}\`);
    }
});

await sensor.start();
\`\`\`

---

## Geolocation

### Location Tracking

\`\`\`javascript
class LocationTracker {
    constructor() {
        this.watchId = null;
        this.position = null;
    }

    getCurrentPosition(options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        };

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.position = this.formatPosition(position);
                    resolve(this.position);
                },
                reject,
                { ...defaultOptions, ...options }
            );
        });
    }

    startWatching(callback, options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.position = this.formatPosition(position);
                callback(this.position);
            },
            (error) => callback(null, error),
            { ...defaultOptions, ...options }
        );
    }

    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    formatPosition(position) {
        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
        };
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) ** 2 +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }
}

// Usage
const tracker = new LocationTracker();

const position = await tracker.getCurrentPosition();
console.log(\`Location: \${position.latitude}, \${position.longitude}\`);
console.log(\`Accuracy: ±\${position.accuracy}m\`);
\`\`\`

---

## Gamepad API

### Controller Input

\`\`\`javascript
class GamepadController {
    constructor() {
        this.gamepads = {};
        this.onInput = null;
    }

    start() {
        window.addEventListener('gamepadconnected', this.onConnect);
        window.addEventListener('gamepaddisconnected', this.onDisconnect);
        this.poll();
    }

    stop() {
        window.removeEventListener('gamepadconnected', this.onConnect);
        window.removeEventListener('gamepaddisconnected', this.onDisconnect);
    }

    onConnect = (event) => {
        console.log(\`Gamepad connected: \${event.gamepad.id}\`);
        this.gamepads[event.gamepad.index] = event.gamepad;
    };

    onDisconnect = (event) => {
        console.log(\`Gamepad disconnected: \${event.gamepad.id}\`);
        delete this.gamepads[event.gamepad.index];
    };

    poll = () => {
        const gamepads = navigator.getGamepads();

        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            const state = {
                buttons: gamepad.buttons.map((b, i) => ({
                    index: i,
                    pressed: b.pressed,
                    value: b.value,
                })),
                axes: gamepad.axes.map((value, i) => ({
                    index: i,
                    value: Math.abs(value) > 0.1 ? value : 0, // Dead zone
                })),
            };

            if (this.onInput) {
                this.onInput(gamepad.index, state);
            }
        }

        requestAnimationFrame(this.poll);
    };
}

// Usage
const controller = new GamepadController();
controller.onInput = (index, state) => {
    // Check A button (usually index 0)
    if (state.buttons[0]?.pressed) {
        console.log('A button pressed');
    }

    // Check left stick
    const leftX = state.axes[0]?.value || 0;
    const leftY = state.axes[1]?.value || 0;
    if (leftX !== 0 || leftY !== 0) {
        console.log(\`Left stick: \${leftX.toFixed(2)}, \${leftY.toFixed(2)}\`);
    }
};
controller.start();
\`\`\`

---

## Browser Support

| API | Chrome | Firefox | Safari | Mobile |
|-----|--------|---------|--------|--------|
| MediaDevices | ✅ 53+ | ✅ 36+ | ✅ 11+ | ✅ |
| DeviceOrientation | ✅ | ✅ | ✅ (permission) | ✅ |
| DeviceMotion | ✅ | ✅ | ✅ (permission) | ✅ |
| Geolocation | ✅ | ✅ | ✅ | ✅ |
| Gamepad | ✅ 35+ | ✅ 29+ | ✅ 16+ | ❌ |

---

## Platform Notes

### iOS
- Requires HTTPS
- Motion sensors require user gesture to request permission
- Camera permission persists until page refresh

### Android
- Works on HTTP for localhost
- Some OEMs restrict sensor access in background

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Permission denied | User blocked | Guide to settings |
| No camera found | No device | Show file upload fallback |
| Motion events not firing | iOS permission | Request on user gesture |
| GPS inaccurate | Indoor/poor signal | Show accuracy to user |
`,
  },
  {
    id: "design-tool",
    name: "Design Tool",
    description: "Interactive design tools, editors, generators",
    icon: "palette",
    category: "tools",
    content: `# Design Tool Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Type** | Canvas-based Editor |
| **Export Formats** | PNG, SVG, JSON |
| **Max Canvas Size** | 4096 x 4096 |
| **Undo History** | 50 steps |

---

## Features

- **Drawing tools** - Brush, pencil, shapes, text
- **Layer system** - Multiple layers with blend modes
- **Transform tools** - Move, scale, rotate, skew
- **Color picker** - Hex, RGB, HSL, eyedropper
- **Export options** - Multiple formats and resolutions

---

## User Interface

### Layout

\`\`\`
┌────────────────────────────────────────────────────────────┐
│  File  Edit  View  Tools  Help                    [User]   │
├──────┬───────────────────────────────────────────┬─────────┤
│      │                                           │ Layers  │
│ Tool │                                           │ ─────── │
│ bar  │             Canvas                        │ Layer 3 │
│      │                                           │ Layer 2 │
│      │                                           │ Layer 1 │
│      │                                           │         │
│      │                                           │ Props   │
│      │                                           │ ─────── │
│      │                                           │ Color   │
│      │                                           │ Size    │
├──────┴───────────────────────────────────────────┴─────────┤
│  Status: Ready                           Zoom: 100%        │
└────────────────────────────────────────────────────────────┘
\`\`\`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`V\` | Select tool |
| \`B\` | Brush tool |
| \`E\` | Eraser |
| \`R\` | Rectangle |
| \`O\` | Ellipse |
| \`T\` | Text |
| \`Ctrl+Z\` | Undo |
| \`Ctrl+Y\` | Redo |
| \`Ctrl+S\` | Save |
| \`Ctrl+E\` | Export |
| \`Space+Drag\` | Pan canvas |
| \`Ctrl+Scroll\` | Zoom |
| \`[\` / \`]\` | Decrease/increase brush size |

---

## Implementation

### Core Editor Class

\`\`\`javascript
class DesignEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            backgroundColor: options.backgroundColor || '#ffffff',
        };

        this.layers = [];
        this.activeLayer = null;
        this.activeTool = null;
        this.history = [];
        this.historyIndex = -1;

        this.init();
    }

    init() {
        // Create main canvas container
        this.canvasContainer = document.createElement('div');
        this.canvasContainer.style.cssText = \`
            position: relative;
            width: \${this.options.width}px;
            height: \${this.options.height}px;
            background: \${this.options.backgroundColor};
            overflow: hidden;
        \`;
        this.container.appendChild(this.canvasContainer);

        // Create default layer
        this.addLayer('Background');

        // Set up event listeners
        this.setupEvents();
    }

    addLayer(name) {
        const canvas = document.createElement('canvas');
        canvas.width = this.options.width;
        canvas.height = this.options.height;
        canvas.style.cssText = \`
            position: absolute;
            top: 0;
            left: 0;
        \`;

        const layer = {
            id: Date.now().toString(),
            name,
            canvas,
            ctx: canvas.getContext('2d'),
            visible: true,
            opacity: 1,
            blendMode: 'normal',
        };

        this.layers.push(layer);
        this.canvasContainer.appendChild(canvas);
        this.activeLayer = layer;

        return layer;
    }

    removeLayer(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index === -1 || this.layers.length === 1) return;

        const layer = this.layers[index];
        this.canvasContainer.removeChild(layer.canvas);
        this.layers.splice(index, 1);

        if (this.activeLayer.id === layerId) {
            this.activeLayer = this.layers[Math.max(0, index - 1)];
        }
    }

    setTool(toolName) {
        const tools = {
            brush: new BrushTool(this),
            eraser: new EraserTool(this),
            rectangle: new RectangleTool(this),
            ellipse: new EllipseTool(this),
            text: new TextTool(this),
            select: new SelectTool(this),
        };

        this.activeTool = tools[toolName] || tools.brush;
    }

    setupEvents() {
        this.canvasContainer.addEventListener('mousedown', (e) => {
            this.activeTool?.onMouseDown(e);
        });

        this.canvasContainer.addEventListener('mousemove', (e) => {
            this.activeTool?.onMouseMove(e);
        });

        this.canvasContainer.addEventListener('mouseup', (e) => {
            this.activeTool?.onMouseUp(e);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }

    saveState() {
        // Remove future states if we're in the middle of history
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Save current state
        const state = this.layers.map(layer => ({
            id: layer.id,
            imageData: layer.ctx.getImageData(0, 0, this.options.width, this.options.height),
        }));

        this.history.push(state);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex <= 0) return;

        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;

        this.historyIndex++;
        this.restoreState(this.history[this.historyIndex]);
    }

    restoreState(state) {
        for (const layerState of state) {
            const layer = this.layers.find(l => l.id === layerState.id);
            if (layer) {
                layer.ctx.putImageData(layerState.imageData, 0, 0);
            }
        }
    }

    export(format = 'png', quality = 0.92) {
        // Create merged canvas
        const merged = document.createElement('canvas');
        merged.width = this.options.width;
        merged.height = this.options.height;
        const ctx = merged.getContext('2d');

        // Draw background
        ctx.fillStyle = this.options.backgroundColor;
        ctx.fillRect(0, 0, merged.width, merged.height);

        // Draw each visible layer
        for (const layer of this.layers) {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity;
                ctx.globalCompositeOperation = layer.blendMode;
                ctx.drawImage(layer.canvas, 0, 0);
            }
        }

        // Export based on format
        switch (format) {
            case 'png':
                return merged.toDataURL('image/png');
            case 'jpeg':
                return merged.toDataURL('image/jpeg', quality);
            case 'json':
                return JSON.stringify(this.toJSON());
            default:
                return merged.toDataURL('image/png');
        }
    }

    toJSON() {
        return {
            version: '1.0',
            width: this.options.width,
            height: this.options.height,
            backgroundColor: this.options.backgroundColor,
            layers: this.layers.map(layer => ({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
                data: layer.canvas.toDataURL('image/png'),
            })),
        };
    }
}
\`\`\`

### Brush Tool Implementation

\`\`\`javascript
class BrushTool {
    constructor(editor) {
        this.editor = editor;
        this.isDrawing = false;
        this.lastPoint = null;

        // Brush settings
        this.size = 10;
        this.color = '#000000';
        this.opacity = 1;
        this.hardness = 0.5;
    }

    onMouseDown(e) {
        this.isDrawing = true;
        this.lastPoint = this.getPoint(e);
        this.editor.saveState();
    }

    onMouseMove(e) {
        if (!this.isDrawing) return;

        const point = this.getPoint(e);
        this.drawLine(this.lastPoint, point);
        this.lastPoint = point;
    }

    onMouseUp() {
        this.isDrawing = false;
        this.lastPoint = null;
    }

    getPoint(e) {
        const rect = this.editor.canvasContainer.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    drawLine(from, to) {
        const ctx = this.editor.activeLayer.ctx;
        const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
        const steps = Math.ceil(distance / 2);

        for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 0 : i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            this.drawPoint(ctx, x, y);
        }
    }

    drawPoint(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        // Create radial gradient for soft brush
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size / 2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(this.hardness, this.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
\`\`\`

---

## React Component

\`\`\`jsx
import { useRef, useEffect, useState, useCallback } from 'react';

function DesignCanvas({ width = 800, height = 600 }) {
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const [activeTool, setActiveTool] = useState('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [color, setColor] = useState('#000000');

    useEffect(() => {
        if (containerRef.current && !editorRef.current) {
            editorRef.current = new DesignEditor(containerRef.current, {
                width,
                height,
            });
            editorRef.current.setTool('brush');
        }
    }, [width, height]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setTool(activeTool);
        }
    }, [activeTool]);

    useEffect(() => {
        if (editorRef.current?.activeTool) {
            editorRef.current.activeTool.size = brushSize;
        }
    }, [brushSize]);

    useEffect(() => {
        if (editorRef.current?.activeTool) {
            editorRef.current.activeTool.color = color;
        }
    }, [color]);

    const handleExport = useCallback(() => {
        if (editorRef.current) {
            const dataUrl = editorRef.current.export('png');
            const link = document.createElement('a');
            link.download = 'design.png';
            link.href = dataUrl;
            link.click();
        }
    }, []);

    return (
        <div className="design-editor">
            <div className="toolbar">
                <button onClick={() => setActiveTool('brush')}>Brush</button>
                <button onClick={() => setActiveTool('eraser')}>Eraser</button>
                <button onClick={() => setActiveTool('rectangle')}>Rectangle</button>

                <input
                    type="range"
                    min="1"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                />

                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                />

                <button onClick={handleExport}>Export PNG</button>
            </div>

            <div ref={containerRef} className="canvas-container" />
        </div>
    );
}
\`\`\`

---

## Export Formats

| Format | Features | Best For |
|--------|----------|----------|
| PNG | Transparency, lossless | Web graphics, icons |
| JPEG | Small file size | Photos, backgrounds |
| SVG | Vector, scalable | Logos, illustrations |
| JSON | Editable, layers | Save/load projects |

---

## Performance Tips

1. **Limit canvas size** - Max 4096x4096 for good performance
2. **Use offscreen canvas** - For complex operations
3. **Debounce history saves** - Don't save on every stroke
4. **Optimize exports** - Compress images before download
5. **Clear unused layers** - Free memory when not needed
`,
  },
  {
    id: "interactive-demo",
    name: "Interactive Demo",
    description: "Demos, experiments, proof of concepts",
    icon: "player-play",
    category: "tools",
    content: `# Interactive Demo Documentation

## Quick Overview

| Property | Value |
|----------|-------|
| **Type** | [Experiment / Showcase / Tutorial] |
| **Framework** | Vanilla JS / React / Three.js |
| **Browser Support** | Modern browsers |
| **Mobile Support** | Yes / Partial / No |

---

## What This Demo Shows

This interactive demo demonstrates [describe the concept]. You'll learn:

- **Concept 1** - Brief description
- **Concept 2** - Brief description
- **Concept 3** - Brief description

### Try It Now

[Link to live demo or embed below]

\`\`\`html
<!-- Demo embed or screenshot placeholder -->
<iframe src="demo-url" width="100%" height="400"></iframe>
\`\`\`

---

## Controls

### Desktop

| Input | Action |
|-------|--------|
| Click | [Action description] |
| Drag | [Action description] |
| Scroll | [Action description] |
| Spacebar | [Action description] |
| R | Reset demo |

### Mobile

| Gesture | Action |
|---------|--------|
| Tap | [Action description] |
| Swipe | [Action description] |
| Pinch | [Action description] |
| Double-tap | Reset |

---

## How It Works

### The Concept

[Explain the underlying concept in simple terms]

\`\`\`
Visual diagram or ASCII art showing the concept
\`\`\`

### Technical Implementation

\`\`\`javascript
// Core algorithm or technique
class Demo {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.isRunning = false;
    }

    init() {
        // Set up canvas
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Create initial state
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 5 + 2,
            });
        }
    }

    update() {
        // Update simulation
        for (const particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce off walls
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.vx *= -1;
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.vy *= -1;
            }
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles
        this.ctx.fillStyle = '#fff';
        for (const particle of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    loop = () => {
        this.update();
        this.draw();
        if (this.isRunning) {
            requestAnimationFrame(this.loop);
        }
    };

    start() {
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }
}

// Initialize
const canvas = document.getElementById('demo-canvas');
const demo = new Demo(canvas);
demo.init();
demo.start();
\`\`\`

---

## Configuration

### URL Parameters

Customize the demo with URL parameters:

\`\`\`
?count=200        # Number of particles
&speed=2          # Animation speed
&color=ff0000     # Particle color (hex without #)
&size=5           # Base particle size
\`\`\`

Example: \`demo.html?count=500&speed=1.5&color=00ff00\`

### JavaScript API

\`\`\`javascript
// Access demo settings programmatically
demo.settings.count = 200;
demo.settings.speed = 1.5;
demo.restart(); // Apply new settings
\`\`\`

### Available Settings

| Setting | Type | Default | Range | Description |
|---------|------|---------|-------|-------------|
| \`count\` | number | 100 | 10-1000 | Number of elements |
| \`speed\` | number | 1.0 | 0.1-5.0 | Animation speed |
| \`color\` | string | #ffffff | - | Element color |
| \`size\` | number | 5 | 1-20 | Element size |
| \`gravity\` | boolean | false | - | Enable gravity |

---

## Performance

### Benchmarks

| Device | Elements | FPS |
|--------|----------|-----|
| Desktop (modern) | 1000 | 60 |
| Laptop (mid-range) | 500 | 60 |
| Mobile (flagship) | 200 | 60 |
| Mobile (budget) | 100 | 30 |

### Optimization Tips

\`\`\`javascript
// Use object pooling for better performance
class ObjectPool {
    constructor(factory, initialSize = 100) {
        this.factory = factory;
        this.pool = [];

        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }

    get() {
        return this.pool.pop() || this.factory();
    }

    release(obj) {
        this.pool.push(obj);
    }
}
\`\`\`

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Canvas 2D | ✅ | ✅ | ✅ | ✅ |
| RequestAnimationFrame | ✅ | ✅ | ✅ | ✅ |
| Pointer Events | ✅ | ✅ | ✅ (13+) | ✅ |
| Web Audio | ✅ | ✅ | ✅ | ✅ |

---

## Extending the Demo

### Adding New Features

\`\`\`javascript
// Example: Add mouse interaction
class InteractiveDemo extends Demo {
    constructor(canvas) {
        super(canvas);
        this.mouse = { x: 0, y: 0 };

        canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    update() {
        super.update();

        // Add attraction to mouse
        for (const particle of this.particles) {
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 200) {
                particle.vx += dx * 0.001;
                particle.vy += dy * 0.001;
            }
        }
    }
}
\`\`\`

---

## Educational Value

### Concepts Demonstrated

1. **Animation loops** - requestAnimationFrame usage
2. **Physics simulation** - Basic velocity and collision
3. **Canvas rendering** - 2D drawing API
4. **User interaction** - Mouse/touch event handling
5. **Performance** - Object pooling, optimization

### Further Reading

- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [The Nature of Code](https://natureofcode.com/)
- [Animation techniques](https://javascript.info/js-animation)

---

## Known Issues

| Issue | Workaround |
|-------|------------|
| Slow on Safari iOS | Reduce particle count |
| Touch events delayed | Use \`touch-action: none\` CSS |
| High DPI blurry | Scale canvas for devicePixelRatio |

---

## Credits & License

- Created by: [Author name]
- Inspired by: [Original source]
- License: MIT
`,
  },
];

export const templateCategories = [
  { id: "graphics", label: "Graphics & Visual", icon: "palette" },
  { id: "ai", label: "AI & Machine Learning", icon: "brain" },
  { id: "tools", label: "Tools & Utilities", icon: "tool" },
  { id: "hardware", label: "Hardware & Devices", icon: "device-mobile" },
];

export function getTemplateById(id: string): DocTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): DocTemplate[] {
  return templates.filter((t) => t.category === category);
}
