data "google_project" "project" {
  project_id = var.project_id
}

resource "google_container_cluster" "primary" {
  name     = "sarraf-cluster-${var.env}"
  location = var.region

  
  enable_autopilot = true

  # Fixes the "Error 400" by explicitly maintaining this state
  secret_manager_config {
    enabled = true
  }

  # REQUIRED: This links the K8s Service Accounts to Google IAM
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

  # This allows the GKE Control Plane to be reached via IAP
  master_authorized_networks_config {
    gcp_public_cidrs_access_enabled = false
    cidr_blocks {
      cidr_block   = "35.235.240.0/20" # Google IAP Proxy range
      display_name = "IAP-Proxy"
    }
    dynamic "cidr_blocks" {
      for_each = var.allow_cicd_access ? [1] : []
      content {
        cidr_block   = "0.0.0.0/0"
        display_name = "CI-CD-Runners"
      }
    }
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false # Keep false to allow IAP tunnel to public endpoint
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  release_channel {
    channel = "REGULAR"
  }

  # Prevents accidental deletion of the cluster during 'terraform destroy'
  deletion_protection = false 
}