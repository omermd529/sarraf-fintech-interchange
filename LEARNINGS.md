# 📘 Engineering Learnings: Sarraf Backend Deployment

## Issue 1: Database Connection String Parsing Failure

**Symptom:**
```
Pod status: CrashLoopBackOff (522 restarts over 44 hours)
```

**Error Log:**
```
Unable to parse connection string: cannot parse `postgres://sarraf_admin:xxxxxx@xP8^mL6$wQ3&bH7*eN5@10.20.0.3:5432/sarraf_interchange?sslmode=disable`: failed to parse as URL (invalid port ":Z4" after host)
```

**Root Cause:**
The database password contained special characters (`@`, `$`, `&`, `*`, `^`). The `@` symbol in the password was being interpreted as the URL host separator by `pgxpool.ParseConfig`, corrupting the entire connection string.

**Fix Applied:**
Updated `backend/main.go` to URL-encode the credentials using `net/url.QueryEscape` before building the connection string:

```go
// Before (broken)
dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
    dbHost, dbPort, dbUser, dbPass, dbName)

// After (fixed)
dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
    url.QueryEscape(dbUser), url.QueryEscape(dbPass), dbHost, dbPort, dbName)
```

**Result:** Pod started successfully — `1/1 Running`.

---

## Issue 2: Kubernetes Secret Not Syncing from GCP Secret Manager

**Symptom:**
```
kubectl get secret sarraf-db-password-sync
Error from server (NotFound): secrets "sarraf-db-password-sync" not found
```

The `SecretProviderClass` was configured with `secretObjects` to sync the GCP secret into a Kubernetes Secret, but the K8s secret was never created — even though the pod was running and the CSI volume was mounted.

**Debugging Steps:**

1. **Verified SecretProviderClass config** — `secret-provider.yaml` looked correct.
2. **Verified pod volume mount** — CSI volume `secrets-store-inline` was mounted at `/var/secrets` with `ReadOnly: true`.
3. **Verified GCP IAM permissions** — `sarraf-backend-gsa` had `roles/secretmanager.secretAccessor` on the secret.
4. **Verified Workload Identity binding** — KSA `sarraf-backend-ksa` was annotated with the correct GSA email.
5. **Verified CSI driver installation** — `secrets-store-gke.csi.k8s.io` driver was present.
6. **Checked CSI driver logs** — Found the root cause.

**Root Cause (Part A): Missing RBAC Permissions**

CSI driver logs showed:
```
secrets is forbidden: User "system:serviceaccount:kube-system:secrets-store-csi-driver-gke" cannot list resource "secrets" in API group "" at the cluster scope
```

The CSI driver's service account (`secrets-store-csi-driver-gke` in `kube-system`) did not have RBAC permissions to create/list Kubernetes Secrets. Without this, the `secretObjects` sync feature cannot work.

**Fix Applied:**
Created a ClusterRole and ClusterRoleBinding to grant the CSI driver secrets permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secrets-store-csi-driver-secrets-role
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: secrets-store-csi-driver-secrets-binding
subjects:
- kind: ServiceAccount
  name: secrets-store-csi-driver-gke
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: secrets-store-csi-driver-secrets-role
  apiGroup: rbac.authorization.k8s.io
```

**Root Cause (Part B): Incorrect objectName in secretObjects**

After fixing RBAC, a second error appeared:
```
file matching objectName projects/omerops-sarraf-dev/secrets/sarraf-db-password/versions/latest not found in the pod
```

During debugging, the `objectName` in `secretObjects` was incorrectly changed from `dbpassword.txt` (the `fileName`) to the full `resourceName` path. The CSI driver matches `objectName` against the **fileName** mounted in the pod, not the GCP resource path.

**Fix Applied:**
Reverted `objectName` back to `dbpassword.txt`:

```yaml
secretObjects:
- secretName: sarraf-db-password-sync
  type: Opaque
  data:
  - objectName: "dbpassword.txt"  # Must match fileName, NOT resourceName
    key: password
```

**Result:**
```
kubectl get secret sarraf-db-password-sync
NAME                      TYPE     DATA   AGE
sarraf-db-password-sync   Opaque   1      50s
```

---

## Summary of Changes

| File | Change |
|:---|:---|
| `backend/main.go` | URL-encode DB credentials with `url.QueryEscape` |
| `backend/k8s/secret-provider.yaml` | Confirmed `objectName: dbpassword.txt` |
| `backend/k8s/csi-rbac.yaml` | ClusterRole + ClusterRoleBinding for CSI driver |

## Important: CSI RBAC Removed (csi-rbac.yaml deleted)

The `csi-rbac.yaml` (ClusterRole + ClusterRoleBinding for the CSI driver) was removed because:

1. **GKE Autopilot** manages the Secrets Store CSI driver as a built-in add-on — it forbids creating ClusterRoles/ClusterRoleBindings from the CI/CD service account.
2. **The app doesn't need it.** The RBAC was only required for the `secretObjects` sync feature (creating a K8s Secret from the GCP secret). Our Go code reads directly from the **CSI volume file mount** (`DB_PASSWORD_FILE=/var/secrets/dbpassword.txt`), not from a K8s Secret.

