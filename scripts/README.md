# Asset Compression Scripts

This directory contains scripts for compressing 3D models and textures to optimize load times.

## Prerequisites

Install the required dependencies:

```bash
npm install
```

This will install:
- `@gltf-transform/core` - GLTF manipulation library
- `@gltf-transform/functions` - Compression functions
- `draco3dgltf` - Draco compression codec
- `sharp` - Image processing library

## Usage

### Compress All Assets

```bash
npm run compress
```

This runs both model and texture compression.

### Compress Models Only

```bash
npm run compress:models
```

Compresses GLB files using Draco compression:
- Input: `public/model/*.glb`
- Output: `public/model/compressed/*.glb`
- Expected reduction: ~60%

### Compress Textures Only

```bash
npm run compress:textures
```

Optimizes PNG/JPG images and generates WebP versions:
- Input: `public/**/*.{png,jpg,jpeg}`
- Output: `public/optimized/**/*`
- Expected reduction: ~50%

## Configuration

### Model Compression (`compress-models.js`)

```javascript
dracoOptions: {
  method: 'edgebreaker',
  encodeSpeed: 5,
  decodeSpeed: 5,
  quantizationBits: {
    POSITION: 14,      // High precision
    NORMAL: 10,        // Medium precision
    COLOR: 8,          // Standard precision
    TEX_COORD: 12,     // High precision
    GENERIC: 12        // High precision
  }
}
```

### Texture Compression (`compress-textures.js`)

```javascript
{
  quality: 85,              // JPEG/WebP quality (0-100)
  generateWebP: true,       // Create WebP versions
  generateMipmaps: false    // Handled by Three.js at runtime
}
```

## Build Integration

Compression runs automatically before each build:

```bash
npm run build
```

This executes:
1. `npm run compress` (prebuild hook)
2. `vite build`

## Manual Compression (Alternative)

If you prefer to use CLI tools directly:

### Using gltf-transform CLI

```bash
# Install globally
npm install -g @gltf-transform/cli

# Compress a model
gltf-transform draco public/model/truck.glb public/model/compressed/truck.glb
```

### Using sharp CLI

```bash
# Install globally
npm install -g sharp-cli

# Optimize an image
sharp -i public/logo.png -o public/optimized/logo.png --quality 85
```

## Verification

After compression, verify the results:

1. **Check file sizes**:
   ```bash
   ls -lh public/model/compressed/
   ls -lh public/optimized/
   ```

2. **Test in browser**:
   ```bash
   npm run preview
   ```

3. **Verify Draco extension**:
   Open the compressed GLB in a text editor and look for `"KHR_draco_mesh_compression"` in the extensions list.

## Troubleshooting

### "Module not found" errors

Run `npm install` to ensure all dependencies are installed.

### Compression ratio below target

- The file may already be compressed
- The model may have few vertices
- Try adjusting quantization bits in the config

### Out of memory errors

For very large models:
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run compress:models`
- Process models individually

## Performance Impact

Expected improvements after compression:

| Asset Type | Original Size | Compressed Size | Reduction | Load Time (3G) |
|------------|---------------|-----------------|-----------|----------------|
| GLB Model  | 1.5 MB        | ~600 KB         | 60%       | 2s → 0.8s      |
| Textures   | 500 KB        | ~250 KB         | 50%       | 1.5s → 0.75s   |

**Total improvement**: ~2.5s faster on 3G connections
