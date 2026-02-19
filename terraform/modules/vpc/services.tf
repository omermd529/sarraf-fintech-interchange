# List of APIs required for a FinTech GKE Stack
locals {
  services = [
    "compute.googleapis.com",    # For VPCs and VMs
    "container.googleapis.com",  # For GKE
    "sqladmin.googleapis.com",   # For Cloud SQL (Sarraf Database)
    "iam.googleapis.com",        # For Service Accounts
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.services)
  project  = var.project_id
  service  = each.value

  # Recommended: Keeps APIs active if you destroy other resources
  disable_on_destroy = false 
}