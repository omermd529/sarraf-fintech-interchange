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
  project_id          = var.project_id
  gke_service_account = module.gke.service_account_email
}

module "database" {
  source      = "../../modules/database"
  project_id  = var.project_id
  region      = var.region
  env         = "dev"
  vpc_id      = module.vpc.vpc_id
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
