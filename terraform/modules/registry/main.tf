resource "google_artifact_registry_repository" "sarraf_repo" {
  location      = var.region
  repository_id = "sarraf-docker-repo"
  description   = "Docker repository for Sarraf Fintech microservices"
  format        = "DOCKER"

  docker_config {
    immutable_tags = true
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state = "UNTAGGED"
    }
  }
}

resource "google_artifact_registry_repository_iam_member" "gke_reader" {
  location   = google_artifact_registry_repository.sarraf_repo.location
  repository = google_artifact_registry_repository.sarraf_repo.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${var.gke_service_account}"
}
