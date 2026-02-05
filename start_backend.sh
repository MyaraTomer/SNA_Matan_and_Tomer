#!/bin/bash
# Quick start script for the backend server

echo "=========================================="
echo "Starting SNA Backend Server"
echo "=========================================="
echo ""

cd "$(dirname "$0")/backend"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate venv
echo "Activating virtual environment..."
source venv/bin/activate

# Check if packages are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    echo "✓ Dependencies installed"
fi

echo ""
echo "Starting FastAPI server..."
echo "API will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --reload --port 8000
