#!/bin/bash
# Enable logging for debugging user data execution
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== START WMX BOOTSTRAP SYSTEM ==="

# Update package manager repositories
dnf update -y

# Install Docker
echo "Installing Docker..."
dnf install -y docker

# Enable and start Docker service
echo "Starting Docker..."
systemctl enable docker
systemctl start docker

# Create application directory
mkdir -p /app

# Provision env file with interpolated secrets from Terraform
echo "Creating application environment file..."
cat <<'EOF' > /app/.env
PORT=8081
ENVIRONMENT=production
CORS_ALLOWED_ORIGINS=https://webmetricsx.web.app
DATABASE_URL=${database_url}
REDIS_URL=${redis_url}
BREVO_API_KEY=${brevo_api_key}
BREVO_SENDER_EMAIL=${brevo_sender_email}
BREVO_SENDER_NAME=${brevo_sender_name}
ALERT_RECIPIENT=${alert_recipient}
EOF

# Ensure secure file permissions
chmod 600 /app/.env

# Pull latest Docker image from Docker Hub
echo "Pulling Docker Hub image: ${docker_image}..."
docker pull ${docker_image}

# Stop and remove existing container if it exists (for restarts/updates)
if [ "$(docker ps -aq -f name=webmetricsx-backend)" ]; then
    echo "Stopping and removing existing WMX container..."
    docker stop webmetricsx-backend
    docker rm webmetricsx-backend
fi

# Spin up WMX backend container with automatic restart policies
echo "Starting WMX Go Backend container on port 8081..."
docker run -d \
  --name webmetricsx-backend \
  --restart unless-stopped \
  -p 8081:8081 \
  --env-file /app/.env \
  ${docker_image}

echo "=== WMX BOOTSTRAP COMPLETE ==="
