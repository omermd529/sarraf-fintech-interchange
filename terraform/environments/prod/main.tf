module "vpc" {
  source      = "../../modules/vpc"
  env         = "prod"
  region      = var.region
  project_id  = var.project_id
  subnet_cidr = var.subnet_cidr
}

module "gke" {
  source     = "../../modules/gke"
  env        = "prod"
  region     = "me-central1"
  network_id = module.vpc.vpc_id
  subnet_id  = module.vpc.subnet_id
  is_spot    = false
  project_id = var.project_id
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
