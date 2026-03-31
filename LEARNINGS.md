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

## Important: RBAC Must Live in the Repo

The ClusterRole and ClusterRoleBinding are stored in `backend/k8s/csi-rbac.yaml` and **must be applied from the repo via CI/CD** — not manually via `kubectl`. If the cluster is ever recreated (e.g., `terraform destroy/apply`), any RBAC applied only via `kubectl` would be lost.

In your `backend-dev.yml` workflow, apply it **before** the deployment:

```yaml
kubectl apply -f backend/k8s/csi-rbac.yaml
kubectl apply -f backend/k8s/secret-provider.yaml
kubectl apply -f backend/k8s/serviceaccount.yaml
kubectl apply -f backend/k8s/deployment.yaml
kubectl apply -f backend/k8s/service.yaml
```

This ensures the CSI driver has secrets permissions ready before the pod starts.

## Key Lessons

1. **Always URL-encode credentials** when building database connection strings — special characters in passwords will break URL parsing.
2. **GKE Secrets Store CSI driver** requires explicit RBAC permissions to sync `secretObjects` into Kubernetes Secrets. The volume mount works without it, but the K8s Secret creation does not.
3. **`objectName` in `secretObjects`** must match the `fileName` defined in the SecretProviderClass parameters, not the GCP `resourceName`.
