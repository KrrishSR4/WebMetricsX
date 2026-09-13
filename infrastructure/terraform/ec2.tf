# Data source to fetch the latest Amazon Linux 2023 AMI for x86_64 architecture
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# EC2 Instance for WMX Backend Service
resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.backend_sg.id]

  # User data script dynamically templated with configuration secrets
  user_data = templatefile("${path.module}/user-data.sh", {
    database_url       = var.database_url
    redis_url          = var.redis_url
    brevo_api_key      = var.brevo_api_key
    brevo_sender_email = var.brevo_sender_email
    brevo_sender_name  = var.brevo_sender_name
    alert_recipient    = var.alert_recipient
    docker_image       = var.docker_image
  })

  # Ensure the root block device has standard sizing
  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "webmetricsx-backend"
    App  = "webmetricsx"
  }
}
