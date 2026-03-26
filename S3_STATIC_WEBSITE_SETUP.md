# VizBot Web Portal - AWS Infrastructure & Deployment

This documents the actual AWS setup for **portal.vizbot.co**, including S3, CloudFront, and deployment procedures.

## AWS Account

- **Account ID**: 717703978334
- **IAM User**: apurv_nigam
- **CLI Profile**: `--profile personal`

## Architecture Overview

```
Users
  │
  └── portal.vizbot.co ──► CloudFront (E2ZFV4CW9Y78CR) ──► S3: portal.vizbot.co (ap-south-1)
```

- The S3 bucket is **not publicly accessible** — only CloudFront can read from it (via OAC)
- All user traffic goes through CloudFront with HTTPS
- 403/404 errors are rewritten to `/index.html` for React Router SPA routing

## S3 Bucket

### `portal.vizbot.co`

- **Region**: ap-south-1 (Mumbai)
- **Website hosting**: Enabled, index document = `index.html`
- **Public access**: Blocked (BlockPublicAcls=true, IgnorePublicAcls=true, BlockPublicPolicy=true, RestrictPublicBuckets=true)
- **Encryption**: Default (AES256)
- **Versioning**: Not enabled

#### Bucket Policy

```json
{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::portal.vizbot.co/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::717703978334:distribution/E2ZFV4CW9Y78CR"
        }
      }
    }
  ]
}
```

## CloudFront Distribution

- **Distribution ID**: `E2ZFV4CW9Y78CR`
- **Domain**: `d3rh2eafvr9z0x.cloudfront.net`
- **Alias**: `portal.vizbot.co`
- **Origin**: `portal.vizbot.co.s3.ap-south-1.amazonaws.com`
- **Access**: Origin Access Control (OAC) — ID `E2RWYYPQYN71ER`
- **Certificate**: Wildcard `*.vizbot.co` (ACM ARN: `arn:aws:acm:us-east-1:717703978334:certificate/05374138-5e25-4b1a-b540-dab6e645ee8a`)
- **SSL**: SNI-only, TLSv1.2_2021 minimum
- **HTTP Version**: HTTP/2
- **Compression**: Enabled
- **Default Root Object**: `index.html`
- **Cache Policy**: Managed `CachingOptimized` (`658327ea-f89d-4fab-a63d-7e88639e58f6`)
- **Price Class**: All edge locations
- **Status**: Deployed

### Custom Error Responses (SPA Routing)

| Error Code | Response Path | Response Code | Cache TTL |
|------------|--------------|---------------|-----------|
| 403        | /index.html  | 200           | 10s       |
| 404        | /index.html  | 200           | 10s       |

## DNS

- **Hosted Zone**: `Z0823822WOV8IS9ZGY7P` (vizbot.co)
- **Record**: `portal.vizbot.co` → A record (alias to CloudFront distribution `d3rh2eafvr9z0x.cloudfront.net`)
- **CloudFront Hosted Zone ID**: `Z2FDTNDATAQYW2` (global constant for all CloudFront distributions)

## Deployment

### Quick Deploy

```bash
./deploy.sh
```

This script will:
1. Warn if there are uncommitted changes
2. Build the app (`npm run build`)
3. Write `version.json` into `dist/` with git commit, branch, and timestamp
4. Clean old hashed assets from S3
5. Upload new assets with immutable cache headers
6. Upload `index.html` and `version.json` with no-cache headers
7. Sync remaining static files
8. Invalidate CloudFront cache for `/index.html` and `/version.json`
9. Git tag the commit (e.g. `deploy-20260316-143022`) and push the tag

### Manual Deploy

```bash
# Build
npm run build

# Upload hashed assets (immutable cache)
aws s3 rm "s3://portal.vizbot.co/assets/" --recursive --profile personal
aws s3 cp ./dist/assets/ "s3://portal.vizbot.co/assets/" --recursive \
  --cache-control "public, max-age=31536000, immutable" \
  --profile personal

# Upload index.html (no cache)
aws s3 cp ./dist/index.html "s3://portal.vizbot.co/index.html" \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile personal

# Sync remaining files
aws s3 sync ./dist "s3://portal.vizbot.co/" --size-only --delete \
  --exclude "assets/*" --exclude "index.html" --exclude "version.json" \
  --profile personal

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E2ZFV4CW9Y78CR \
  --paths "/index.html" "/version.json" \
  --profile personal
```

