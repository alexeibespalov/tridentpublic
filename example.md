# Trident 2D Examples

Complete, working examples of Trident diagrams for common architecture patterns.

%%---

## Example 1: Simple Three-Tier Web Application

```trident
%% Basic three-tier web app

container frontend color:#4A90E2 label:"Frontend"
container backend color:#E74C3C label:"Backend"
container data color:#27AE60 label:"Data Layer"

node webapp(cloud)[Web Application] in frontend at (150, 100)

node api(server)[API Server] in backend at (150, 280)
node cache(redis)[Redis Cache] in backend at (250, 280)

node db(postgres)[PostgreSQL] in data at (150, 460)

webapp -->|HTTPS| api
api -->|Query| db
api -->|Cache| cache

click webapp callback "Web application frontend"
click api callback "API server handling business logic"
```

%%---

## Example 2: Microservices E-Commerce Platform

```trident
%% E-commerce microservices architecture

container gateway color:#4A90E2 label:"API Gateway"
container services color:#E74C3C label:"Microservices"
container data color:#27AE60 label:"Data Layer"
container external color:#F39C12 label:"External Services"

%% Gateway container
node api_gateway(server)[API Gateway] in gateway at (250, 100)

%% Microservices
node user_service(api)[User Service] in services at (100, 280)
node product_service(api)[Product Service] in services at (200, 280)
node order_service(api)[Order Service] in services at (300, 280)

node payment_service(api)[Payment Service] in services at (400, 280)
node notification_service(api)[Notification] in services at (500, 280)

%% Data container
node user_db(postgres)[User DB] in data at (100, 460)
node product_db(postgres)[Product DB] in data at (200, 460)
node order_db(postgres)[Order DB] in data at (300, 460)
node message_queue(kafka)[Kafka] in data at (450, 460)

%% External services
node stripe(cloud)[Stripe] in external at (550, 280)
node sendgrid(cloud)[SendGrid] in external at (550, 340)

%% Gateway connections
api_gateway --> user_service
api_gateway --> product_service
api_gateway --> order_service

%% Service to DB connections
user_service --> user_db
product_service --> product_db
order_service --> order_db

%% Cross-service connections
order_service -->|Process Payment| payment_service
payment_service ==>|Charge| stripe

order_service ..->|Order Placed| message_queue
message_queue ..->|Consume| notification_service
notification_service ..->|Email| sendgrid

click order_service callback "Handles order creation and processing"
click payment_service callback "Processes payments via Stripe"
```

%%---

## Example 3: Serverless Blog Platform

```trident
%% Serverless architecture for blog platform

container frontend color:#4A90E2 label:"Frontend"
container serverless color:#F39C12 label:"Serverless Backend"
container storage color:#27AE60 label:"Storage"

%% Frontend
node webapp(react)[React SPA] in frontend at (150, 100)
node cdn(cdn)[CloudFront] in frontend at (300, 100)

%% Serverless functions
node api_lambda(lambda)[API Lambda] in serverless at (100, 280)
node auth_lambda(lambda)[Auth Lambda] in serverless at (200, 280)
node image_lambda(lambda)[Image Processor] in serverless at (300, 280)
node apigw(api)[API Gateway] in serverless at (400, 280)

%% Storage
node posts_db(dynamodb)[DynamoDB Posts] in storage at (100, 460)
node users_db(dynamodb)[DynamoDB Users] in storage at (200, 460)
node media_bucket(s3)[S3 Media] in storage at (300, 460)
node cache_container(redis)[ElastiCache] in storage at (400, 460)

%% Connections
webapp -->|HTTPS| cdn
cdn -->|Route| apigw
apigw --> api_lambda
apigw --> auth_lambda

api_lambda -->|Query| posts_db
auth_lambda -->|Query| users_db

webapp -->|Upload| media_bucket
media_bucket ..->|Trigger| image_lambda
image_lambda -->|Store Thumbnail| media_bucket

api_lambda -->|Cache| cache_container

click api_lambda callback "AWS Lambda function handling blog API requests"
click posts_db callback "DynamoDB table storing blog posts"
```

%%---

## Example 4: Event-Driven Order Processing

