output "neon_project_id" {
  value       = neon_project.webmetricsx.id
  description = "The ID of the Neon PostgreSQL project"
}

output "neon_project_name" {
  value       = neon_project.webmetricsx.name
  description = "The name of the Neon PostgreSQL project"
}

output "neon_main_branch_id" {
  value       = neon_branch.main.id
  description = "The ID of the main branch in Neon"
}

output "database_name" {
  value       = neon_database.webmetricsx.name
  description = "The application database name"
}
