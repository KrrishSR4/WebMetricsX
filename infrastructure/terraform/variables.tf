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
