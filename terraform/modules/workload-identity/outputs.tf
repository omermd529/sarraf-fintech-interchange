output "workload_identity_provider" {
  description = "Workload Identity Provider resource name (use in GitHub Actions)"
  value       = "projects/${data.google_project.project.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github_provider.workload_identity_pool_provider_id}"
}

output "service_account_email" {
  description = "Service account email for GitHub Actions"
  value       = google_service_account.github_actions.email
}

output "project_number" {
  description = "GCP Project Number"
  value       = data.google_project.project.number
}

output "pool_name" {
  description = "Workload Identity Pool name"
  value       = google_iam_workload_identity_pool.github_pool.name
}

# 4. Output the GSA email so you can use it in your K8s manifests
output "backend_gsa_email" {
  value = google_service_account.backend_app_gsa.email
}