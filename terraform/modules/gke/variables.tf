variable "env" {
  type = string
}

variable "region" {
  type = string
}

variable "network_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "is_spot" {
  type        = bool
  description = "If true, the cluster will prefer Spot instances for cost savings"
  default     = false
}

variable "project_id" {
  type = string
}

variable "allow_cicd_access" {
  description = "Allow CI/CD runners (0.0.0.0/0) to reach the GKE control plane. Use true for dev only."
  type        = bool
  default     = false
}
