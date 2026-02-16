# Workload Identity Federation Setup Guide

## 1. Deploy Workload Identity with Terraform

### Dev Environment
```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply

# Copy outputs for GitHub Secrets
terraform output dev_workload_identity_provider
terraform output dev_service_account
```

### Prod Environment
```bash
cd terraform/environments/prod
terraform init
terraform plan
terraform apply

# Copy outputs for GitHub Secrets
terraform output prod_workload_identity_provider
terraform output prod_service_account
```

## 2. Add GitHub Secrets

### Repository Secrets (for Dev)
Go to: https://github.com/omermd529/sarraf-fintech-interchange/settings/secrets/actions

Add these 2 secrets:
- `GCP_WORKLOAD_IDENTITY_PROVIDER` (from dev output)
- `GCP_SERVICE_ACCOUNT` (from dev output)

### Environment Secrets (for Prod)
1. Create environment: https://github.com/omermd529/sarraf-fintech-interchange/settings/environments
   - Name: `production`
   - Add required reviewers for manual approval

2. Add these 2 secrets to the `production` environment:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` (from prod output)
   - `GCP_SERVICE_ACCOUNT_PROD` (from prod output)

## 3. Validation Commands

### Verify Workload Identity Pool
```bash
gcloud iam workload-identity-pools describe github-pool \
  --project=omerops-sarraf-dev \
  --location=global
```

### Verify OIDC Provider
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project=omerops-sarraf-dev \
  --location=global \
  --workload-identity-pool=github-pool
```

### Verify Service Account IAM Binding
```bash
gcloud iam service-accounts get-iam-policy \
  github-actions-dev@omerops-sarraf-dev.iam.gserviceaccount.com \
  --project=omerops-sarraf-dev
```

### Test Token Exchange (from GitHub Actions)
```bash
# This runs automatically in GitHub Actions
# To test manually, you need a GitHub OIDC token
gcloud iam workload-identity-pools create-cred-config \
  projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider \
  --service-account=github-actions-dev@omerops-sarraf-dev.iam.gserviceaccount.com \
  --output-file=credentials.json
```

## 4. Security Best Practices

✅ Uses Project Number (not Project ID) for provider string
✅ Attribute condition restricts to specific repository
✅ Least privilege with specific IAM roles
✅ No service account keys stored
✅ Separate service accounts per environment
✅ OIDC token exchange with short-lived credentials

## 5. Troubleshooting

### Error: "Permission denied"
Check IAM bindings:
```bash
gcloud projects get-iam-policy omerops-sarraf-dev \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-dev@"
```

### Error: "Invalid token"
Verify attribute mapping:
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project=omerops-sarraf-dev \
  --location=global \
  --workload-identity-pool=github-pool \
  --format="value(attributeMapping)"
```

### Error: "Repository not authorized"
Check attribute condition:
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project=omerops-sarraf-dev \
  --location=global \
  --workload-identity-pool=github-pool \
  --format="value(attributeCondition)"
```

## 6. GitHub Actions Workflow (Already Configured)

Your workflows already use the correct authentication:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

This automatically:
1. Requests OIDC token from GitHub
2. Exchanges it with GCP Workload Identity
3. Gets short-lived access token
4. Configures gcloud CLI.
