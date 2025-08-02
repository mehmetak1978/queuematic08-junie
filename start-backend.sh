#!/bin/bash

# Queuematic Backend Startup Script
# This script starts the backend server on port 3008

echo "🚀 Starting Queuematic Backend Server..."
echo "📍 Port: 3008"
echo "🌍 Environment: development"
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies!"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in backend directory"
    echo "The server will use default configuration"
fi

# Start the server
echo "🔄 Starting server..."
npm start