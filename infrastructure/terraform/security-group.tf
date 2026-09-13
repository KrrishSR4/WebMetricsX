# Security Group configuration for WMX backend EC2 instance
resource "aws_security_group" "backend_sg" {
  name        = "webmetricsx-backend-sg"
  description = "Security Group for WMX Go Backend EC2 instance"

  ingress {
    description = "SSH access from anywhere for administration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow incoming API requests to WMX Go backend on 8081"
    from_port   = 8081
    to_port     = 8081
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "webmetricsx-backend-sg"
    App  = "webmetricsx"
  }
}
