#!/bin/bash

# Translink Fuel Level Sensor Pro - Deployment Script
# This script prepares and deploys the project to Netlify

echo "🚛 Translink Fuel Level Sensor Pro - Deployment Script"
echo "=================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    git branch -M main
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check errors above."
    exit 1
fi

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo ""
    echo "⚠️  Netlify CLI not found. Installing..."
    npm install -g netlify-cli
    echo "✅ Netlify CLI installed"
fi

# Deploy to Netlify
echo ""
echo "🚀 Deploying to Netlify..."
echo ""
echo "Choose deployment method:"
echo "1) Deploy to production"
echo "2) Deploy preview (draft)"
echo "3) Skip deployment"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        netlify deploy --prod
        echo ""
        echo "✅ Deployed to production!"
        ;;
    2)
        netlify deploy
        echo ""
        echo "✅ Preview deployed!"
        ;;
    3)
        echo "⏭️  Skipping deployment"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "🎉 Deployment process complete!"
echo ""
echo "Next steps:"
echo "1. Visit your Netlify dashboard to see the live site"
echo "2. Test all features on the deployed site"
echo "3. Share the URL with your team"
echo ""
