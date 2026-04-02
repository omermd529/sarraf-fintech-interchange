terraform {
  backend "gcs" {
    bucket = "omerops-sarraf-prod-tfstate-me-central1"
    prefix = "terraform/prod/state"
  }
}

provider "google" {
  project = "omerops-sarraf-prod"
  region  = "me-central1"
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
}