### Check What's Currently Deployed

```bash
curl https://portal.vizbot.co/version.json
```

## Infrastructure Setup Commands (Reference)

These are the exact commands that were run on 2026-03-16 to create the infrastructure from scratch.

### 1. Create S3 Bucket

```bash
aws s3api create-bucket \
  --bucket portal.vizbot.co \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1 \
  --profile personal
```

### 2. Block Public Access

```bash
aws s3api put-public-access-block \
  --bucket portal.vizbot.co \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile personal
```

### 3. Enable Static Website Hosting

```bash
aws s3 website s3://portal.vizbot.co --index-document index.html --profile personal
```

### 4. Create Origin Access Control (OAC)

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "oac-portal.vizbot.co",
    "Description": "OAC for portal.vizbot.co S3 bucket",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' --profile personal
```

Result: OAC ID `E2RWYYPQYN71ER`

### 5. Create CloudFront Distribution

```bash
aws cloudfront create-distribution --profile personal --distribution-config '{
  "CallerReference": "portal-vizbot-co-1773688318",
  "Comment": "portal.vizbot.co - VizBot Web Portal",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Aliases": {
    "Quantity": 1,
    "Items": ["portal.vizbot.co"]
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-portal.vizbot.co",
        "DomainName": "portal.vizbot.co.s3.ap-south-1.amazonaws.com",
        "OriginAccessControlId": "E2RWYYPQYN71ER",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-portal.vizbot.co",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:717703978334:certificate/05374138-5e25-4b1a-b540-dab6e645ee8a",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2",
  "PriceClass": "PriceClass_All"
}'
```

Result: Distribution ID `E2ZFV4CW9Y78CR`, domain `d3rh2eafvr9z0x.cloudfront.net`

### 6. Set Bucket Policy (Allow CloudFront OAC)

```bash
aws s3api put-bucket-policy --bucket portal.vizbot.co --profile personal --policy '{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::portal.vizbot.co/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::717703978334:distribution/E2ZFV4CW9Y78CR"
        }
      }
    }
  ]
}'
```

### 7. Create DNS Record (Route 53)

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0823822WOV8IS9ZGY7P \
  --profile personal \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "portal.vizbot.co",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d3rh2eafvr9z0x.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }'
```

## Useful Commands

### Inspect S3

```bash
# List bucket contents
aws s3 ls s3://portal.vizbot.co/ --profile personal

# List all files recursively with sizes
aws s3 ls s3://portal.vizbot.co/ --recursive --human-readable --profile personal

# Check website config
aws s3api get-bucket-website --bucket portal.vizbot.co --profile personal

# Check bucket policy
aws s3api get-bucket-policy --bucket portal.vizbot.co --profile personal
```

### Inspect CloudFront

```bash
# List distributions
aws cloudfront list-distributions --profile personal \
  --query "DistributionList.Items[*].{Id:Id,Domain:DomainName,Aliases:Aliases.Items,Status:Status}" \
  --output table

# Get distribution details
aws cloudfront get-distribution --id E2ZFV4CW9Y78CR --profile personal

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E2ZFV4CW9Y78CR \
  --paths "/*" \
  --profile personal
```

## Related Infrastructure

| Resource | Details |
|----------|---------|
| `vizbot.co` | Main VizBot app — separate S3 bucket + CloudFront (`E1TF69KJ0946CV`) |
| `apurv.vizbot.co` | Personal site — separate S3 bucket + CloudFront (`E3D8CF6QKIOU6X`) |
| `*.vizbot.co` cert | Wildcard ACM certificate covering all subdomains |

## Cost Estimate

- **S3 Storage** (ap-south-1): ~$0.025/GB/month
- **CloudFront**: ~$0.14/GB transfer (India), first 1TB/month free
- **Requests**: ~$0.0075 per 10,000 HTTPS requests
- **Total**: Likely <$1/month for low traffic