**Two different CSI features:**
| Feature | Needs RBAC? | How it works |
|:---|:---|:---|
| Volume file mount (`/var/secrets/dbpassword.txt`) | No | CSI driver mounts secret as a file in the pod |
| K8s Secret sync (`secretObjects`) | Yes | CSI driver creates a K8s Secret object — requires ClusterRole for secrets CRUD |

If the synced K8s Secret (`sarraf-db-password-sync`) is ever needed in the future (e.g., for env var injection), the RBAC would need to be re-added — but on Autopilot this may require a support request or switching to a Standard cluster.

---

## Issue 3: Namespace Isolation & Private Cluster CI/CD Access

**Symptom:**
```
dial tcp 34.18.110.48:443: i/o timeout
```
Terraform and GitHub Actions `kubectl` commands timed out trying to reach the GKE API.

**Root Cause:**
- `master_authorized_networks_config` only allowed the IAP range (`35.235.240.0/20`).
- GitHub Actions runners have dynamic public IPs outside that range.
- Terraform's `kubernetes` provider also couldn't reach the private cluster from local machines.

**Fix Applied:**
1. Added `allow_cicd_access` variable to the GKE module — conditionally adds `0.0.0.0/0` to authorized networks for dev only.
2. Removed the `kubernetes` provider from Terraform — namespace and KSA are now managed via `kubectl` in CI/CD instead.
3. Created `backend/k8s/namespace.yaml` — namespace `sarraf-dev` / `sarraf-prod` applied via CI/CD.
4. All K8s manifests use `NAMESPACE_PLACEHOLDER`, injected by `sed` in the pipeline.

**Key Decision:** Terraform manages GCP-side resources (cluster, IAM, WIF). `kubectl` in CI/CD manages K8s-side resources (namespace, KSA, deployments) — because CI/CD has network access to the private cluster via `get-gke-credentials`.

---

## Issue 4: IAM Permission Denied for Workload Identity Binding

**Symptom:**
```
Error 403: Permission 'iam.serviceAccounts.setIamPolicy' denied on resource
```

**Root Cause:**
The CI/CD service account had `roles/editor` which does **not** include `iam.serviceAccounts.setIamPolicy`. This permission is needed for the KSA→GSA Workload Identity binding (`google_service_account_iam_member`).

**Fix Applied:**
Added `roles/iam.serviceAccountAdmin` to the CI/CD service account roles in both dev and prod `workload-identity.tf`. Bootstrapped manually with:
```bash
gcloud projects add-iam-policy-binding omerops-sarraf-dev \
  --member="serviceAccount:github-actions-dev@omerops-sarraf-dev.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"
```

---

## Key Lessons

1. **Always URL-encode credentials** when building database connection strings — special characters in passwords will break URL parsing.
2. **CSI volume mount vs secretObjects sync** are two different features. Volume mounts work without extra RBAC; K8s Secret sync requires ClusterRole permissions.
3. **`objectName` in `secretObjects`** must match the `fileName` defined in the SecretProviderClass parameters, not the GCP `resourceName`.
4. **Private GKE clusters** need authorized network entries for any external client (CI/CD runners, local machines). Use a variable to control access per environment.
5. **Don't manage K8s resources via Terraform** when the cluster is private and Terraform runs externally — use `kubectl` in CI/CD instead.
6. **`roles/editor` is not enough** for IAM operations on service accounts. `roles/iam.serviceAccountAdmin` is needed for Workload Identity bindings.

---

## Issue 5: Database Migration Job — The Autopilot Gauntlet

**Goal:** Run `golang-migrate` as a K8s Job to apply SQL schema migrations before deploying the backend.

**What followed was a chain of 7+ failures**, each revealing a new layer of complexity when running short-lived Jobs on GKE Autopilot with secrets from GCP Secret Manager.

### Challenge 5a: GKE Autopilot Cold-Start Timeout

**Symptom:**
```
error: timed out waiting for the condition on jobs/sarraf-db-migrate
```

**Root Cause:** GKE Autopilot scales from zero. When the Job is created, Autopilot must provision a new node, which takes 2-4 minutes. The initial `kubectl wait --timeout=120s` wasn't enough.

**Fix:** Increased timeout to `300s`. But the job still failed — revealing the next issue.

---

### Challenge 5b: CSI Driver Not Found on New Nodes

**Symptom:**
```
MountVolume.SetUp failed for volume "db-secret-volume": driver name secrets-store.csi.k8s.io not found
```

**Root Cause:** The migration job was using `secrets-store.csi.k8s.io` (open-source driver), but GKE Autopilot uses `secrets-store-gke.csi.k8s.io` (GKE-native driver). Additionally, newly provisioned Autopilot nodes take time to register CSI drivers.

**Fix:** Changed driver to `secrets-store-gke.csi.k8s.io` to match the deployment.

---

### Challenge 5c: Chicken-and-Egg — secretKeyRef vs CSI Volume Mount

**Symptom:**
```
CreateContainerConfigError — secret "sarraf-db-password-sync" not found
```

**Root Cause:** The migration job used `secretKeyRef` to read the password from a K8s Secret. But that K8s Secret is only created **after** the CSI volume mounts. The CSI volume only mounts **after** the container starts. The container can't start without the secret → deadlock.