```trident
%% Event-driven order processing system

container producers color:#4A90E2 label:"Event Producers"
container messaging color:#F39C12 label:"Event Bus"
container consumers color:#E74C3C label:"Event Consumers"
container storage color:#27AE60 label:"Storage"

%% Producers (top of screen)
node api(server)[Order API] in producers at (100, 100)
node webhook(server)[Webhook Handler] in producers at (250, 100)

%% Event bus
node event_bus(kafka)[Kafka Event Bus] in messaging at (175, 220)

%% Consumers
node order_processor(lambda)[Order Processor] in consumers at (80, 340)
node inventory_updater(lambda)[Inventory Updater] in consumers at (175, 340)
node email_service(lambda)[Email Service] in consumers at (270, 340)
node analytics(lambda)[Analytics Engine] in consumers at (365, 340)

%% Storage (bottom of screen)
node order_db(postgres)[Order DB] in storage at (80, 460)
node inventory_db(postgres)[Inventory DB] in storage at (175, 460)
node data_warehouse(database)[Data Warehouse] in storage at (320, 460)

%% Producer to event bus
api ..->|Order Created| event_bus
webhook ..->|Webhook Event| event_bus

%% Event bus to consumers
event_bus ..->|Subscribe| order_processor
event_bus ..->|Subscribe| inventory_updater
event_bus ..->|Subscribe| email_service
event_bus ..->|Subscribe| analytics

%% Consumers to storage
order_processor --> order_db
inventory_updater --> inventory_db
analytics --> data_warehouse

click event_bus callback "Kafka event bus handling asynchronous events"
click order_processor callback "Lambda function processing order events"
```

%%---

## Example 5: CI/CD Pipeline

```trident
%% CI/CD deployment pipeline

container source color:#4A90E2 label:"Source Control"
container build color:#E74C3C label:"Build & Test"
container deploy color:#27AE60 label:"Deployment"
container monitoring color:#9B59B6 label:"Monitoring"

%% Source control (top of screen)
node github(github)[GitHub Repo] in source at (150, 80)

%% Build & test
node ci_server(jenkins)[Jenkins CI] in build at (100, 200)
node test_runner(ci)[Test Suite] in build at (200, 200)
node docker_build(docker)[Docker Build] in build at (300, 200)

%% Deployment
node staging(server)[Staging Server] in deploy at (100, 320)
node production(server)[Production Server] in deploy at (250, 320)
node k8s_cluster(kubernetes)[K8s Cluster] in deploy at (400, 320)

%% Monitoring (bottom of screen)
node prometheus(prometheus)[Prometheus] in monitoring at (250, 440)
node grafana(grafana)[Grafana] in monitoring at (350, 440)

%% Pipeline flow
github -->|Webhook| ci_server
ci_server -->|Run Tests| test_runner
test_runner -->|Build Image| docker_build

docker_build -->|Deploy| staging
staging ==>|Promote| production
docker_build -->|Deploy| k8s_cluster

production ..->|Metrics| prometheus
k8s_cluster ..->|Metrics| prometheus
prometheus --> grafana

click ci_server callback "Jenkins CI/CD server"
click k8s_cluster callback "Kubernetes cluster for container orchestration"
```

%%---

## Example 6: Redis Caching Pattern

```trident
%% Cache-aside pattern with Redis

container application color:#4A90E2 label:"Application Layer"
container cache color:#F39C12 label:"Cache Layer"
container database color:#27AE60 label:"Database Layer"

node api(server)[API Server] in application at (250, 100)

node redis(redis)[Redis Cache] in cache at (150, 280)
node db(postgres)[PostgreSQL] in database at (250, 460)

%% Cache flow
api -->|1. Check Cache| redis
redis -->|2. Cache MISS| api
api -->|3. Query Database| db
db -->|4. Return Data| api
api -->|5. Set Cache| redis
redis -->|6. Return Cached| api

click redis callback "Redis cache implementing cache-aside pattern"
click api callback "API server checking cache before database"
```

%%---

## Example 7: Multi-Region Deployment

