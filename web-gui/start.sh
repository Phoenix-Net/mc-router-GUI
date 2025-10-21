#!/bin/sh

# Function to handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $WEB_GUI_PID 2>/dev/null
    kill $MC_ROUTER_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap shutdown SIGTERM SIGINT

# Start mc-router in the background
echo "Starting mc-router..."
mc-router \
    -port=${PORT:-25565} \
    -api-binding=${API_BINDING:-0.0.0.0:8080} \
    -debug=${DEBUG:-false} \
    -connection-rate-limit=${CONNECTION_RATE_LIMIT:-1} \
    ${DEFAULT:+-default $DEFAULT} \
    ${MAPPING:+-mapping "$MAPPING"} &

MC_ROUTER_PID=$!

# Wait a moment for mc-router to start
sleep 2

# Start the web GUI in the background
cd /app/web-gui
echo "Starting web GUI..."
node dist/server.js &
WEB_GUI_PID=$!

echo "MC-Router with GUI started!"
echo "Web GUI available at: http://localhost:${GUI_PORT:-3000}"
echo "MC-Router listening on port: ${PORT:-25565}"
echo "MC-Router API available at: http://localhost:8080"

# Wait for either process to exit
wait