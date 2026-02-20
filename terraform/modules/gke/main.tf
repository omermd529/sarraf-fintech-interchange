resource "google_container_cluster" "primary" {
  name     = "sarraf-cluster-${var.env}"
  location = var.region

  enable_autopilot = true

  network    = var.network_id
  subnetwork = var.subnet_id

  resource_labels = {
    provisioning_model = var.is_spot ? "spot" : "standard"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "k8s-pod-range"
    services_secondary_range_name = "k8s-service-range"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "Allow-All-Temporary"
    }
  }

  release_channel {
    channel = "REGULAR"
  }
}
