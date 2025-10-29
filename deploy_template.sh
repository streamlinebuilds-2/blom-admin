#!/bin/bash
set -e

# Ensure the SDK is built before deployment
echo "Building SDK..."
cd sdk
npm install --legacy-peer-deps
npm run build
cd ..

# Commit and push changes
echo "Committing and pushing changes..."
git add .
git commit -m "deploy"
git push origin main

# Build and deploy the e2b template
echo "Building and deploying e2b template..."
cd e2b_template && e2b template build -c "npm run dev"
