resource "google_compute_network" "vpc" {
  name                    = "sarraf-vpc-${var.env}"
  auto_create_subnetworks = false
  project                 = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "sarraf-subnet-${var.env}"
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr
  project       = var.project_id

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "k8s-pod-range"
    ip_cidr_range = "10.48.0.0/14"
  }
  secondary_ip_range {
    range_name    = "k8s-service-range"
    ip_cidr_range = "10.52.0.0/20"
  }
}

resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "allow-iap-ssh-${var.env}"
  network = google_compute_network.vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
}

resource "google_compute_router" "router" {
  name    = "sarraf-router-${var.env}"
  region  = var.region
  network = google_compute_network.vpc.id
  project = var.project_id

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "nat" {
  name                               = "sarraf-nat-${var.env}"
  router                             = google_compute_router.router.name
  region                             = google_compute_router.router.region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
