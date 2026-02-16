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