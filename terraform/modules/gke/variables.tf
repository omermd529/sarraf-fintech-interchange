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