**Fix Attempt 1:** Switched to reading the password from the CSI-mounted file (`/var/secrets/dbpassword.txt`) using a shell wrapper instead of `secretKeyRef`.

**Result:** Container started, but `FailedToCreateSecret: timed out` — the CSI driver couldn't sync fast enough for short-lived Jobs.

---

### Challenge 5d: Pipeline-Based Migration via Cloud SQL Auth Proxy

**Approach:** Bypass K8s entirely — run migrations directly on the GitHub Actions runner using Cloud SQL Auth Proxy.

**Failure 1 — Public IP:** `instance does not have IP of type "PUBLIC"`. The Cloud SQL instance is private-only. Added `--private-ip` flag, but the GitHub runner is on the public internet and can't reach the VPC private IP.

**Failure 2 — Password URL Encoding:** The password `Z4#tV9!rK2@xP8^mL6$wQ3&bH7*eN5` contains `#` (URL fragment delimiter), `@` (host separator), `$` (bash variable), `&` (query separator). These broke both bash expansion and URL parsing.

**Verdict:** Pipeline-based approach abandoned — can't reach private Cloud SQL from external runners without VPN/IAP tunnel.

---

### Challenge 5e: Init Container Pattern (Final Solution)

**Approach:** Use an `initContainer` as a "gatekeeper" that waits for the CSI driver to write the secret file before the migrate container starts.

**Architecture:**
```
initContainer (alpine) → waits for /var/secrets/dbpassword.txt
                        → URL-encodes password with python3
                        → writes to /tmp/shared/db_pass_encoded.txt (emptyDir)
                        ↓
container (migrate)    → reads pre-encoded password from shared volume
                        → runs migrations with safe connection string
```

**Why Init Container solves the timing issue:**
- Init containers run **before** main containers
- The CSI volume is mounted on the init container, triggering the driver to fetch the secret
- The `until [ -f ... ]; do sleep 2; done` loop waits for the file to appear
- Only after the init container exits successfully does the migrate container start

**Why URL-encoding is needed:**
- The `migrate` tool parses the database URL using Go's `net/url` package
- Special characters in the password (`#@$&^*!`) must be percent-encoded
- Alpine's `python3` handles this via `urllib.parse.quote()`
- The encoded password is shared via an `emptyDir` volume

---

### Challenge 5f: Dirty Database State

**Symptom:**
```
error: Dirty database version 1. Fix and force version.
```

**Root Cause:** A previous migration attempt partially executed (created some tables) but then crashed. `golang-migrate` tracks migration state in a `schema_migrations` table. When a migration fails mid-way, it marks the version as "dirty" to prevent re-running potentially half-applied changes.

**Fix:** Added `force 1` before `up` in the migration command:
```sh
/migrate -path=/migrations/ -database="$DB_URL" force 1
/migrate -path=/migrations/ -database="$DB_URL" up
```

---

### Challenge 5g: GCE Spot Quota Exceeded

**Symptom:**
```
FailedScaleUp: GCE quota exceeded. Pod is at risk of not being scheduled.
Node-Selectors: cloud.google.com/gke-spot=true
```

**Root Cause:** The backend deployment had `nodeSelector: cloud.google.com/gke-spot: "true"`, but Spot VM quota in `me-central1` was exhausted.

**Fix:** Removed the Spot node selector from `deployment.yaml` so pods can schedule on standard nodes.

---

### Summary: Migration Job Evolution

| Attempt | Approach | Failure Reason |
|:---|:---|:---|
| 1 | K8s Job + `secretKeyRef` | Chicken-and-egg: K8s Secret doesn't exist before CSI mounts |
| 2 | K8s Job + CSI file read (shell wrapper) | CSI driver sync too slow for short-lived Jobs |
| 3 | Pipeline + Cloud SQL Auth Proxy | Can't reach private Cloud SQL from public GitHub runners |
| 4 | K8s Job + Init Container | ✅ Works — init container waits for secret, URL-encodes, passes to migrate |

### Key Lessons

7. **GKE Autopilot cold-starts** add 2-4 minutes to Job scheduling. Always use generous timeouts (300s+).
8. **CSI driver names differ** between open-source (`secrets-store.csi.k8s.io`) and GKE-native (`secrets-store-gke.csi.k8s.io`). Always check `kubectl get csidrivers`.
9. **`secretKeyRef` and CSI volume mounts have a circular dependency** for Jobs — use init containers or file-based reads instead.
10. **Passwords with special characters** (`#@$&^*!`) break both bash expansion and URL parsing. Always URL-encode credentials in connection strings.
11. **Private Cloud SQL instances** can't be reached from external CI/CD runners without VPN/IAP. Run migrations in-cluster.
12. **`golang-migrate` dirty state** requires `force <version>` to reset before re-running. Consider adding this to migration scripts for resilience.
13. **Init containers** are the production pattern for CSI secret dependencies — they guarantee the secret file exists before the main container starts.


---

## Issue 6: Cloud SQL Auth Proxy — Private IP Configuration

**Symptom:**
```
failed to connect to instance: Config error: instance does not have IP of type "PUBLIC"
```

