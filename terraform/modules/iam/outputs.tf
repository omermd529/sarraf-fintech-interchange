output "backend_gsa_email" {
  value       = google_service_account.sarraf_backend.email
  description = "The backend GSA email"
}
