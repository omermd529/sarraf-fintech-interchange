terraform {
  backend "gcs" {
    bucket = "omerops-sarraf-dev-tfstate-me-central1"
    prefix = "terraform/dev/state"
  }
}

provider "google" {
  project = "omerops-sarraf-dev"
  region  = "me-central1" #Deployed in Doha region due to restrictions in Saudi Arabia Dammam region
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
}