The Cloud SQL Auth Proxy sidecar in the backend deployment was trying to connect via public IP, but the Cloud SQL instance is configured with `ipv4_enabled = false` (private IP only).

**Root Cause:** The `--private-ip` flag was missing from the Auth Proxy container args in `deployment.yaml`. By default, the Cloud SQL Auth Proxy attempts to connect via the instance's public IP. Since the Sarraf database is private-only (a SAMA data sovereignty requirement), this fails.

**This same issue appeared twice:**
1. First in the pipeline-based migration attempt (Challenge 5d) — the proxy on the GitHub runner couldn't reach the private IP at all since the runner is outside the VPC.
2. Then in the GKE sidecar — the proxy was inside the VPC but still defaulting to public IP resolution.

**Fix Applied:**
Added `--private-ip` to the Cloud SQL Auth Proxy args in `backend/k8s/deployment.yaml`:
```yaml
args:
- "--auto-iam-authn"
- "--private-ip"
- "--structured-logs"
- "DB_CONNECTION_NAME_PLACEHOLDER"
```

**Key Lesson:**
14. **Cloud SQL Auth Proxy defaults to public IP.** When using private-only Cloud SQL instances, always pass `--private-ip`. This applies to both sidecar containers and standalone proxy binaries.

---

## Issue 7: Migration Job — Final Success

After 7+ iterations, the migration job finally completed using the **Init Container + URL-encoding** pattern.

**Successful flow:**
```
Pipeline                    GKE Autopilot
────────                    ─────────────
kubectl apply job  ───────► Node provisioned (~2 min)
                            ├── initContainer: wait-for-secret
                            │   ├── CSI driver mounts /var/secrets/dbpassword.txt
                            │   ├── python3 URL-encodes password
                            │   └── writes to /tmp/shared/db_pass_encoded.txt
                            └── container: migrate
                                ├── reads encoded password from shared volume
                                ├── force resets dirty state (version 1)
                                └── runs migrations UP ✅
```

**Pipeline log confirmation:**
```
job.batch/sarraf-db-migrate created
→ condition met (Completed)
```

**Database state after migration:**
- `schema_migrations` table: version=1, dirty=false
- Tables created: `users`, `merchants`, `transactions`
- Indexes created: `idx_transactions_rrn`, `idx_users_username`
- IAM user granted: `sarraf-backend-gsa@omerops-sarraf-dev.iam`

---

## Summary: Full Deployment Chain

| Step | Status | Method |
|:---|:---|:---|
| Docker Build + Trivy Scan | ✅ | GitHub Actions |
| Push to Artifact Registry | ✅ | Immutability-aware (skip if tag exists) |
| Database Migration | ✅ | K8s Job + Init Container + CSI Secret |
| Backend Deployment | 🔄 | Cloud SQL Auth Proxy sidecar (IAM Auth) |
| Passwordless DB Auth | 🔄 | Workload Identity → Cloud SQL IAM Auth |


---

## 🏆 Milestone: Full Stack Live with Passwordless IAM Auth

**Date:** April 6, 2026

After 10+ iterations across migration jobs, CSI drivers, Auth Proxy configs, and URL-encoding battles — the Sarraf backend is fully deployed with **zero passwords** in the runtime.

### Final Verification

```bash
$ kubectl get pods -n sarraf-dev
NAME                              READY   STATUS      RESTARTS   AGE
sarraf-backend-5fd6c57846-bkcrt   2/2     Running     0          85s
sarraf-db-migrate-pqwnh           0/1     Completed   0          99s

$ curl http://34.18.147.101/healthz
Sarraf API is healthy
```

### What "2/2 Running" Means

The backend pod runs **two containers**:
1. `sarraf-api` — The Go microservice (Distroless image)
2. `cloud-sql-proxy` — Cloud SQL Auth Proxy sidecar with `--auto-iam-authn` and `--private-ip`

The Go app connects to `localhost:5432` → the Auth Proxy intercepts and authenticates to Cloud SQL using the pod's **Workload Identity** (GSA token). No password exists anywhere in the system.

### The Zero-Password Authentication Chain

```
Go App (localhost:5432)
  → Cloud SQL Auth Proxy (sidecar)
    → Workload Identity (KSA → GSA)
      → GCP IAM Token (auto-generated, short-lived)
        → Cloud SQL IAM Authentication
          → PostgreSQL (private IP, VPC-peered)
```

**What a hacker would find if they breached the pod:**
- No password in environment variables
- No password in mounted files
- No password in Secret Manager references
- Only a service account identity that's useless outside GCP's IAM context

### Security Posture Achieved

| Requirement | Status | Implementation |
|:---|:---|:---|
| **SAMA Data Sovereignty** | ✅ | All resources in `me-central1`, private IPs only |
| **Zero Secrets in Runtime** | ✅ | IAM Auth via Cloud SQL Auth Proxy |
| **Encrypted in Transit** | ✅ | Auth Proxy handles TLS to Cloud SQL |
| **Least Privilege** | ✅ | GSA has only `cloudsql.client` + `cloudsql.instanceUser` |
| **Audit Trail** | ✅ | Every DB connection logged in GCP Cloud Audit Logs |
| **Immutable Deployments** | ✅ | Docker tags pinned to Git SHAs |
| **Shift-Left Security** | ✅ | Trivy scans block CRITICAL/HIGH CVEs |

