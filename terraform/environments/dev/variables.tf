variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "subnet_cidr" {
  type = string
}

variable "cert_domains" {
  type        = list(string)
  description = "Domains for the Google-managed SSL certificate"
  default     = ["dev.sarraf.omerops.com", "dev-api.omerops.com", "dev-grafana.omerops.com"]
}
