# Deployment Guide - Translink Solutions 3D Truck Simulation

## Prerequisites

- Node.js 18.20.8 (specified in `.nvmrc`)
- npm or yarn package manager
- Git repository with all files committed

## Netlify Deployment Configuration

### Required Files

Ensure these files are committed to your repository:

- ✅ `package.json` - Build scripts and dependencies
- ✅ `netlify.toml` - Netlify configuration
- ✅ `.nvmrc` - Node version specification
- ✅ `vite.config.ts` - Vite build configuration
- ✅ All source files in `src/`
- ✅ All public assets in `public/`

### Netlify Site Settings

**Option 1: Using netlify.toml (Recommended)**

The `netlify.toml` file in the repository root contains all necessary configuration:

```toml
[build]
  base = "."
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NODE_ENV = "production"
```

**Option 2: Manual UI Configuration**

If you need to configure via Netlify UI:

1. Go to **Site settings** → **Build & deploy** → **Continuous Deployment**
2. Set **Build settings**:
   - **Base directory**: `.` (or leave blank for root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Set **Environment variables**:
   - `NODE_VERSION`: `18`
   - `NODE_ENV`: `production`

### Build Process

The build runs these steps automatically:

1. **Prebuild** (`npm run prebuild`):
   - Runs `npm run compress` which includes:
     - `compress:models` - Compresses GLB models with Draco
     - `compress:textures` - Optimizes textures to WebP

2. **Build** (`npm run build`):
   - Runs Vite production build
   - Outputs to `dist/` directory
   - Minifies and optimizes all assets

### Expected Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].css
│   ├── index-[hash].js
│   ├── react-vendor-[hash].js
│   └── three-[hash].js
├── model/
│   └── compressed/
│       └── Main_truck_updated_compressed.glb
├── optimized/
│   ├── logo.webp
│   ├── logo-front-truck.webp
│   └── Logo-white.webp
└── draco/
    ├── draco_decoder.wasm
    └── draco_wasm_wrapper.js
```

## Local Testing

Before deploying, test the production build locally:

```bash
# Install dependencies
npm ci

# Run production build
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:4173` to test the production build.

## Troubleshooting

### Build Fails: "Custom build path detected. Proceeding with the specified path: ''"

**Cause**: Netlify UI has an empty base directory configured.

**Solution**:
1. Check `netlify.toml` has `base = "."` in the `[build]` section
2. Or in Netlify UI, set Base directory to `.` or leave blank
3. Clear cache and redeploy: **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

### Build Fails: "package.json not found"

**Cause**: `package.json` is not committed to the repository.

**Solution**:
```bash
git add package.json
git commit -m "Add package.json"
git push
```

### Build Fails: Node version mismatch

**Cause**: Wrong Node.js version being used.

**Solution**:
1. Ensure `.nvmrc` contains `18.20.8`
2. Or set `NODE_VERSION = "18"` in netlify.toml
3. Redeploy

### Build Fails: Compression errors

**Cause**: Source GLB files missing.

**Solution**: The compression scripts now skip if compressed files already exist. Ensure compressed files are committed:
```bash
git add public/model/compressed/
git add public/optimized/
git commit -m "Add compressed assets"
git push
```

### 3D Scene Not Rendering in Production

**Cause**: Asset paths or transform issues.

**Solution**:
1. Check browser console for errors
2. Verify all assets are in `dist/` after build
3. Check Network tab for 404 errors
4. Use diagnostic overlay: Add `?debug=true` to URL

### Transform Discrepancies Between Local and Production

**Cause**: CSS not loaded before scene initialization.

**Solution**: The `SceneInitializer` now handles this automatically:
- Waits for CSS to load
- Validates transforms against `objectTransforms.json`
- Logs validation errors to console

Check console for validation warnings.

## Performance Optimization

The build includes these optimizations:

- ✅ **Draco compression** for GLB models (~60% size reduction)
- ✅ **WebP conversion** for images (~90% size reduction)
- ✅ **Code splitting** (React, Three.js, app code)
- ✅ **Minification** with Terser
- ✅ **Tree shaking** to remove unused code
- ✅ **Asset caching** with long-lived cache headers

## Monitoring

After deployment, verify:

1. **Load Time**: Should be < 3s on 3G
2. **FPS**: Should maintain 60 FPS
3. **Asset Sizes**:
   - Main JS bundle: ~105 KB (gzipped: ~31 KB)
   - Three.js: ~529 KB (gzipped: ~131 KB)
   - React vendor: ~139 KB (gzipped: ~45 KB)
4. **3D Model**: ~2-3 MB compressed

## Cache Headers

Configured in `netlify.toml`:

- **Static assets** (`/assets/*`): 1 year cache
- **3D models** (`/model/*`): 1 year cache
- **HTML files**: No cache (always fresh)

## Security Headers

Configured in `netlify.toml`:

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Support

If deployment issues persist:

1. Check Netlify build logs for specific errors
2. Test build locally with `npm run build`
3. Verify all required files are committed
4. Clear Netlify cache and redeploy
5. Check browser console for runtime errors

## Quick Deploy Checklist

- [ ] All files committed to Git
- [ ] `package.json` exists and is committed
- [ ] `netlify.toml` has correct configuration
- [ ] `.nvmrc` specifies Node 18.20.8
- [ ] Local build succeeds (`npm run build`)
- [ ] Compressed assets exist in `public/`
- [ ] Netlify site settings match `netlify.toml`
- [ ] Environment variables set (if needed)
- [ ] Clear cache before deploying
- [ ] Monitor build logs for errors
- [ ] Test deployed site in browser
- [ ] Check console for errors
- [ ] Verify 3D scene renders correctly
- [ ] Test on mobile devices