### The Journey (Commit Timeline)

| Commit | What Changed |
|:---|:---|
| `a93e565` | Initial migration job + pipeline integration |
| `af871f1` | Increased timeout, dynamic DB IP |
| `6e09273` | CSI volume mount for secret injection |
| `ad86765` | Fixed CSI driver name, removed Spot selector |
| `be0522b` | Pipeline-created K8s secret approach |
| `5dfba4d` | Fatal on secret file read failure |
| `a221b97` | Phase B: IAM Auth + Cloud SQL Auth Proxy |
| `2fada71` | Fixed IAM DB user suffix, removed KSA from Terraform |
| `0f70a17` | IAM user SQL grants in migration |
| `f3cbfff` | Pipeline-direct migration via Auth Proxy (abandoned) |
| `7e2607b` | Init container pattern for K8s Job |
| `511b739` | URL-encode password in init container |
| `3348c9c` | Force-reset dirty DB state |
| `115cf53` | `--private-ip` on Auth Proxy sidecar |
| `d8aab88` | **Full stack live** ✅ |


---

## 🏆 Milestone: Atomic Payment Engine — First Transaction Processed

**Date:** April 2025

Successfully executed the first **ACID-compliant financial transaction** on the Sarraf Interchange. The payment engine deducted funds, calculated interchange fees, and recorded an immutable ledger entry — all within a single database transaction.

### Transaction Proof

```
 username | balance_sar
----------+-------------
 omer_dev |      949.50

     rrn      | amount | fee_amount |  status
--------------+--------+------------+-----------
 07cebf95-288 |  50.00 |       0.50 | COMPLETED
```

- **Initial Balance:** 1000.00 SAR
- **Payment Amount:** 50.00 SAR
- **Interchange Fee (1%):** 0.50 SAR
- **Total Deduction:** 50.50 SAR
- **Final Balance:** 949.50 SAR ✅

### What Was Built

| Component | File | Purpose |
|:---|:---|:---|
| Domain Models | `backend/internal/models/models.go` | UUID + Decimal structs for financial precision |
| Transfer Service | `backend/internal/service/transfer.go` | ACID payment logic with row locking |
| Payment Endpoint | `backend/main.go` (`/pay`) | HTTP handler with input validation |

### Issues Faced During This Phase

#### Issue 8: Container Name Mismatch — `exec` Failures

**Symptom:**
```
Error from server (BadRequest): container sarraf-backend is not valid for pod sarraf-backend-5fd6c57846-bkcrt
```

**Root Cause:** Attempted `kubectl exec -c sarraf-backend` but the deployment defines containers as `sarraf-api` and `cloud-sql-proxy`. The pod name (`sarraf-backend-*`) is different from the container name (`sarraf-api`).

**Fix:** Use `-c sarraf-api` for the app container or `-c cloud-sql-proxy` for the sidecar.

#### Issue 9: Distroless Image — No Shell Available

**Symptom:**
```
exec failed: unable to start container process: exec: "/bin/sh": stat /bin/sh: no such file or directory
```

**Root Cause:** The `sarraf-api` container uses Google Distroless (`gcr.io/distroless/static`), which has no shell, no package manager, and no utilities. This is by design — it minimizes attack surface but prevents `kubectl exec` for debugging.

**Fix:** Use `kubectl port-forward` to access services from the local machine instead of exec-ing into the container. For database access:
```bash
# Terminal 1: Forward Cloud SQL Proxy port
kubectl port-forward <pod> -n sarraf-dev 5432:5432

# Terminal 2: Connect with local psql
psql -h 127.0.0.1 -p 5432 -U sarraf_admin -d sarraf_interchange
```

#### Issue 10: Migration File Name Mismatch

**Symptom:** `golang-migrate` reported `no change` even after dropping `schema_migrations`.

**Root Cause:** The up/down migration files had mismatched names:
- `000001_init_sarraf_schema.up.sql`
- `000001_init.down.sql` ← different prefix

`golang-migrate` expects the name after the version number to match for up/down pairs.

**Fix:** Renamed `000001_init.down.sql` → `000001_init_sarraf_schema.down.sql`.

#### Issue 11: DATABASE_IP_PLACEHOLDER in Migration Job

**Symptom:** Migration job failed to connect — was trying to resolve literal string `DATABASE_IP_PLACEHOLDER` as a hostname.

**Root Cause:** The `migration-job.yaml` template was never updated with the actual Cloud SQL private IP.

**Fix:** Replaced `DATABASE_IP_PLACEHOLDER` with `10.20.0.3` (Cloud SQL private IP).

### ACID Compliance Verified

| Property | Implementation |
|:---|:---|
| **Atomicity** | `db.Begin()` + `defer tx.Rollback()` — all-or-nothing |
| **Consistency** | `FOR UPDATE` row lock prevents double-spending |
| **Isolation** | PostgreSQL default `READ COMMITTED` isolation level |
| **Durability** | `tx.Commit()` ensures write-ahead log flush |

### Key Lessons

