# Import existing Neon project lingering-frog-19169886 into Terraform state
import {
  to = neon_project.webmetricsx
  id = var.neon_project_id
}

# Managed Neon Project (Mapped to existing lingering-frog-19169886)
resource "neon_project" "webmetricsx" {
  name                      = var.neon_project_name
  history_retention_seconds = var.history_retention_days

  lifecycle {
    ignore_changes = [org_id, history_retention_seconds]
  }
}

# Neon branch and database are managed directly on the Neon Console to avoid compute auto-suspension errors
