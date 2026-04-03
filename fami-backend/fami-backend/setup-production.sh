#!/bin/bash

APP_DIR="/home/ubuntu/fami-backend"
APP_NAME="fami-backend"
APP_FILE="server.js"

echo "Updating system..."
sudo apt update -y

echo "Installing Nginx..."
sudo apt install -y nginx

echo "Installing PM2..."
sudo npm install -g pm2

echo "Stopping any existing PM2 app..."
pm2 delete $APP_NAME 2>/dev/null

echo "Starting app with PM2..."
cd $APP_DIR
pm2 start $APP_FILE --name $APP_NAME

echo "Saving PM2 config..."
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "Configuring Nginx reverse proxy..."

sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF'

echo "Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "Done ✅"
echo "Your backend is now running via PM2 and accessible on port 80."
echo "You can access it using: http://YOUR_PUBLIC_IP"
