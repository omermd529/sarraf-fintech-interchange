module "vpc" {
  source      = "../../modules/vpc"
  env         = "dev"
  region      = var.region
  project_id  = var.project_id
  subnet_cidr = var.subnet_cidr
}
# GKE needs to be created before the registry because the registry's service account is used in the registry module. The database can be created in parallel since it doesn't have dependencies on the GKE cluster or registry.
module "gke" {
  source            = "../../modules/gke"
  env               = "dev"
  region            = "me-central1"
  network_id        = module.vpc.vpc_id
  subnet_id         = module.vpc.subnet_id
  is_spot           = true
  project_id        = var.project_id
  allow_cicd_access = true
}

module "registry" {
  source              = "../../modules/registry"
  region              = "me-central1"
  project_id          = var.project_id
  gke_service_account = module.gke.service_account_email
}

module "database" {
  source            = "../../modules/database"
  project_id        = var.project_id
  region            = var.region
  env               = "dev"
  vpc_id            = module.vpc.vpc_id
  backend_gsa_email = module.iam.backend_gsa_email
}

module "iam" {
  source        = "../../modules/iam"
  project_id    = var.project_id
  env           = "dev"
  k8s_namespace = "sarraf-dev"
}

# Static Global IP for GKE Ingress
resource "google_compute_global_address" "sarraf_static_ip" {
  name = "sarraf-static-ip"
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

