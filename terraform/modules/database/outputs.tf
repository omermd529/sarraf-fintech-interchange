output "db_instance_name" {
  value       = google_sql_database_instance.sarraf_db_instance.name
  description = "The name of the database instance"
}

output "db_private_ip" {
  value       = google_sql_database_instance.sarraf_db_instance.private_ip_address
  description = "The private IP address of the SQL instance"
}

output "db_name" {
  value       = google_sql_database.database.name
  description = "The name of the default database"
}

output "db_connection_name" {
  value       = google_sql_database_instance.sarraf_db_instance.connection_name
  description = "The connection name for Cloud SQL Auth Proxy"
}