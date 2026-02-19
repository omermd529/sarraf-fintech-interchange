variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "env" {
  type        = string
  description = "Environment (dev/prod)"
}

variable "region" {
  type        = string
  description = "GCP Region"
}

variable "subnet_cidr" {
  type        = string
  description = "Subnet CIDR range"
}
