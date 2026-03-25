variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "subnet_cidr" {
  type = string
}

variable "db_password" {
  description = "Database password passed from secrets"
  type        = string
  sensitive   = true
}