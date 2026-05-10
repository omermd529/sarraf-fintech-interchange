module "vpc" {
  source      = "../../modules/vpc"
  env         = "prod"
  region      = var.region
  project_id  = var.project_id
  subnet_cidr = var.subnet_cidr
}

module "gke" {
  source            = "../../modules/gke"
  env               = "prod"
  region            = var.region
  network_id        = module.vpc.vpc_id
  subnet_id         = module.vpc.subnet_id
  is_spot           = false
  project_id        = var.project_id
  allow_cicd_access = false # Prod: no 0.0.0.0/0 — use Connect Gateway
}

module "registry" {
  source              = "../../modules/registry"
  region              = var.region
  project_id          = var.project_id
  gke_service_account = module.gke.service_account_email
}

module "database" {
  source            = "../../modules/database"
  project_id        = var.project_id
  region            = var.region
  env               = "prod"
  vpc_id            = module.vpc.vpc_id
  backend_gsa_email = module.iam.backend_gsa_email
}

module "iam" {
  source        = "../../modules/iam"
  project_id    = var.project_id
  env           = "prod"
  k8s_namespace = "sarraf-prod"
}

# Static Global IP for Gateway API
resource "google_compute_global_address" "sarraf_static_ip" {
  name = "sarraf-static-ip"
}

# Certificate Manager
resource "google_certificate_manager_certificate" "sarraf_cert" {
  name = "sarraf-cert"
  managed {
    domains = var.cert_domains
  }
}

resource "google_certificate_manager_certificate_map" "sarraf_cert_map" {
  name = "sarraf-cert-map"
}

resource "google_certificate_manager_certificate_map_entry" "cert_entries" {
  for_each     = toset(var.cert_domains)
  name         = "${replace(each.value, ".", "-")}-entry"
  map          = google_certificate_manager_certificate_map.sarraf_cert_map.name
  certificates = [google_certificate_manager_certificate.sarraf_cert.id]
  hostname     = each.value
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
