variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev/prod)"
  type        = string
}

variable "service_account_roles" {
  description = "IAM roles to grant to the service account"
  type        = list(string)
  default     = ["roles/editor"]
}
