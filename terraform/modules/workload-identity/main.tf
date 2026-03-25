data "google_project" "project" {
  project_id = var.project_id
}

resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_condition = "assertion.repository == '${var.github_org}/${var.github_repo}'"
}

resource "google_service_account" "github_actions" {
  project      = var.project_id
  account_id   = "github-actions-${var.environment}"
  display_name = "GitHub Actions ${title(var.environment)}"
  description  = "Service account for GitHub Actions in ${var.environment} environment"
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset(var.service_account_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.project.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/attribute.repository/${var.github_org}/${var.github_repo}"
}

# 1. Create a Google Service Account for the Sarraf Backend App
resource "google_service_account" "backend_app_gsa" {
  project      = var.project_id
  account_id   = "sarraf-backend-gsa"
  display_name = "GSA for Sarraf Backend Pods"
}

# 2. Allow the Kubernetes Service Account (KSA) to impersonate this GSA
# This is the "Magic Link" that connects GKE to IAM
resource "google_service_account_iam_member" "gke_workload_identity_binding" {
  service_account_id = google_service_account.backend_app_gsa.name
  role               = "roles/iam.workloadIdentityUser"

  # Format: serviceAccount:[PROJECT_ID].svc.id.goog[[NAMESPACE]/[KSA_NAME]]
  member = "serviceAccount:${var.project_id}.svc.id.goog[default/sarraf-backend-ksa]"
}

# 3. Give the Backend App GSA permissions (e.g., to write logs)
resource "google_project_iam_member" "backend_app_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.backend_app_gsa.email}"
}