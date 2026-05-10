# 💳 Sarraf Fintech Interchange (OmerOps)

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/omermd529/sarraf-fintech-interchange/deploy.yml?branch=main&label=CI%2FCD)](https://github.com/omermd529/sarraf-fintech-interchange/actions)
[![Security: Trivy](https://img.shields.io/badge/Security-Trivy%20Scanned-blue)](https://github.com/aquasecurity/trivy)
[![Region: me-central1](https://img.shields.io/badge/Region-me--central1%20(Doha)-green)](https://cloud.google.com/about/locations/doha)

**Sarraf** is a high-performance, cloud-native financial interchange built for the Gulf market. It leverages a modern **DevSecOps** stack to provide secure, low-latency transaction processing with a focus on regional data sovereignty and regulatory compliance.

---

## 🏗 System Architecture

The project is built on a **Zero-Trust** infrastructure model:

- **Core Engine:** High-concurrency **Golang 1.22** microservices.
- **Orchestration:** **GKE Autopilot** (Private Cluster) for automated scaling and management.
- **Infrastructure:** 100% **Terraform** managed (Modularized & Versioned).
- **Network:** Custom VPC with **Cloud NAT**, Private Google Access, and IAP-only management.
- **Security:** Keyless authentication via **Workload Identity Federation (OIDC)**.

---
## 🛠️ Technical Challenges & Solutions

### 1. Zero-Trust Identity with Workload Identity Federation (WIF)
**Challenge:** Initially, the CI/CD pipeline required long-lived Service Account JSON keys stored as GitHub Secrets, posing a significant security risk and management overhead.
**Solution:** Implemented **GCP Workload Identity Federation**. This allows GitHub Actions to authenticate to GCP using short-lived, identity-based tokens. I configured the OIDC provider and restricted permissions to a specific repository and branch, adhering to the **Principle of Least Privilege**.

### 2. Private Service Access & VPC Peering
**Challenge:** To maintain a high security posture, the Cloud SQL (PostgreSQL) instance was configured with **Private IP only**. However, this created a connectivity gap between the VPC and the Google-managed services network.
**Solution:** I engineered a **Private Service Access** connection using `google_service_networking_connection`. This involved:
* Allocating a specific internal IP range for peering.
* Configuring VPC Peering to allow the GKE cluster to communicate with the database over the Google internal backbone, ensuring no database traffic ever touches the public internet.


### 3. Automated IAM Lifecycle Management
**Challenge:** During the initial Terraform apply, the Service Account lacked the authority to modify project-level IAM policies, leading to "403 Forbidden" errors when attempting to automate networking roles.
**Solution:** I transitioned the infrastructure from "Manual Click-Ops" to **Full IaC Autonomy**. By granting the CI/CD Service Account `roles/resourcemanager.projectIamAdmin`, I enabled Terraform to manage its own required roles (like `networksAdmin`). This ensures the entire environment is 100% reproducible from code without manual intervention.

### 4. Distributed State Recovery (Ghost Locking)
**Challenge:** Pipeline interruptions or manual cancellations occasionally left "Zombie Locks" on the Terraform state stored in GCS, preventing subsequent deployments.
**Solution:** Implemented robust CI/CD practices by:
* Adding `-input=false` to all Terraform commands to prevent interactive hangs.
* Documenting a standard operating procedure for using `terraform force-unlock` to recover the state without risking corruption.

## 🛡️ Regulatory Compliance & Security Standards

This project is engineered to meet the stringent requirements of the **Saudi Arabian** financial landscape:

### 1. Data Sovereignty (SAMA/NDMO)

- **Regional Residency:** All compute, storage, and networking resources are strictly pinned to the **`me-central1` (Doha)** region. The preferred `me-central2` (Dammam, KSA) region is not available for India-based GCP accounts, so Doha was chosen as the nearest Gulf alternative to ensure low latency and compliance with regional data residency guidelines.
- **Private Connectivity:** No GKE nodes or Database instances have Public IPs. All internal traffic stays within the Google Global Fiber Network.

### 2. Secure SDLC (NCA-CSCC)

- **Shift-Left Security:** Automated **Trivy Vulnerability Scanning** in the CI/CD pipeline.
- **Hardened Containers:** Multi-stage Docker builds using **Google Distroless** images to minimize attack surface.
- **Binary Integrity:** Image tags are mapped to unique **Git SHAs** for 100% traceability from code to production.

### 3. Financial Integrity (Anti-Fraud)

- **Audit Logging:** Comprehensive Cloud Logging and Monitoring for every infrastructure change and API request.
- **Least Privilege:** **Workload Identity** ensures that the backend application only has the specific permissions it needs to function (e.g., Cloud SQL access), preventing lateral movement in case of a breach.

---

## 🚀 Getting Started

### Prerequisites

- Google Cloud SDK (`gcloud`)
- Terraform `v1.13.3+`
- Go `1.22`
- `kubectl`

### Directory Structure

```bash
.
├── .github/
│   └── workflows/              # DevSecOps CI/CD Pipelines
│       ├── backend-dev.yml
│       ├── frontend-dev.yml
│       ├── terraform-dev.yml
│       ├── terraform-prod.yml
│       └── test-wif.yml
├── backend/
│   ├── k8s/                    # Kubernetes Manifests
│   │   ├── deployment.yaml
│   │   ├── migration-job.yaml  # DB Migration K8s Job
│   │   ├── namespace.yaml
│   │   ├── secret-provider.yaml
│   │   ├── service.yaml
│   │   └── serviceaccount.yaml
│   ├── migrations/             # SQL Schema Migrations
│   │   ├── 000001_init_sarraf_schema.up.sql
│   │   └── 000001_init.down.sql
│   ├── Dockerfile              # Multi-stage Distroless Build
│   ├── go.mod
│   ├── go.sum
│   └── main.go                 # Golang Microservice
├── frontend/
│   ├── k8s/                    # Frontend K8s Manifests
│   │   ├── deployment.yaml
│   │   ├── ingress.yaml
│   │   ├── managed-cert.yaml
│   │   └── service.yaml
│   ├── src/app/                # Next.js Pages
│   │   ├── about/page.tsx      # About Sarraf & Engineer
│   │   ├── history/page.tsx    # Transaction Audit Trail
│   │   ├── pay/page.tsx        # Payment Interface
│   │   └── page.tsx            # Dashboard
│   ├── Dockerfile              # Multi-stage Next.js Build
│   └── package.json
├── gitops/
│   ├── argocd/                 # ArgoCD Application Configs
│   ├── base/
│   │   └── monitoring/         # Observability Stack
│   │       ├── dashboards/
│   │       │   ├── sarraf-dashboard.yaml   # Interchange Overview
│   │       │   ├── pods-dashboard.yaml     # Backend Pod Health
│   │       │   ├── finops-dashboard.yaml   # FinOps Cost Estimation
│   │       │   └── perpod-dashboard.yaml   # Per-Pod Metrics (All Pods)
│   │       ├── grafana.yaml
│   │       └── prometheus.yaml
│   └── overlays/               # Kustomize Overlays
├── terraform/
│   ├── environments/           # Environment-specific Configs
│   │   ├── dev/
│   │   └── prod/
│   └── modules/                # Reusable Terraform Modules
│       ├── database/           # Cloud SQL (Private IP)
│       ├── gke/                # GKE Autopilot Cluster
│       ├── iam/                # IAM Roles & Bindings
│       ├── registry/           # Artifact Registry
│       ├── vpc/                # VPC, Subnets, Cloud NAT
│       └── workload-identity/  # WIF (OIDC) Config
├── .gitignore
├── LEARNINGS.md                # Technical learnings & notes
├── LICENSE
├── README.md
├── setup-github-wif.sh         # WIF Bootstrap Script
└── WORKLOAD_IDENTITY_SETUP.md  # WIF Setup Guide
```

### Deployment

1. **Infrastructure:**
   ```bash
   cd terraform/environments/dev
   terraform init && terraform apply
   ```
2. **Application:**
   Push your changes to the `development` branch. The GitHub Action will automatically:
   - Build & Scan the Go binary.
   - Push to Artifact Registry.
   - Run database migrations via a K8s Job.
   - Deploy to GKE via `kubectl`.

---

## 🛠 Tech Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Golang (1.22) |
| **Frontend** | Next.js (React) with Shadcn UI |
| **Cloud** | Google Cloud Platform (GCP) |
| **Compute** | GKE Autopilot (Spot Instances for Dev, Standard for Prod) |
| **Database** | Cloud SQL (PostgreSQL) with versioned SQL migrations |
| **IaC** | Terraform |
| **Observability** | Prometheus + Grafana (FinOps, Per-Pod, Interchange dashboards) |
| **GitOps** | ArgoCD + Kustomize |
| **Security** | Trivy, WIF, Distroless, Cloud IAM |
| **CI/CD** | GitHub Actions |

---

## 📊 Grafana Dashboards

Four provisioned dashboards available at `grafana.omerops.com`:

| Dashboard | Panels |
| :--- | :--- |
| **Interchange Overview** | Transactions (success/failed), Payment Latency (p50/p95/p99), Fees Collected, HTTP Requests by Endpoint, Go Runtime |
| **Pod Health & Performance** | Backend CPU, Memory, Goroutines, GC Pauses, File Descriptors, Error Rate, Request Latency |
| **FinOps Cost Estimation** | GKE Cluster Cost (Daily), Savings from Spot Instances (%), Cost per Transaction (Halalas), Monthly Projections (USD/SAR) |
| **Per-Pod Metrics** | CPU, Memory, Network RX/TX, Restarts, Ready Status — for Frontend, Backend, Grafana, and Prometheus pods |

---

## 📞 Contact

**Omer Mohammed** - Cloud & Platform Engineer
- Email:omermd529@gmail.com
- LinkedIn: [linkedin.com/in/omermd529](https://www.linkedin.com/in/omermd529)

---

*Project Status: Active Development (Phase: Observability & FinOps Dashboard Integration)*
