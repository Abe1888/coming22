# 3D Truck Visualization

An interactive 3D truck visualization application built with React, Three.js, and TypeScript.

## Features

- Interactive 3D truck model with realistic physics
- Telematics data visualization
- Wireframe overlay with customizable curvature
- Wheel animations
- Audio feedback system
- Export functionality for sharing visualizations
- Model testing page with support for GLB, GLTF, FBX, and OBJ file uploads

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
├── public/          # Static assets
├── src/             # Source files
├── dist/            # Production build
├── docs-backup/     # Documentation files
└── Backup/          # Project backups
```

## Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Asset Compression
```bash
npm run compress:models    # Compress 3D models with Draco
npm run compress:textures  # Optimize images to WebP
npm run compress           # Run all compression
```

### Validation
```bash
npm run validate              # Run all validation checks
npm run validate:checksums    # Validate asset integrity
npm run validate:bundle       # Analyze bundle size
npm run validate:compression  # Verify compression
```

### Testing
```bash
npm run test              # Run all tests
npm run test:visual       # Run visual regression tests
npm run test:baselines    # Generate baseline screenshots
npm run test:ui           # Run tests in UI mode
npm run perf              # Run performance tests (desktop)
npm run perf:mobile       # Run performance tests (mobile)
```

## Deployment

### Automated Deployment (GitHub Actions)

The project uses GitHub Actions for automated deployment to Netlify:

1. **Push to main branch** triggers automatic deployment
2. **Quality gates** run before deployment:
   - Build validation (checksums, bundle analysis, compression)
   - Visual regression tests
   - Performance tests (Lighthouse CI)
3. **Deployment** only proceeds if all checks pass

### Manual Deployment

```bash
# 1. Build the application
npm run build

# 2. Validate the build
npm run validate

# 3. Deploy to Netlify
netlify deploy --prod
```

### Environment Variables

Required secrets for GitHub Actions:
- `NETLIFY_AUTH_TOKEN` - Netlify authentication token
- `NETLIFY_SITE_ID` - Netlify site ID

### Performance Thresholds

The deployment pipeline enforces strict performance standards:
- **FCP** (First Contentful Paint): ≤ 2000ms
- **LCP** (Largest Contentful Paint): ≤ 3000ms
- **TTI** (Time to Interactive): ≤ 5000ms
- **TBT** (Total Blocking Time): ≤ 300ms
- **CLS** (Cumulative Layout Shift): ≤ 0.1
- **Performance Score**: ≥ 85%

## Diagnostic Tools

### Debug Mode

Enable diagnostic overlay by adding `?debug=true` to the URL:
```
https://your-site.com/?debug=true
```

This displays:
- Real-time FPS and performance metrics
- 3D object transforms
- Asset loading metrics
- Camera information

### Performance Monitoring

Performance metrics are automatically tracked:
```typescript
import { performanceMonitor } from './utils/monitoring';

// Get metrics
const metrics = performanceMonitor.getMetrics();
const summary = performanceMonitor.getSummary();
```

### Error Tracking

Errors are automatically tracked and logged:
```typescript
import { errorTracker } from './utils/errorTracking';

// Get errors
const errors = errorTracker.getErrors();
const summary = errorTracker.getSummary();
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- [Asset Compression](./docs/ASSET_COMPRESSION.md) - How to compress 3D models and textures
- [Build Validation](./docs/BUILD_VALIDATION.md) - Understanding the validation system
- [Diagnostic Tools](./docs/DIAGNOSTIC_TOOLS.md) - Debugging and monitoring tools
- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions

## Troubleshooting

### Build Failures

If the build fails validation:
```bash
# Check what failed
npm run validate

# Fix compression issues
npm run compress

# Rebuild
npm run build
```

### Performance Issues

If performance tests fail:
1. Check Lighthouse report in CI artifacts
2. Optimize assets (compress images, reduce model complexity)
3. Enable code splitting
4. Lazy load heavy components

### Visual Regression Failures

If visual tests fail:
1. Review diff images in CI artifacts
2. If changes are intentional, update baselines:
   ```bash
   npm run test:baselines
   ```
3. Commit new baselines to repository

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests locally: `npm run test`
4. Run validation: `npm run validate`
5. Create a pull request
6. Wait for CI checks to pass

## CI/CD Pipeline

The project uses three GitHub Actions workflows:

1. **Visual Regression** (`.github/workflows/visual-regression.yml`)
   - Runs on push and PR
   - Captures screenshots at different camera phases
   - Compares against baselines

2. **Performance Testing** (`.github/workflows/performance.yml`)
   - Runs on push and PR
   - Audits with Lighthouse CI
   - Enforces performance thresholds

3. **Deployment** (`.github/workflows/deploy.yml`)
   - Runs on push to main
   - Builds and validates
   - Runs all tests
   - Deploys to Netlify if all checks pass

## License

All rights reserved.
