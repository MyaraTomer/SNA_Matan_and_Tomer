#!/bin/bash
# Quick start script for the frontend

echo "=========================================="
echo "Starting SNA Frontend"
echo "=========================================="
echo ""

cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
    echo "✓ Dependencies installed"
fi

echo ""
echo "Starting Vite development server..."
echo "Frontend will be available at: http://localhost:5173"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