15. **Container names ≠ pod names.** Always check `deployment.yaml` for actual container names before using `kubectl exec -c`.
16. **Distroless images are un-debuggable by design.** Use `port-forward` or ephemeral debug containers instead of `exec`.
17. **`golang-migrate` requires matching up/down filenames** after the version prefix. Mismatched names cause silent failures.
18. **Never use `float64` for money in Go.** `shopspring/decimal` maps exactly to PostgreSQL's `NUMERIC(18,2)` — zero rounding errors.
19. **`FOR UPDATE` is essential for financial transactions.** Without it, concurrent requests can read the same balance and double-spend.

---

## 🔮 Next Steps: Portfolio Evolution

| Phase | Goal | Technology |
|:---|:---|:---|
| **Observability** | Export `sarraf_transactions_total` metric | Prometheus + Grafana |
| **Fraud Detection** | Flag suspicious transactions by amount/frequency | Python ML microservice |
| **Service Mesh** | Encrypt backend ↔ DB traffic with mTLS | Istio on GKE |


---

## 🏆 Milestone: Phase 2 — Frontend Dashboard Deployed to GKE

**Date:** April 2025

Successfully built, containerized, and deployed the Sarraf Fintech Dashboard (Next.js) to GKE alongside the Go backend. The frontend is accessible via a LoadBalancer external IP and communicates with the backend API for real-time balance, payments, and transaction history.

### What Was Built

| Component | File | Purpose |
|:---|:---|:---|
| Dashboard Page | `frontend/src/app/page.tsx` | Balance, system health, last 5 transactions |
| Pay Page | `frontend/src/app/pay/page.tsx` | Merchant select, amount input, fee breakdown, RRN confirmation |
| History Page | `frontend/src/app/history/page.tsx` | Full transaction audit trail |
| Navbar | `frontend/src/components/Navbar.tsx` | Sarraf SVG logo, nav links, EN/AR toggle |
| Currency Formatter | `frontend/src/lib/currency.ts` | `Intl.NumberFormat('en-SA', { currency: 'SAR' })` |
| Dockerfile | `frontend/Dockerfile` | Multi-stage build (deps → build → runner) |
| CI/CD Pipeline | `.github/workflows/frontend-dev.yml` | Build, Trivy scan, push, deploy to GKE |
| K8s Deployment | `frontend/k8s/deployment.yaml` | GKE deployment with health checks |
| K8s Service | `frontend/k8s/service.yaml` | LoadBalancer on port 80 → 3000 |

---

### Issues Faced During Phase 2

#### Issue 12: Shadcn Components Not Found — Build Error

**Symptom:**
```
Module not found: Can't resolve '@/components/ui/card'
```

**Root Cause:** `npx shadcn@latest init` was run but the individual components (`card`, `table`, `input`, `select`) were never installed. Only `button` was added.

**Fix:** Installed missing components explicitly:
```bash
npx shadcn@latest add card table input select
```

**Lesson:** `shadcn init` only sets up the config — each component must be added individually with `shadcn add`.

---

#### Issue 13: CORS Error — Frontend Cannot Reach Backend

**Symptom:**
```
TypeError: Failed to fetch
```
Browser console showed CORS policy blocking requests from `localhost:3000` to `34.18.147.101`.

**Root Cause:** The Go backend had no CORS headers. Browsers enforce Same-Origin Policy, blocking cross-origin API calls without explicit `Access-Control-Allow-Origin` headers.

**Fix:** Added a CORS middleware in `backend/main.go`:
```go
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```
Switched from `http.HandleFunc` (default mux) to a custom `http.NewServeMux()` wrapped with the CORS middleware.

**Lesson:** Any frontend-backend split architecture requires CORS headers on the API. For production, replace `*` with the specific frontend domain.

---

#### Issue 14: Nested Git Repository — Frontend as Submodule

**Symptom:**
```
warning: adding embedded git repository: frontend
```

**Root Cause:** `npx create-next-app` initializes its own `.git` directory inside `frontend/`. When committed to the parent repo, Git treats it as a submodule instead of a regular directory.

**Fix:**
```bash
rm -rf frontend/.git
git rm --cached frontend
git add frontend/
```

**Lesson:** Always remove `.git` from scaffolded projects before committing to a monorepo.

---

#### Issue 15: Dark Mode — Text Invisible on Dark Background

**Symptom:** Card text, table cells, and fee columns were nearly invisible — dark text on dark background.

**Root Cause:** Shadcn's CSS variables default to light mode (`:root` has white background, dark foreground). The UI used Tailwind's `bg-zinc-950` but shadcn components used `--card-foreground` which was dark in light mode.

**Fix:** Added `dark` class to the `<html>` tag in `layout.tsx`:
```tsx
<html lang="en" className={`... dark`}>
```
This activates shadcn's `.dark` CSS variables (light text on dark backgrounds). Also changed `text-zinc-500` to `text-zinc-400` on fee columns for better contrast.

**Lesson:** Shadcn requires the `dark` class on `<html>` to activate dark mode CSS variables. Tailwind utility classes alone aren't enough for shadcn components.

---

#### Issue 16: Trivy CVEs Blocking Frontend Pipeline

**Symptom:**
```
Total: 3 (HIGH: 3, CRITICAL: 0)
- CVE-2026-28390: libcrypto3/libssl3 (OpenSSL DoS)
- CVE-2026-22184: zlib (buffer overflow)
- CVE-2026-33671: picomatch (ReDoS) — bundled in npm
```
Pipeline exited with code 1.

