#!/bin/bash
set -e

# Variables - UPDATE THESE
GITHUB_ORG="omermd529"
GITHUB_REPO="sarraf-fintech-interchange"
PROJECT_ID_DEV="omerops-sarraf-dev"
PROJECT_ID_PROD="omerops-sarraf-prod"

echo "Setting up Workload Identity for DEV..."
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID_DEV}" \
  --location="global" \
  --display-name="GitHub Actions Pool" || true

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID_DEV}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" || true

gcloud iam service-accounts create github-actions-dev \
  --project="${PROJECT_ID_DEV}" \
  --display-name="GitHub Actions Dev" || true

gcloud projects add-iam-policy-binding ${PROJECT_ID_DEV} \
  --member="serviceAccount:github-actions-dev@${PROJECT_ID_DEV}.iam.gserviceaccount.com" \
  --role="roles/editor"

gcloud iam service-accounts add-iam-policy-binding "github-actions-dev@${PROJECT_ID_DEV}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID_DEV}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe ${PROJECT_ID_DEV} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"

echo ""
echo "DEV Workload Identity Provider:"
echo "projects/$(gcloud projects describe ${PROJECT_ID_DEV} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
echo ""
echo "DEV Service Account:"
echo "github-actions-dev@${PROJECT_ID_DEV}.iam.gserviceaccount.com"
echo ""

echo "Setting up Workload Identity for PROD..."
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID_PROD}" \
  --location="global" \
  --display-name="GitHub Actions Pool" || true

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID_PROD}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" || true

gcloud iam service-accounts create github-actions-prod \
  --project="${PROJECT_ID_PROD}" \
  --display-name="GitHub Actions Prod" || true

gcloud projects add-iam-policy-binding ${PROJECT_ID_PROD} \
  --member="serviceAccount:github-actions-prod@${PROJECT_ID_PROD}.iam.gserviceaccount.com" \
  --role="roles/editor"

gcloud iam service-accounts add-iam-policy-binding "github-actions-prod@${PROJECT_ID_PROD}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID_PROD}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe ${PROJECT_ID_PROD} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"

echo ""
echo "PROD Workload Identity Provider:"
echo "projects/$(gcloud projects describe ${PROJECT_ID_PROD} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
echo ""
echo "PROD Service Account:"
echo "github-actions-prod@${PROJECT_ID_PROD}.iam.gserviceaccount.com"
