#!/bin/bash
# Bash Script to Download Files from EC2
# Run this script to download the 3 files from EC2

echo "=== Downloading Files from EC2 ==="
echo ""

# Configuration
EC2_USER="ubuntu"
EC2_HOST="107.20.87.206"
EC2_BACKEND_PATH="~/fami-backend"
LOCAL_BACKEND_PATH="fami-app/backend"

# Check if local backend directory exists
if [ ! -d "$LOCAL_BACKEND_PATH" ]; then
    echo "❌ Local backend directory not found: $LOCAL_BACKEND_PATH"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Create utils directory if it doesn't exist
mkdir -p "$LOCAL_BACKEND_PATH/utils"

echo "Files to download:"
echo "  1. server.js"
echo "  2. utils/getBaseUrl.js"
echo "  3. utils/getClientUrl.js"
echo ""

# Function to download file
download_file() {
    local remote_path=$1
    local local_path=$2
    
    echo "Downloading: $remote_path"
    
    scp "${EC2_USER}@${EC2_HOST}:${remote_path}" "$local_path" 2>/dev/null
    
    if [ -f "$local_path" ]; then
        echo "  ✅ Downloaded: $local_path"
        return 0
    else
        echo "  ❌ Failed to download: $remote_path"
        return 1
    fi
}

# Download files
echo "Starting downloads..."
echo ""

SUCCESS=true

# 1. Download server.js
if ! download_file "$EC2_BACKEND_PATH/server.js" "$LOCAL_BACKEND_PATH/server.js"; then
    SUCCESS=false
fi

# 2. Download getBaseUrl.js
if ! download_file "$EC2_BACKEND_PATH/utils/getBaseUrl.js" "$LOCAL_BACKEND_PATH/utils/getBaseUrl.js"; then
    SUCCESS=false
fi

# 3. Download getClientUrl.js
if ! download_file "$EC2_BACKEND_PATH/utils/getClientUrl.js" "$LOCAL_BACKEND_PATH/utils/getClientUrl.js"; then
    SUCCESS=false
fi

echo ""
if [ "$SUCCESS" = true ]; then
    echo "✅ All files downloaded successfully!"
    echo ""
    echo "Files saved to:"
    echo "  - $LOCAL_BACKEND_PATH/server.js"
    echo "  - $LOCAL_BACKEND_PATH/utils/getBaseUrl.js"
    echo "  - $LOCAL_BACKEND_PATH/utils/getClientUrl.js"
else
    echo "⚠️  Some files failed to download"
    echo "You may need to use WinSCP or SSH to download manually"
fi
