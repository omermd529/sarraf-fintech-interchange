output "database_ip" {
  value       = module.database.db_private_ip
  description = "The private IP address of the SQL instance for the backend"
}

# Optional: Add these for debugging
output "database_instance_name" {
  value       = module.database.db_instance_name
  description = "The name of the SQL instance for the backend"
}