```trident
%% Multi-region cloud deployment

container users color:#4A90E2 label:"Users"
container cdn color:#F39C12 label:"CDN Layer"
container regions color:#E74C3C label:"Regional Services"
container global_data color:#27AE60 label:"Global Data"

%% Users (top of screen)
node us_users(users)[US Users] in users at (100, 80)
node eu_users(users)[EU Users] in users at (300, 80)
node asia_users(users)[Asia Users] in users at (500, 80)

%% CDN
node cloudflare(cdn)[Cloudflare CDN] in cdn at (300, 200)

%% Regional deployments
node us_region(aws)[AWS US-East] in regions at (100, 320)
node eu_region(aws)[AWS EU-West] in regions at (300, 320)
node asia_region(aws)[AWS Asia-Pacific] in regions at (500, 320)

%% Global data (bottom of screen)
node global_db(database)[Global Database] in global_data at (200, 440)
node replication(database)[Read Replicas] in global_data at (400, 440)

%% User to CDN
us_users --> cloudflare
eu_users --> cloudflare
asia_users --> cloudflare

%% CDN to regions
cloudflare -->|Route| us_region
cloudflare -->|Route| eu_region
cloudflare -->|Route| asia_region

%% Regions to data
us_region --> global_db
eu_region --> global_db
asia_region --> global_db

global_db ..->|Replicate| replication

click cloudflare callback "Cloudflare CDN for global content delivery"
click global_db callback "Global database with read replicas"
```

%%---

## Example 8: Message Queue Processing

```trident
%% Background job processing with message queue

container api color:#4A90E2 label:"API Layer"
container queue color:#F39C12 label:"Message Queue"
container workers color:#E74C3C label:"Worker Processes"
container storage color:#27AE60 label:"Storage"

node api_server(server)[API Server] in api at (200, 80)

node rabbitmq(rabbitmq)[RabbitMQ] in queue at (200, 200)
node dlq(queue)[Dead Letter Queue] in queue at (320, 200)

node worker_1(lambda)[Worker 1] in workers at (100, 320)
node worker_2(lambda)[Worker 2] in workers at (200, 320)
node worker_3(lambda)[Worker 3] in workers at (300, 320)

node db(postgres)[Database] in storage at (150, 440)
node s3(s3)[S3 Storage] in storage at (250, 440)

%% API to queue
api_server ==>|Enqueue Job| rabbitmq

%% Queue to workers
rabbitmq ..->|Consume| worker_1
rabbitmq ..->|Consume| worker_2
rabbitmq ..->|Consume| worker_3

%% Failed jobs
worker_2 ..->|Failed| dlq

%% Workers to storage
worker_1 --> db
worker_2 --> db
worker_3 --> s3

click rabbitmq callback "RabbitMQ message queue for job distribution"
click dlq callback "Dead letter queue for failed jobs"
```

%%---

## Example 9: OAuth 2.0 Authentication Flow

```trident
%% OAuth 2.0 authorization code flow

container client color:#4A90E2 label:"Client Application"
container auth color:#F39C12 label:"Authorization Server"
container resource color:#E74C3C label:"Resource Server"

node webapp(react)[Web App] in client at (100, 80)
node user(users)[User] in client at (250, 80)

node auth_server(server)[Auth Server] in auth at (175, 220)
node token_endpoint(api)[Token Endpoint] in auth at (300, 220)

node api_server(server)[API Server] in resource at (175, 360)
node user_data(database)[User Data] in resource at (300, 360)

%% OAuth flow
user -->|1. Login Request| webapp
webapp -->|2. Redirect to Auth| auth_server
auth_server -->|3. User Consent| user
user -->|4. Grant Permission| auth_server
auth_server -->|5. Auth Code| webapp
webapp -->|6. Exchange Code| token_endpoint
token_endpoint -->|7. Access Token| webapp
webapp -->|8. API Request + Token| api_server
api_server -->|9. Validate Token| token_endpoint
api_server -->|10. Fetch Data| user_data
user_data -->|11. Return Data| api_server
api_server -->|12. Protected Resource| webapp

click auth_server callback "OAuth 2.0 authorization server"
click token_endpoint callback "Token endpoint for access token exchange"
```

%%---

## Example 10: Kubernetes Cluster Architecture

