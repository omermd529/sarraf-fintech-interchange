output "service_account_email" {
  value = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

output "cluster_endpoint" {
  value = google_container_cluster.primary.endpoint
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "namespace" {
  value = kubernetes_namespace.sarraf.metadata[0].name
}