**Root Cause:** 
1. Alpine base image (`node:22-alpine`) shipped with outdated `libcrypto3`, `libssl3`, and `zlib` packages.
2. The `picomatch` CVE was in npm's own bundled copy at `/usr/local/lib/node_modules/npm/`, not in the app's dependencies.

**Fix:**
1. Pinned `node:22-alpine3.21` and added `RUN apk upgrade --no-cache` in all three stages to patch OS-level CVEs.
2. Removed npm and yarn from the runner stage since it only needs `node server.js`:
```dockerfile
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /opt/yarn*
```

**Lesson:** 
- Always `apk upgrade` in Dockerfiles to pick up security patches beyond what the base image ships.
- Remove unused package managers from production images — they carry their own dependency trees with potential CVEs.
- Trivy scans the entire filesystem, including system-level packages that aren't part of your app.

---

### Production Readiness Assessment

| Item | Dev Status | Prod Action Needed |
|:---|:---|:---|
| K8s manifests (namespace) | `NAMESPACE_PLACEHOLDER` via `sed` | ✅ Ready — pipeline injects per-env value |
| K8s manifests (image) | `IMAGE_PLACEHOLDER` via `sed` | ✅ Ready |
| Migration job DB IP | `10.20.0.3` hardcoded | ⚠️ Revert to `DATABASE_IP_PLACEHOLDER`, fetch from Terraform output |
| Frontend API URL | GitHub Secret `NEXT_PUBLIC_API_URL` | ⚠️ Set prod backend IP/domain in prod secrets |
| Pipeline project/cluster | Hardcoded in `backend-dev.yml` | ⚠️ Create `backend-prod.yml` with prod values |
| CORS origin | `Access-Control-Allow-Origin: *` | ⚠️ Restrict to prod frontend domain |

### Key Lessons

20. **`shadcn init` ≠ components installed.** Each UI component must be added individually with `shadcn add`.
21. **CORS middleware is mandatory** for any frontend-backend split architecture. Always handle OPTIONS preflight requests.
22. **Remove nested `.git` directories** from scaffolded projects before committing to a monorepo.
23. **Shadcn dark mode requires `dark` class on `<html>`**, not just Tailwind dark utility classes.
24. **`apk upgrade` in Dockerfiles** patches OS-level CVEs that the base image ships with.
25. **Remove unused package managers from production containers** — npm/yarn carry their own dependency trees that Trivy will flag.
26. **`NEXT_PUBLIC_*` env vars are baked at build time** in Next.js. They must be passed as `--build-arg` in Docker, not runtime env vars.


---

## 🏆 Milestone: Phase 3 — Custom Domain, SSL & GKE Ingress

**Date:** April 2025

Successfully configured custom domain routing with Google-managed SSL certificates on GKE Autopilot. The Sarraf Interchange is now live at:
- `https://sarraf.omerops.com` → Frontend Dashboard
- `https://api.omerops.com` → Backend API
- `https://omerops.com` → Frontend Landing
- SSL cert auto-renews (expires July 12, 2026)

### What Was Built

| Component | File/Resource | Purpose |
|:---|:---|:---|
| Static Global IP | `terraform/environments/dev/main.tf` | `google_compute_global_address` for persistent ingress IP |
| Managed Certificate | `frontend/k8s/managed-cert.yaml` | Google-managed SSL for 3 domains |
| GKE Ingress | `frontend/k8s/ingress.yaml` | Routes traffic to frontend/backend services |
| HTTP Load Balancing | `terraform/modules/gke/main.tf` | `addons_config.http_load_balancing` enabled |

---

### Issues Faced During Phase 3

#### Issue 17: GKE Ingress Not Assigning Address — No Events

**Symptom:**
```
NAME             CLASS   HOSTS                                            ADDRESS   PORTS   AGE
sarraf-ingress   gce     sarraf.omerops.com,api.omerops.com,omerops.com             80      37m
```
Ingress had no `ADDRESS` and `Events: <none>` for over 30 minutes.

**Root Cause:** The HTTP Load Balancing add-on was disabled on the GKE Autopilot cluster. Without it, the GCE ingress controller doesn't exist and no load balancer is created.

**Fix:** Enabled the add-on via `gcloud` and added it to Terraform for reproducibility:
```hcl
addons_config {
  http_load_balancing {
    disabled = false
  }
}
```

**Lesson:** GKE Autopilot doesn't always have HTTP Load Balancing enabled by default. Always explicitly set it in Terraform.

---

#### Issue 18: GKE Ingress Ignoring `ingressClassName` — Controller Not Processing

**Symptom:** Ingress showed `CLASS: gce` but no events, no NEGs created, no load balancer provisioned.

**Root Cause:** Per GCP documentation, GKE Ingress **only** reads the `kubernetes.io/ingress.class` annotation. The `spec.ingressClassName` field is completely ignored by the GKE ingress controller. The deprecation warning from Kubernetes is misleading — GKE explicitly states to keep using the annotation.

**Fix:** Switched from `spec.ingressClassName: "gce"` to annotation:
```yaml
annotations:
  kubernetes.io/ingress.class: "gce"
```