```trident
%% Kubernetes cluster architecture

container control color:#4A90E2 label:"Control Plane"
container worker color:#E74C3C label:"Worker Nodes"
container storage color:#27AE60 label:"Persistent Storage"

%% Control plane (top)
node api_server(kubernetes)[API Server] in control at (200, 80)
node scheduler(kubernetes)[Scheduler] in control at (100, 120)
node controller(kubernetes)[Controller Manager] in control at (300, 120)
node etcd(database)[etcd] in control at (200, 160)

%% Worker nodes
node kubelet_1(kubernetes)[Kubelet] in worker at (100, 280)
node pod_1(docker)[Pod 1] in worker at (50, 340)
node pod_2(docker)[Pod 2] in worker at (150, 340)

node kubelet_2(kubernetes)[Kubelet] in worker at (300, 280)
node pod_3(docker)[Pod 3] in worker at (250, 340)
node pod_4(docker)[Pod 4] in worker at (350, 340)

%% Storage (bottom)
node pv(disk)[Persistent Volume] in storage at (200, 440)

%% Control plane connections
api_server --> scheduler
api_server --> controller
api_server --> etcd

%% API to kubelets
api_server --> kubelet_1
api_server --> kubelet_2

%% Kubelets to pods
kubelet_1 --> pod_1
kubelet_1 --> pod_2
kubelet_2 --> pod_3
kubelet_2 --> pod_4

%% Pods to storage
pod_2 --> pv
pod_4 --> pv

click api_server callback "Kubernetes API server - control plane entry point"
click etcd callback "etcd distributed key-value store for cluster state"
```

%%---

## Example 11: Bracket-Style Syntax with Icons

```trident
%% Using bracket syntax with icons

container frontend color:#4A90E2 label:"Frontend"
container backend color:#E74C3C label:"Backend"
container data color:#27AE60 label:"Data"

%% Bracket syntax with icons (icon: label format)
webapp[react: Web Application] in frontend at (150, 100)
mobile[mobile: Mobile App] in frontend at (250, 100)

%% Can mix traditional and bracket syntax
node gateway(server)[API Gateway] in backend at (200, 280)

%% More bracket nodes with icons
cache[redis: Redis Cache] in backend at (300, 280)
db[postgres: PostgreSQL] in data at (200, 460)

%% Connections work the same
webapp -->|HTTPS| gateway
mobile -->|HTTPS| gateway
gateway -->|Query| db
gateway -->|Cache| cache

%% Cards work with all syntax styles
click webapp callback "React-based web application using bracket syntax"
click gateway callback "API Gateway using traditional syntax"
click db callback "PostgreSQL database using bracket icon syntax"
```

%%---

## Example 12: High-Level System Flow (Containers)

```trident
%% High-level flow between subsystems and containers

container client_tier color:#4A90E2 label:"Client Tier"
container security_zone color:#F39C12 label:"Security Zone"
container app_tier color:#E74C3C label:"Application Tier"
container storage_tier color:#27AE60 label:"Storage Tier"

%% Client nodes (top of screen)
node web[browser: Web Client] in client_tier at (100, 80)
node mobile[mobile: Mobile App] in client_tier at (200, 80)

%% Node to Container connection
client_tier -->|Traffic| security_zone

%% Nodes in application tier
node load_balancer(server)[Load Balancer] in app_tier at (150, 240)
node api_server(api)[REST API] in app_tier at (150, 320)

%% Container to Node connection
security_zone -->|Validated| load_balancer

%% Node to Node
load_balancer --> api_server

%% Container to Container
app_tier ==>|Data Sync| storage_tier

%% Individual node to container
api_server -->|Query| storage_tier
```

%%---

## Example 13: Swimlane — Cross-Functional Order Flow

```trident
%% Order processing flow across teams/systems using a vertical swimlane

swimlane order_flow at (400, 300) width:800 height:500 orientation:vertical labels:"Customer,Frontend,Backend,Database" label:"Order Processing"

%% Nodes positioned at each lane's column center
%% Lane centers (800px wide, 4 lanes = 200px each, starting at x=0 offset from swimlane left):
%% swimlane center x=400, half-width=400, so left edge=0
%% Col centers: 100, 300, 500, 700

node browser(react)[Place Order] at (100, 200)
node cart(server)[Cart Service] at (300, 220)
node order_svc(server)[Order Service] at (500, 200)
node order_db(postgres)[Orders DB] at (700, 220)

node confirm(react)[Confirmation] at (100, 350)
node payment(api)[Payment API] at (300, 370)
node notify(server)[Notify Service] at (500, 350)

browser -->|Submit| cart
cart -->|Create Order| order_svc
order_svc -->|Save| order_db
order_svc -->|Charge| payment
payment -->|Receipt| confirm
order_svc -->|Email| notify
```

%%---

## Example 14: Swimlane — Horizontal Team Workflow

