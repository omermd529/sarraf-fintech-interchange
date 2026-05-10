# List of APIs required for a FinTech GKE Stack
locals {
  services = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "iam.googleapis.com",
    "certificatemanager.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "artifactregistry.googleapis.com",
    "gkehub.googleapis.com",
    "connectgateway.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.services)
  project  = var.project_id
  service  = each.value

  # Recommended: Keeps APIs active if you destroy other resources
  disable_on_destroy = false
}