**Key Quote from GCP Docs:** *"Although the kubernetes.io/ingress.class annotation is deprecated in Kubernetes, GKE continues to use this annotation. You must use this annotation to identify the Ingress class."*

**Lesson:** GKE Ingress is annotation-based only. Ignore the Kubernetes deprecation warning for `kubernetes.io/ingress.class`.

---

#### Issue 19: Services Must Be ClusterIP for GKE Ingress

**Symptom:** Old LoadBalancer resources stuck deleting with `resourceNotReady` errors when switching service types.

**Root Cause:** Both frontend and backend services were `type: LoadBalancer`, which creates standalone L4 load balancers. GKE Ingress creates its own L7 load balancer and requires `ClusterIP` or `NodePort` backends.

**Fix:** Changed both services to `type: ClusterIP` and patched the running services:
```bash
kubectl patch svc sarraf-frontend-service -n sarraf-dev -p '{"spec":{"type":"ClusterIP"}}'
kubectl patch svc sarraf-backend-service -n sarraf-dev -p '{"spec":{"type":"ClusterIP"}}'
```

**Lesson:** When using GKE Ingress, backend services should be `ClusterIP`. The Ingress handles all external access. Don't mix `LoadBalancer` services with Ingress — they create conflicting LB resources.

---

#### Issue 20: SSL Certificate `FailedNotVisible` — Chicken-and-Egg

**Symptom:**
```
Domain Status:
  Domain:  sarraf.omerops.com
  Status:  FailedNotVisible
```

**Root Cause:** The ManagedCertificate was created before the Ingress had an address. Google's certificate authority tried to verify the domain but the LB wasn't serving traffic yet, so verification failed.

**Fix:** Deleted and recreated the ManagedCertificate after the Ingress had an address and backends were healthy:
```bash
kubectl delete managedcertificate sarraf-ssl-cert -n sarraf-dev
kubectl apply -f frontend/k8s/managed-cert.yaml
```

**Lesson:** Create the ManagedCertificate after the Ingress is fully provisioned with an address. If it gets stuck in `FailedNotVisible`, delete and recreate it — the controller retries automatically.

---

#### Issue 21: HTTPS Empty Reply — `allow-http: false` Before Cert Active

**Symptom:**
```
curl: (52) Empty reply from server
```
Both HTTP and HTTPS returned empty replies.

**Root Cause:** `kubernetes.io/ingress.allow-http: "false"` was set, which disables the HTTP forwarding rule. But the SSL cert was still `Provisioning`, so HTTPS also didn't work. The ingress controller even logged:
```
Error: both HTTP and HTTPS are disabled (kubernetes.io/ingress.allow-http is false and there is no valid TLS configuration)
```

**Fix:** Temporarily set `allow-http: "true"` to enable HTTP while the cert provisioned. Once the cert was `Active`, switched back to `"false"` to enforce HTTPS-only.

**Lesson:** Don't disable HTTP until the SSL cert is `Active`. The sequence is:
1. Deploy Ingress with `allow-http: "true"`
2. Wait for cert to become `Active`
3. Switch to `allow-http: "false"` to enforce HTTPS

---

#### Issue 22: SSL Cert Active But HTTPS Still Failing

**Symptom:**
```
curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to sarraf.omerops.com:443
```
ManagedCertificate showed `Status: Active` but HTTPS connections failed.

**Root Cause:** The HTTPS target proxy takes 5-10 minutes to attach the newly active cert and start serving TLS traffic. This is a GCP propagation delay, not a configuration issue.

**Fix:** Waited 10 minutes. HTTPS started working automatically.

**Lesson:** After a ManagedCertificate becomes `Active`, allow 5-10 minutes for the HTTPS proxy to start serving. Don't panic if HTTPS fails immediately after cert activation.

---

### SSL/Ingress Provisioning Timeline

| Time | Event |
|:---|:---|
| T+0 min | Ingress created, no address |
| T+8 min | `kubernetes.io/ingress.class` annotation added, controller starts syncing |
| T+10 min | Address `34.160.35.205` assigned |
| T+12 min | Backend services show `HEALTHY` |
| T+15 min | HTTP traffic working |
| T+30 min | `api.omerops.com` and `sarraf.omerops.com` cert `Active` |
| T+45 min | `omerops.com` cert `Active` |
| T+55 min | HTTPS fully operational on all domains |

### Key Lessons

27. **GKE HTTP Load Balancing add-on must be explicitly enabled** — don't assume Autopilot has it on.
28. **GKE Ingress uses annotations, not `ingressClassName`** — the Kubernetes deprecation warning is misleading for GKE.
29. **Don't mix `LoadBalancer` services with Ingress** — use `ClusterIP` for Ingress backends.
30. **Create ManagedCertificate after Ingress has an address** — otherwise cert verification fails.
31. **Keep HTTP enabled until SSL cert is Active** — disabling both HTTP and HTTPS makes the ingress unservable.
32. **HTTPS needs 5-10 min after cert activation** — GCP propagation delay for the HTTPS proxy to attach the cert.
33. **Static IP via Terraform** (`google_compute_global_address`) ensures DNS records survive ingress recreation.
