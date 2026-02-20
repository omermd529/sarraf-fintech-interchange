module "vpc" {
  source      = "../../modules/vpc"
  env         = "dev"
  region      = var.region
  project_id  = var.project_id
  subnet_cidr = var.subnet_cidr
}

module "gke" {
  source     = "../../modules/gke"
  env        = "dev"
  region     = "me-central1"
  network_id = module.vpc.vpc_id
  subnet_id  = module.vpc.subnet_id
  is_spot    = true
  project_id = var.project_id
}

module "registry" {
  source              = "../../modules/registry"
  region              = "me-central1"
  gke_service_account = module.gke.service_account_email
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
