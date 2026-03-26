data "google_project" "project" {
  project_id = var.project_id
}

resource "google_container_cluster" "primary" {
  name     = "sarraf-cluster-${var.env}"
  location = var.region

  # Autopilot is the right choice for Doha (me-central1) efficiency
  enable_autopilot = true

  # Fixes the "Error 400" by explicitly maintaining this state
  secret_manager_config {
    enabled = true
  }

  # REQUIRED: This links your K8s Service Accounts to Google IAM
  workload_identity_config {
    workload_pool = "${data.google_project.project.project_id}.svc.id.goog"
  }

  network    = var.network_id
  subnetwork = var.subnet_id

  # Labels are for metadata/billing filters
  resource_labels = {
    env                = var.env
    provisioning_model = var.is_spot ? "spot" : "standard"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "k8s-pod-range"
    services_secondary_range_name = "k8s-service-range"
  }

  # Temporary allow-all for debugging; remember to tighten this later!
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "Allow-All-Temporary"
    }
  }

  release_channel {
    channel = "REGULAR"
  }

  # Prevents accidental deletion of the cluster during 'terraform destroy'
  deletion_protection = false 
}