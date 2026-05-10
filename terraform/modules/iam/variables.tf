variable "project_id" {
  type = string
}

variable "env" {
  type    = string
  default = "dev"
}

variable "k8s_namespace" {
  type    = string
  default = "sarraf-dev"
}

variable "iap_user_email" {
  type    = string
  default = "omerops13@gmail.com"
}
