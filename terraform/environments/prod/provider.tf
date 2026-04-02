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
