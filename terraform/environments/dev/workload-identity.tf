module "workload_identity" {
  source = "../../modules/workload-identity"

  project_id  = "omerops-sarraf-dev"
  github_org  = "omermd529"
  github_repo = "sarraf-fintech-interchange"
  environment = "dev"

  service_account_roles = [
    "roles/editor",
    "roles/storage.admin"
  ]
}

output "dev_workload_identity_provider" {
  description = "Add this to GitHub Secrets as GCP_WORKLOAD_IDENTITY_PROVIDER"
  value       = module.workload_identity.workload_identity_provider
}

output "dev_service_account" {
  description = "Add this to GitHub Secrets as GCP_SERVICE_ACCOUNT"
  value       = module.workload_identity.service_account_email
}
