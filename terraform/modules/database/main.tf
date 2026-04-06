resource "google_compute_global_address" "private_ip_address" {
  name          = "sarraf-db-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = var.vpc_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.vpc_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

resource "google_sql_database_instance" "sarraf_db_instance" {
  name             = "sarraf-db-${var.env}"
  database_version = "POSTGRES_15"
  region           = var.region
  depends_on       = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-f1-micro" # Start small for Dev (FinOps!)

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }

    backup_configuration {
      enabled    = true
      start_time = "02:00" # Backups during low traffic
    }
  }

  deletion_protection = var.env == "prod" ? true : false
}

resource "google_sql_database" "database" {
  name     = "sarraf_interchange"
  instance = google_sql_database_instance.sarraf_db_instance.name
}

# 1. Look up the Secret Metadata
data "google_secret_manager_secret" "db_password_meta" {
  secret_id = "sarraf-db-password"
}

# 2. Fetch the actual Secret Value (the payload)
data "google_secret_manager_secret_version" "db_password_value" {
  secret  = data.google_secret_manager_secret.db_password_meta.id
  version = "latest" # Always pulls the most recent version you created
}

# 3. Apply it to the SQL User
resource "google_sql_user" "users" {
  name     = "sarraf_admin"
  instance = google_sql_database_instance.sarraf_db_instance.name
  password = data.google_secret_manager_secret_version.db_password_value.secret_data
}

# IAM DB user — authenticates via GSA token, no password needed
# Cloud SQL requires the email WITHOUT the .gserviceaccount.com suffix
resource "google_sql_user" "iam_user" {
  name     = trimsuffix(var.backend_gsa_email, ".gserviceaccount.com")
  instance = google_sql_database_instance.sarraf_db_instance.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}