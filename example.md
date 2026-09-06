# Trident 2D Examples

Complete, working examples of Trident diagrams across key domains: BPMN processes, Flowcharts, Cloud Architecture, Microservices, UML, and Swimlanes.

%%---

## Example 1: BPMN 2.0 Order Fulfillment Process (Workflow)

```trident
%% BPMN 2.0 Order Fulfillment Process

start[Order Received] shape:bpmn-start-event at (80, 200)
review[Review Order] shape:bpmn-user-task at (220, 200)
check_stock{Stock Available?} shape:bpmn-exclusive-gateway at (380, 200)
fulfill[Fulfill & Ship] shape:bpmn-service-task at (540, 200)
notify_cancel[Send Cancellation] shape:bpmn-service-task at (380, 90)
order_end[Order Completed] shape:bpmn-end-event at (700, 200)
cancel_end[Order Cancelled] shape:bpmn-end-event at (540, 90)
inventory[Inventory Store] shape:bpmn-data-store at (380, 320)

start --> review
review --> check_stock
check_stock --> |In Stock| fulfill
check_stock --> |Out of Stock| notify_cancel
fulfill --> order_end
notify_cancel --> cancel_end
fulfill ..-> |Update Inventory| inventory

click review callback "Customer service reviews order items, billing address, and fraud score."
click fulfill callback "Automated dispatch trigger sends manifest to warehouse WMS."
```

%%---

## Example 2: Algorithmic Logic Flowchart (User Verification)

```trident
%% User Verification Flowchart

start[Start Verification] shape:flowchart-stadium at (250, 60)
input[Enter Credentials] shape:flowchart-process at (250, 160)
validate{Credentials Valid?} shape:flowchart-decision at (250, 280)
db[User Directory] shape:flowchart-cylinder at (450, 280)
dashboard[Open Dashboard] shape:flowchart-process at (250, 400)
finish[Session Active] shape:flowchart-stadium at (250, 500)
retry_limit{Attempts < 3?} shape:flowchart-decision at (80, 280)
lockout[Account Locked] shape:flowchart-process at (80, 400)

start --> input
input --> validate
validate --> |Query| db
validate --> |Yes| dashboard
validate --> |No| retry_limit
retry_limit --> |Yes| input
retry_limit --> |No| lockout
dashboard --> finish

click validate callback "Bcrypt password hash comparison with salt verification."
```

%%---

## Example 3: Three-Tier Web Application (Modern Architecture)

```trident
%% Three-Tier E-Commerce Web Application

container frontend color:#4A90E2 label:"Frontend Tier"
container backend color:#E74C3C label:"Application Tier"
container data color:#27AE60 label:"Data & Caching Tier"

webapp[react: Web App] in frontend at (150, 100)
mobile[mobile: Mobile App] in frontend at (350, 100)

api[server: Express REST API] in backend at (250, 280)
worker[gear: Background Worker] in backend at (450, 280)

cache[redis: Redis Cache] in data at (150, 460)
db[postgres: PostgreSQL DB] in data at (350, 460)

webapp --> |HTTPS| api
mobile --> |HTTPS| api
api --> |Read / Write| db
api --> |Cache Query| cache
api ..-> |Enqueue Job| worker
worker --> |Persist State| db

click api callback "Node.js REST API with cluster mode enabled behind ALB."
click cache callback "Redis 7 in-memory cache for session stores and hot catalogs."
```

%%---

## Example 4: Event-Driven Microservices Platform

```trident
%% Event-Driven Microservices Architecture

container gateway color:#4A90E2 label:"API Gateway"
container services color:#9B59B6 label:"Core Microservices"
container broker color:#F39C12 label:"Event Streaming"
container storage color:#27AE60 label:"Databases"

api_gateway[server: Kong Gateway] in gateway at (250, 100)

order_svc[api: Order Service] in services at (120, 260)
payment_svc[api: Payment Service] in services at (280, 260)
notify_svc[api: Notification Service] in services at (440, 260)

kafka[kafka: Apache Kafka Broker] in broker at (280, 390)

order_db[postgres: Orders DB] in storage at (120, 500)
stripe[cloud: Stripe API] at (520, 100)

api_gateway --> |POST /orders| order_svc
order_svc --> |Persist| order_db
order_svc ==> |Process Payment| payment_svc
payment_svc ==> |Charge Card| stripe

order_svc ..-> |OrderCreated Event| kafka
kafka ..-> |Consume| notify_svc
order_svc ~~> |Telemetry Metrics| kafka

click order_svc callback "Manages customer checkout, state machine, and order life cycle."
```

%%---

## Example 5: UML Domain Model & Class Hierarchy

```trident
%% UML Domain Model & Class Architecture

container domain color:#EBF5FB label:"Order Processing Domain"

customer[user: Customer] shape:uml-actor at (80, 200)
order[Order] shape:uml-class in domain at (260, 200)
order_line[OrderLineItem] shape:uml-class in domain at (450, 200)
payment_gateway[PaymentGateway] shape:uml-interface in domain at (260, 340)
stripe_adapter[StripeAdapter] shape:uml-class in domain at (260, 460)
paypal_adapter[PayPalAdapter] shape:uml-class in domain at (450, 460)

customer --> |Places| order
order --> |1..* Aggregates| order_line
order --> |Delegates Payment| payment_gateway
stripe_adapter ==> |Implements| payment_gateway
paypal_adapter ==> |Implements| payment_gateway

click payment_gateway callback "Defines contract: authorize(amount), capture(transactionId), refund(id)."
```

%%---

## Example 6: Cross-Functional Department Swimlane Process

```trident
%% Cross-Functional Sales & Fulfillment Process

swimlane lanes at (400, 250) width:800 height:440 orientation:horizontal labels:"Customer,Sales Team,Warehouse" label:"B2B Order Workflow"

inquiry[Submit RFQ] shape:bpmn-start-event at (120, 110)
quote[Generate Quote] shape:bpmn-user-task at (260, 230)
accept{Quote Accepted?} shape:bpmn-exclusive-gateway at (400, 110)
reject_end[Quote Rejected] shape:bpmn-end-event at (540, 110)
pack[Pick & Pack Goods] shape:bpmn-task at (400, 370)
dispatch[Dispatch Carrier] shape:bpmn-service-task at (560, 370)
delivered[Order Delivered] shape:bpmn-end-event at (700, 370)

inquiry --> quote
quote --> accept
accept --> |Yes| pack
accept --> |No| reject_end
pack --> dispatch
dispatch --> delivered
```
