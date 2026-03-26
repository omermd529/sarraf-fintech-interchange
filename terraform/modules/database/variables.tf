variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "region" {
  description = "The GCP region (e.g., me-central1[Doha])"
  type        = string
}

variable "env" {
  description = "The environment name (dev/prod)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC where the DB will be peered"
  type        = string
}
