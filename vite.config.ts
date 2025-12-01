import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { assetManifestPlugin } from './vite-plugins/assetManifestPlugin';

export default defineConfig({
  plugins: [
    react(),
    assetManifestPlugin()
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Keep console in dev
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2 // Multiple passes for better compression
      },
      mangle: {
        safari10: true // Fix Safari 10 issues
      },
      format: {
        comments: false // Remove all comments
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Three.js and related
          if (id.includes('three')) {
            return 'three';
          }
          // React and React DOM
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // GSAP animation library
          if (id.includes('gsap')) {
            return 'gsap';
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Node modules (other vendors)
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000, // 1MB warning limit
    sourcemap: false, // Disable source maps in production
    cssCodeSplit: true, // Split CSS into separate files
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    reportCompressedSize: true, // Report compressed sizes
    cssMinify: true // Minify CSS
  },
  optimizeDeps: {
    include: ['three', 'react', 'react-dom', 'gsap']
  }
});
