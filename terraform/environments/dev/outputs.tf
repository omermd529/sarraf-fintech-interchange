output "database_ip" {
  value       = module.database.db_private_ip
  description = "The private IP address of the SQL instance for the backend"
}

# Optional: Add these for debugging
output "database_instance_name" {
  value       = module.database.db_instance_name
  description = "The name of the SQL instance for the backend"
}

output "database_connection_name" {
  value       = module.database.db_connection_name
  description = "The connection name for Cloud SQL Auth Proxy"
}

output "backend_gsa_email" {
  value       = module.iam.backend_gsa_email
  description = "The backend GSA email for IAM DB auth"
}
