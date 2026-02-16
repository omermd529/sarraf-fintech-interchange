module "workload_identity" {
  source = "../../modules/workload-identity"

  project_id  = "omerops-sarraf-prod"
  github_org  = "omermd529"
  github_repo = "sarraf-fintech-interchange"
  environment = "prod"

  service_account_roles = [
    "roles/editor",
    "roles/storage.admin"
  ]
}

output "prod_workload_identity_provider" {
  description = "Add this to GitHub Secrets as GCP_WORKLOAD_IDENTITY_PROVIDER_PROD"
  value       = module.workload_identity.workload_identity_provider
}

output "prod_service_account" {
  description = "Add this to GitHub Secrets as GCP_SERVICE_ACCOUNT_PROD"
  value       = module.workload_identity.service_account_email
}