```trident
%% Approval workflow by role using a horizontal swimlane

swimlane approval at (400, 320) width:750 height:480 orientation:horizontal labels:"Requester,Manager,Finance,System" label:"Approval Workflow"

%% Horizontal swimlane: lanes are rows, so pin Y to each row's center
%% swimlane center y=320, half-height=240, top=80, header=40
%% 3 lanes below header: usable height=440, lane height≈147
%% Row centers (approx): 159, 306, 453  — shift by swimlane top=80

node submit(users)[Submit Request] at (150, 159)
node review(users)[Review] at (350, 159)

node approve{Approve?} at (350, 306)
node reject(server)[Reject] at (550, 306)

node process(lambda)[Process Payment] at (350, 453)
node notify(server)[Notify User] at (550, 453)

submit --> review
review --> approve
approve -->|Yes| process
approve -->|No| reject
reject --> notify
process --> notify
```

%%---

## Example 15: Sequence Diagram — API Authentication Flow

```trident
%% OAuth-style authentication using a sequence diagram

sequence auth at (450, 300) width:900 height:500 participants:"Browser,API Gateway,Auth Service,User DB"

%% 4 participants, 900px wide → column width=225
%% Column centers from left edge: 112, 337, 562, 787
%% Swimlane center x=450, left edge=0, so absolute x coords match above

node login(react)[Login Form] at (112, 200)
node route(gateway)[Route Request] at (337, 220)
node validate(server)[Validate Creds] at (562, 200)
node lookup(postgres)[Fetch User] at (787, 220)

node token(server)[Issue JWT] at (562, 320)
node response(react)[Auth Response] at (112, 340)

login -->|POST /login| route
route -->|Forward| validate
validate -->|Query| lookup
lookup -->|User Record| validate
validate -->|JWT| token
token -->|200 OK + token| route
route -->|Respond| response

click validate callback "Verifies credentials and issues a signed JWT"
click route callback "API Gateway forwarding auth requests"
```

%%---

## Example 16: Text Annotations with Typography

```trident
%% Floating notes with text styles and sizing

container app color:#4A90E2 label:"Application"
node api(server)[API Service] in app at (220, 180)
node db(postgres)[Database] in app at (420, 180)
api -->|Query| db

%% Title-like annotation
text title "Data Access Flow" at (320, 50) width:360 align:center style:textBody fontSize:14 bold:true

%% Detailed multiline note (triple quotes)
text note_main """
### Notes
- Cache first, DB fallback
- Track P95 latency
""" at (560, 180) width:240 height:150 style:stickyNote fontSize:9.5 italic:true

%% Emphasis callout
text callout "Legacy path to remove" at (120, 260) width:220 style:textBody fontSize:10 underline:true strikethrough:true
```

%%---

## Tips for Creating Your Own Diagrams

### 1. Start with Layers
Define your visual zones first:
```trident
container tier1 color:#4A90E2 label:"Description"
container tier2 color:#E74C3C label:"Description"
```

### 2. Position Top-to-Bottom
Small Y values at top (user-facing), large Y at bottom (infrastructure):
```trident
container frontend color:#4A90E2 label:"Frontend"
container backend color:#E74C3C label:"Backend"
container data color:#27AE60 label:"Data"

node ui(react)[UI] in frontend at (100, 100)   %% Top (small Y = top of screen)
node api(server)[API] in backend at (100, 280)  %% Middle
node db(postgres)[DB] in data at (100, 460)     %% Bottom (large Y = bottom of screen)
```

### 3. Space Components Evenly
- Within container: 50-100 units apart (X)
- Between containers: 160-200 units apart (Y)

### 4. Use Semantic Icons
Use semantic icons from the 3,400+ library:
```trident
node webapp(react)[Frontend]      %% Use react icon
node api(server)[API]             %% Use server icon
node db(postgres)[Database]       %% Use postgres icon
```

### 5. Label Important Connections
```trident
api -->|HTTPS| backend
backend -->|SQL Query| database
queue ..->|Async Event| processor
```

### 6. Add Cards for Additional Information
```trident
node webapp(cloud)[Web App] in frontend at (150, 100)
node api(server)[API Server] in backend at (150, 280)
node db(postgres)[PostgreSQL] in data at (150, 460)

%% Add informational cards/tooltips
click webapp callback "React-based web application"
click api callback "Express.js REST API handling business logic"
click db callback "PostgreSQL database storing application data"
```

**Remember:** Cards provide rich context without cluttering the diagram visually

%%---

## See Also

- [spec.md](spec.md) - Full grammar specification
- [generator_prompt.md](generator_prompt.md) - LLM generation guide
- [icon_reference.md](icon_reference.md) - Complete icon library
