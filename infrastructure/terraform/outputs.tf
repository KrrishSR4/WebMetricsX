output "neon_project_id" {
  value       = neon_project.webmetricsx.id
  description = "The ID of the Neon PostgreSQL project"
}

output "neon_project_name" {
  value       = neon_project.webmetricsx.name
  description = "The name of the Neon PostgreSQL project"
}

output "ec2_instance_id" {
  value       = aws_instance.backend.id
  description = "The ID of the EC2 backend instance"
}

output "ec2_public_ip" {
  value       = aws_instance.backend.public_ip
  description = "The public IP of the EC2 backend instance"
}

output "backend_url" {
  value       = "http://${aws_instance.backend.public_ip}:8081"
  description = "The API base URL for the WMX Go backend"
}

output "security_group_id" {
  value       = aws_security_group.backend_sg.id
  description = "The ID of the backend security group"
}
