# Import existing Neon project lingering-frog-19169886 into Terraform state
import {
  to = neon_project.webmetricsx
  id = var.neon_project_id
}

# Managed Neon Project (Mapped to existing lingering-frog-19169886)
resource "neon_project" "webmetricsx" {
  name                      = var.neon_project_name
  history_retention_seconds = var.history_retention_days
}

# Branch resource representing the project main branch
resource "neon_branch" "main" {
  project_id = neon_project.webmetricsx.id
  name       = "main"
}

# Database definition inside the main branch of the project
resource "neon_database" "webmetricsx" {
  project_id = neon_project.webmetricsx.id
  branch_id  = neon_branch.main.id
  name       = var.pg_database_name
  owner_name = "neondb_owner"
}
