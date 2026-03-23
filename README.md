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

## 🛡️ Regulatory Compliance & Security Standards

This project is engineered to meet the stringent requirements of the **Saudi Arabian** financial landscape:

### 1. Data Sovereignty (SAMA/NDMO)

- **Regional Residency:** All compute, storage, and networking resources are strictly pinned to the **`me-central1` (Doha)** region to ensure low latency and compliance with regional data residency guidelines.
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
├── backend/            # Golang Microservices & K8s Manifests
├── terraform/          # Infrastructure as Code
│   ├── modules/        # Reusable VPC, GKE, IAM modules
│   └── environments/   # Environment-specific (Dev/Prod) configs
└── .github/            # DevSecOps CI/CD Pipelines
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
   - Deploy to GKE via `kubectl`.

---

## 🛠 Tech Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Golang (1.22) |
| **Cloud** | Google Cloud Platform (GCP) |
| **Compute** | GKE Autopilot (Spot Instances) |
| **IaC** | Terraform |
| **Security** | Trivy, WIF, Distroless, Cloud IAM |
| **CI/CD** | GitHub Actions |

---

## 📞 Contact

**Omer Mohammed** - Cloud & Platform Engineer
*Project Status: Active Development (Phase: Data Layer Integration)*
