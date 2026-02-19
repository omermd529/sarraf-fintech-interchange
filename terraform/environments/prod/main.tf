module "vpc" {
  source      = "../../modules/vpc"
  env         = "prod"
  region      = var.region
  project_id  = var.project_id
  subnet_cidr = var.subnet_cidr
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
