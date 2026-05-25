# Trident Icon Reference - Available Node Shapes

This is a **quick reference** for LLMs generating Trident diagrams. Use these icon names in the node syntax: `node id(iconName)[Label]`

## Usage in Grammar

```trident
%% Traditional syntax
node myServer(server)[Web Server] in backend at (50, 50)
node myDB(postgresql)[PostgreSQL DB] in backend at (100, 50)
node myLambda(aws-lambda)[Order Processor] in backend at (150, 50)
node happy(😀)[Happy Node] in backend at (200, 50)

%% Bracket-style syntax
myServer[server: Web Server] in backend at (50, 50)
myDB[postgresql: PostgreSQL DB] in backend at (100, 50)
happy[😀: Happy Node] in backend at (200, 50)
```

**Icon Types:**
- **Named icons**: Use icon names from the library below (e.g., `server`, `postgresql`)
- **Cloud Service icons**: Use provider prefix + service name (e.g., `aws-lambda`, `azure-functions`)
- **FontAwesome**: Use `fa:fa-icon-name` format (e.g., `fa:fa-globe`)
- **Emoji icons**: Use any Unicode emoji directly (e.g., `😀`, `🚀`, `⭐`, `💡`)

---

## Icon Naming Conventions

Trident supports over 3,400 icons. Instead of memorizing them all, use these **inference rules** to guess the correct ID. The system uses fuzzy matching, so logical guesses usually work.

### 1. AWS Services
**Format:** `aws-<service-name>`
- Use the full service name in kebab-case.
- **Examples:**
  - AWS Lambda → `aws-lambda`
  - Amazon EC2 → `aws-ec2`
  - Amazon S3 → `aws-s3`
  - Amazon RDS → `aws-rds`
  - AWS Fargate → `aws-fargate`
  - Amazon DynamoDB → `aws-dynamodb`

### 2. Azure Services
**Format:** `azure-<service-name>`
- Use the full service name in kebab-case.
- **Examples:**
  - Azure Functions → `azure-functions`
  - Virtual Machines → `azure-virtual-machines`
  - Cosmos DB → `azure-cosmos-db`
  - SQL Database → `azure-sql-database`
  - Blob Storage → `azure-blob-storage`

### 3. GCP Services
**Format:** `gcp-<service-name>`
- Use the full service name in kebab-case.
- **Examples:**
  - Cloud Functions → `gcp-cloud-functions`
  - Compute Engine → `gcp-compute-engine`
  - BigQuery → `gcp-bigquery`
  - Cloud Storage → `gcp-cloud-storage`
  - Cloud Run → `gcp-cloud-run`

### 4. Salesforce Products
**Format:** `sf-<product-name>`
- Use the product name in kebab-case.
- **Examples:**
  - Sales Cloud → `sf-sales`
  - Service Cloud → `sf-service`
  - Marketing Cloud → `sf-marketing`
  - Commerce Cloud → `sf-commerce`
  - Platform → `sf-platform`

### 5. Generic / Tech Stack
**Format:** `<name>`
- Use the common name of the technology in kebab-case.
- **Examples:**
  - `python`, `java`, `nodejs`, `go`, `rust`
  - `react`, `angular`, `vue`, `nextjs`
  - `docker`, `kubernetes`, `terraform`, `ansible`
  - `postgresql`, `mysql`, `mongodb`, `redis`, `elasticsearch`
  - `github`, `gitlab`, `jenkins`

### 6. Basic Infrastructure
These are generic shapes useful for high-level diagrams:
- `server`
- `database`
- `cloud`
- `disk`
- `internet`
- `firewall`
- `user`
- `users`
- `laptop`
- `mobile`
- `router`
- `switch`
- `storage`
- `cache`
- `queue`

---

## Fallback Strategy

If you are unsure of the exact icon ID:
1. **Guess logically**: `provider-service-name` is usually correct.
2. **Use a generic fallback**: If `aws-super-specific-service` might be wrong, use `server`, `cloud`, or `database`.
3. **Use an Emoji**: `⚡` for functions, `🗄️` for databases, `🌐` for web.

## Adding New Icons

Custom icons can be registered via the Trident renderer extension system. If you need a shape that doesn't exist, use the `custom` icon type and provide a `geometry:` function string.
