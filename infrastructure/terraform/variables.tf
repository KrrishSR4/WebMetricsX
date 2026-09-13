variable "neon_api_key" {
  type        = string
  description = "Neon API key for managing infrastructure. Set via TF_VAR_neon_api_key or terraform.tfvars."
  sensitive   = true
}

variable "neon_project_id" {
  type        = string
  description = "The existing Neon project ID"
  default     = "lingering-frog-19169886"
}

variable "neon_project_name" {
  type        = string
  description = "The name of the Neon project"
  default     = "WebMetricsX"
}

variable "pg_database_name" {
  type        = string
  description = "The main PostgreSQL database name for WebMetricsX telemetry and monitoring state"
  default     = "webmetricsx"
}

variable "history_retention_days" {
  type        = number
  description = "History retention period in seconds (default 1 day = 86400)"
  default     = 86400
}

variable "aws_region" {
  type        = string
  description = "AWS region for WMX EC2 deployment"
  default     = "ap-south-1"
}

variable "instance_type" {
  type        = string
  description = "EC2 Instance type (Free Tier eligible)"
  default     = "t2.micro"
}

variable "docker_image" {
  type        = string
  description = "The backend Docker Hub image tag to pull and run"
  default     = "krrishsr4/webmetricsx-backend:latest"
}

variable "redis_url" {
  type        = string
  description = "Redis connection string"
  default     = "redis://localhost:6379/0"
}

variable "brevo_sender_email" {
  type        = string
  description = "Brevo sender email address"
  default     = "krishmishra4444@gmail.com"
}

variable "brevo_sender_name" {
  type        = string
  description = "Brevo sender name"
  default     = "WebMetricsX"
}

variable "alert_recipient" {
  type        = string
  description = "Default alert email recipient"
  default     = "krishmishra4444@gmail.com"
}

variable "brevo_api_key" {
  type        = string
  description = "Brevo Transactional Email API Key"
  sensitive   = true
}

variable "database_url" {
  type        = string
  description = "Neon PostgreSQL connection string"
  sensitive   = true
}
