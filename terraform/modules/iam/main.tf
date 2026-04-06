resource "google_service_account" "sarraf_backend" {
  account_id   = "sarraf-backend-gsa"
  display_name = "GSA for Sarraf Backend Microservice"
  project      = var.project_id
}

resource "google_project_iam_member" "gsa_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.sarraf_backend.email}"
}

resource "google_project_iam_member" "gsa_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sarraf_backend.email}"
}

resource "google_project_iam_member" "gsa_cloudsql_instance_user" {
  project = var.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.sarraf_backend.email}"
}

resource "kubernetes_service_account" "backend_ksa" {
  metadata {
    name      = "sarraf-backend-ksa"
    namespace = "default"
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.sarraf_backend.email
    }
  }
}

resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.sarraf_backend.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/sarraf-backend-ksa]"
}

resource "google_project_iam_member" "iap_tunnel_user" {
  project = var.project_id
  role    = "roles/iap.tunnelResourceAccessor"
  member  = "user:omerops13@gmail.com"
}