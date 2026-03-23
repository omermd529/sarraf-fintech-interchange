output "service_account_email" {
  value = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}
