#!/bin/bash
# ============================================
# SSL Certificate Setup Script for etcha.app
# ============================================
# This script obtains SSL certificates from Let's Encrypt
# Run this once on initial server setup

set -e

# Configuration
DOMAIN="etcha.app"
EMAIL="${SSL_EMAIL:-admin@etcha.app}"
STAGING="${SSL_STAGING:-0}"  # Set to 1 for testing

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Certificate Setup for ${DOMAIN}${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: Not running as root. Some operations may fail.${NC}"
fi

# Create directories
echo -e "\n${GREEN}Creating certificate directories...${NC}"
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Check if certificates already exist
if [ -d "./certbot/conf/live/${DOMAIN}" ]; then
    echo -e "${YELLOW}Certificates already exist for ${DOMAIN}${NC}"
    read -p "Do you want to renew them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 0
    fi
fi

# Use initial nginx config (HTTP only)
echo -e "\n${GREEN}Setting up initial Nginx config (HTTP only)...${NC}"
cp ./nginx/nginx.initial.conf ./nginx/nginx.conf.tmp
mv ./nginx/nginx.conf ./nginx/nginx.conf.ssl
mv ./nginx/nginx.conf.tmp ./nginx/nginx.conf

# Start nginx with HTTP config
echo -e "\n${GREEN}Starting Nginx...${NC}"
docker compose up -d nginx

# Wait for nginx to start
sleep 5

# Check if nginx is running
if ! docker compose ps nginx | grep -q "Up"; then
    echo -e "${RED}Error: Nginx failed to start${NC}"
    docker compose logs nginx
    exit 1
fi

echo -e "\n${GREEN}Nginx started successfully${NC}"

# Staging flag
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    echo -e "${YELLOW}Using Let's Encrypt staging server (for testing)${NC}"
    STAGING_FLAG="--staging"
fi

# Obtain certificates
echo -e "\n${GREEN}Obtaining SSL certificates from Let's Encrypt...${NC}"
echo -e "Domain: ${DOMAIN}"
echo -e "Email: ${EMAIL}"

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    ${STAGING_FLAG}

# Check if certificates were obtained
if [ ! -f "./certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${RED}Error: Failed to obtain certificates${NC}"
    # Restore original config
    mv ./nginx/nginx.conf.ssl ./nginx/nginx.conf
    docker compose restart nginx
    exit 1
fi

echo -e "\n${GREEN}Certificates obtained successfully!${NC}"

# Switch to SSL config
echo -e "\n${GREEN}Switching to SSL Nginx config...${NC}"
mv ./nginx/nginx.conf.ssl ./nginx/nginx.conf

# Restart nginx with SSL config
echo -e "\n${GREEN}Restarting Nginx with SSL...${NC}"
docker compose restart nginx

# Wait and verify
sleep 5

if docker compose ps nginx | grep -q "Up"; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  SSL Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "\nYour site is now available at:"
    echo -e "  - https://${DOMAIN}"
    echo -e "  - https://www.${DOMAIN}"
    echo -e "\nCertificates are stored in: ./certbot/conf/live/${DOMAIN}/"
    echo -e "\nTo enable auto-renewal, start certbot service:"
    echo -e "  docker compose --profile ssl up -d certbot"
else
    echo -e "${RED}Error: Nginx failed to start with SSL config${NC}"
    docker compose logs nginx
    exit 1
fi
