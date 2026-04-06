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
