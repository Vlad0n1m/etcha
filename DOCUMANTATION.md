[7 tools called]

# Project Documentation – Front‑end (Next.js) Overview  
*Prepared to guide the design of a matching back‑end API.*

---

## 1️⃣ High‑level Summary  

| Aspect | Details |
|--------|---------|
| **Framework** | Next.js 15 (app router) with TypeScript |
| **Styling** | Tailwind CSS + custom UI components (`src/components/ui/*`) |
| **State / Data** | All data is currently **hard‑coded** in the front‑end (test fixtures). The UI expects a REST‑style back‑end that supplies the same shape of data. |
| **Key Pages** | • Home (`/`) – list of events with filters  <br>• Event detail (`/event/:id`) – full event view, ticket purchase  |
| **Wallet Integration** | Uses `@solana/wallet-adapter-react` to detect a connected Solana wallet before allowing a purchase. |
| **Future Back‑end Needs** | • CRUD for events <br>• Ticket inventory & purchase flow <br>• User / wallet authentication <br>• Optional organizer profile management |

---

## 2️⃣ Core Data Model  

The front‑end works with a single **Event** entity. Below is the exact TypeScript shape extracted from the code.

```typescript
// src/app/event/[id]/page.tsx (lines 11‑28)
interface EventData {
    id: string
    title: string
    company: string
    price: number               // price in USDC (integer, e.g. 20000 = 20 k USDC)
    date: string                // ISO‑date (YYYY‑MM‑DD)
    time: string                // HH:mm (24‑h)
    ticketsAvailable: number
    imageUrl: string
    category: string
    description: string
    fullAddress: string
    organizer: {
        name: string
        avatar: string
        description: string
    }
    schedule?: string[]         // optional array of agenda items
}
```

A **lighter** version is used for the event list (the `EventCard` component).  

```typescript
// src/components/EventCard.tsx (lines 9‑20)
interface EventCardProps {
    id: string
    title: string
    company: string
    price: number
    date: string
    time?: string
    ticketsAvailable: number
    imageUrl: string
    category: string
    isLoading?: boolean
}
```

> **Note:** The front‑end also expects a **filter** value that matches the `category` field (lower‑cased). See the filter definition below.

---

## 3️⃣ UI‑driven API Specification  

### 3.1 GET `/api/events` – List all events  

| Query Parameter | Description | Example |
|-----------------|-------------|---------|
| `category` (optional) | Filter by event `category` (case‑insensitive). If omitted, returns all events. | `?category=blockchain` |
| `date` (optional) | Filter by exact `date` (ISO string). | `?date=2024-03-15` |

**Response (200)**  

```json
[
  {
    "id": "1",
    "title": "Arcium's <encrypted> Side Track",
    "company": "Arcium",
    "price": 20000,
    "date": "2024-03-15",
    "time": "19:00",
    "ticketsAvailable": 150,
    "imageUrl": "/logo.png",
    "category": "Blockchain"
  },
  …
]
```

*Only the fields required by `EventCard` are returned. The back‑end may include extra fields; the front‑end will ignore them.*

### 3.2 GET `/api/events/:id` – Detailed event data  

**Response (200)** – Full `EventData` shape (see §2).  

```json
{
  "id": "1",
  "title": "Arcium's <encrypted> Side Track",
  "company": "Arcium",
  "price": 20000,
  "date": "2024-03-15",
  "time": "19:00",
  "ticketsAvailable": 150,
  "imageUrl": "/logo.png",
  "category": "Blockchain",
  "description": "Join us for an exclusive deep dive …",
  "fullAddress": "Tech Conference Center, 123 Innovation Street, San Francisco, CA 94105",
  "organizer": {
    "name": "Arcium Team",
    "avatar": "/logo.png",
    "description": "Leading blockchain privacy solutions provider"
  },
  "schedule": [
    "19:00 - Welcome & Introduction",
    "19:15 - Technical Deep Dive",
    "20:30 - Q&A Session",
    "21:00 - Networking"
  ]
}
```

### 3.3 POST `/api/events/:id/purchase` – Buy tickets  

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | **Yes** (Bearer token derived from the connected Solana wallet) | `Bearer <wallet‑signed‑jwt>` |

| Body (JSON) | Description |
|-------------|-------------|
| `quantity` (number) | Number of tickets the user wants to buy (must be ≥ 1 and ≤ `ticketsAvailable`). |
| `walletAddress` (string) | Public key of the Solana wallet (mirrors the front‑end `useWallet().publicKey`). |

**Response (200 – success)**  

```json
{
  "orderId": "ord_12345",
  "eventId": "1",
  "quantity": 2,
  "totalPrice": 40000,
  "status": "confirmed"
}
```

**Error Cases**  

| Status | Condition | Body |
|--------|-----------|------|
| 400 | `quantity` out of range or missing fields | `{ "error": "Invalid quantity" }` |
| 401 | Missing/invalid auth token | `{ "error": "Unauthenticated" }` |
| 409 | Not enough tickets left | `{ "error": "Insufficient tickets" }` |
| 500 | Internal server error | `{ "error": "Purchase failed" }` |

### 3.4 GET `/api/filters/categories` – Available filter categories (optional)  

Returns an array of strings that the UI can use to build the filter bar.  

```json
["All","Blockchain","AI/ML","Web3","Development","Marketing","Community"]
```

> The front‑end already hard‑codes this list (see `src/components/EventFilters.tsx` lines 11‑18), but exposing it via an endpoint makes the UI future‑proof.

---

## 4️⃣ Authentication & Wallet Flow  

The UI uses **Solana wallet adapter**:

```tsx
// src/app/event/[id]/page.tsx (lines 7‑8)
import { useWallet } from "@solana/wallet-adapter-react"
...
const { connected } = useWallet()
```

When a user clicks **Buy**, the component checks `connected`. If false, it opens `WalletDrawer` (a UI component) to prompt the user to connect a wallet.  

**Back‑end expectation**  

1. The front‑end should obtain a **signed message** (or JWT) from the wallet after connection.  
2. This token is sent in the `Authorization: Bearer …` header of the purchase request.  
3. The back‑end validates the signature / JWT against the supplied `walletAddress`.  

*Implementation tip*: Use Solana’s `verifySignature` or a server‑side library like `@solana/web3.js` to verify that the token was signed by the private key belonging to `walletAddress`.

---

## 5️⃣ Component‑Level Interaction Summary  

| Component | What it needs from the API | Where it is used |
|-----------|----------------------------|-----------------|
| **Home (`src/app/page.tsx`)** | `GET /api/events` (optionally with `category` filter) → feeds `testEvents`‑like array. | Renders the banner carousel, filter bar, and a list of `EventCard`s. |
| **EventCard (`src/components/EventCard.tsx`)** | Receives a single event object (list view). No direct API call – data comes from Home. |
| **EventFilters (`src/components/EventFilters.tsx`)** | Optional: `GET /api/filters/categories` to populate filter items. Currently hard‑coded. |
| **Event Detail (`src/app/event/[id]/page.tsx`)** | `GET /api/events/:id` → full event data. <br> `POST /api/events/:id/purchase` → ticket purchase. | Shows detailed info, schedule, venue, organizer, and purchase UI. |
| **WalletDrawer (`src/components/WalletDrawer.tsx`)** | No API; just UI for wallet connection. |
| **Utility (`src/lib/utils.ts`)** | Pure client‑side helper (`cn`). No API impact. |

---

## 6️⃣ Suggested Back‑end Architecture  

| Layer | Recommended Tech | Reason |
|-------|------------------|--------|
| **API Server** | Node.js (Express / Fastify) **or** Go / Rust (any language you prefer) | Matches the JavaScript ecosystem; easy to generate OpenAPI spec. |
| **Database** | PostgreSQL (or any relational DB) – tables: `events`, `organizers`, `tickets`, `orders` | Relational model fits the event‑ticket domain and supports atomic inventory updates. |
| **Auth** | Verify Solana signatures on each request (stateless). Store wallet address as the user identifier. | No password‑based login needed; wallet is the identity. |
| **Business Logic** | - **GET /events**: read from `events` (join organizer for list view). <br> - **GET /events/:id**: join organizer + schedule. <br> - **POST /events/:id/purchase**: transactionally decrement `ticketsAvailable`, create an `orders` row, return order ID. | Guarantees consistency (no overselling). |
| **Rate Limiting / DDoS** | Apply per‑wallet IP throttling. | Prevent abuse of the purchase endpoint. |
| **OpenAPI / Swagger** | Auto‑generate docs from route definitions. | Front‑end developers can import the spec directly. |

---

## 7️⃣ OpenAPI (Swagger) Sketch  

Below is a minimal OpenAPI 3.0 snippet that you can expand.

```yaml
openapi: 3.0.3
info:
  title: Etcha Events API
  version: 1.0.0
servers:
  - url: https://api.etcha.example.com
paths:
  /events:
    get:
      summary: List events
      parameters:
        - in: query
          name: category
          schema:
            type: string
          description: Filter by category (case‑insensitive)
        - in: query
          name: date
          schema:
            type: string
            format: date
          description: Filter by exact date
      responses:
        '200':
          description: Array of events (list view)
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/EventListItem'
  /events/{id}:
    get:
      summary: Get detailed event data
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Full event object
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Event'
  /events/{id}/purchase:
    post:
      summary: Purchase tickets for an event
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [quantity, walletAddress]
              properties:
                quantity:
                  type: integer
                  minimum: 1
                walletAddress:
                  type: string
      responses:
        '200':
          description: Purchase succeeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '400':
          description: Invalid request
        '401':
          description: Unauthenticated
        '409':
          description: Not enough tickets
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    EventListItem:
      type: object
      properties:
        id: {type: string}
        title: {type: string}
        company: {type: string}
        price: {type: integer}
        date: {type: string, format: date}
        time: {type: string}
        ticketsAvailable: {type: integer}
        imageUrl: {type: string}
        category: {type: string}
    Event:
      allOf:
        - $ref: '#/components/schemas/EventListItem'
        - type: object
          properties:
            description: {type: string}
            fullAddress: {type: string}
            organizer:
              type: object
              properties:
                name: {type: string}
                avatar: {type: string}
                description: {type: string}
            schedule:
              type: array
              items: {type: string}
    OrderResponse:
      type: object
      properties:
        orderId: {type: string}
        eventId: {type: string}
        quantity: {type: integer}
        totalPrice: {type: integer}
        status: {type: string, enum: [confirmed, pending, failed]}
```

---

## 8️⃣ Mapping Front‑end Code to Back‑end Requirements  

| Front‑end File | Line(s) | Back‑end Requirement |
|----------------|---------|----------------------|
| `src/app/page.tsx` | 12‑28 | **GET `/api/events`** – provide the same fields used in `testEvents`. |
| `src/components/EventCard.tsx` | 9‑20 | Consumes the list view fields; no extra endpoint needed. |
| `src/components/EventFilters.tsx` | 11‑18 | Optional **GET `/api/filters/categories`** (currently hard‑coded). |
| `src/app/event/[id]/page.tsx` | 11‑28 | **GET `/api/events/:id`** – full `EventData`. |
| `src/app/event/[id]/page.tsx` | 124‑131 | **POST `/api/events/:id/purchase`** – ticket purchase flow, requires wallet auth. |
| `src/app/event/[id]/page.tsx` | 7‑8 | Wallet detection – back‑end must accept a signed token that proves ownership of the wallet address. |
| `src/lib/utils.ts` | – | Pure client helper; no back‑end impact. |

---

## 9️⃣ Non‑functional Considerations  

1. **Idempotency** – The purchase endpoint should be idempotent for the same `orderId` (if you decide to let the client generate a UUID).  
2. **Rate limiting** – Prevent a malicious client from hammering the purchase endpoint.  
3. **CORS** – Allow the front‑end origin (`http://localhost:3000` during dev, your production domain in prod).  
4. **Data Validation** – Use a schema validator (e.g., `zod` or `Joi`) to enforce the shape of incoming JSON.  
5. **Testing** – Write integration tests that mimic the front‑end flow: fetch list → fetch detail → purchase with a mock wallet signature.  

---

## 10️⃣ Next Steps for Back‑end Development  

1. **Create the database schema** (events, organizers, tickets, orders).  
2. **Implement the three core endpoints** (`GET /events`, `GET /events/:id`, `POST /events/:id/purchase`).  
3. **Add wallet‑signature verification** middleware for the purchase route.  
4. **Generate the OpenAPI spec** (the YAML above can be the starting point).  
5. **Deploy** (Vercel, Railway, Fly.io, etc.) and configure CORS / environment variables.  
6. **Update the front‑end** to replace the hard‑coded `testEvents` with real API calls (e.g., using `fetch` or `axios`).  

---

## 11️⃣ Quick Reference – Code Snippets  

### Event data definition (front‑end)  

```typescript
// src/app/event/[id]/page.tsx (11‑28)
interface EventData {
    id: string
    title: string
    company: string
    price: number
    date: string
    time: string
    ticketsAvailable: number
    imageUrl: string
    category: string
    description: string
    fullAddress: string
    organizer: {
        name: string
        avatar: string
        description: string
    }
    schedule?: string[]
}
```

### Event card props (list view)  

```typescript
// src/components/EventCard.tsx (9‑20)
interface EventCardProps {
    id: string
    title: string
    company: string
    price: number
    date: string
    time?: string
    ticketsAvailable: number
    imageUrl: string
    category: string
    isLoading?: boolean
}
```

### Filter items (hard‑coded)  

```typescript
// src/components/EventFilters.tsx (11‑18)
const filterItems = [
  { label: "All", value: "all", icon: Globe },
  { label: "Blockchain", value: "blockchain", icon: Code },
  { label: "AI/ML", value: "ai/ml", icon: Brain },
  { label: "Web3", value: "web3", icon: Network },
  { label: "Development", value: "development", icon: Code2 },
  { label: "Marketing", value: "marketing", icon: Megaphane },
  { label: "Community", value: "community", icon: Users },
];
```

### Purchase button logic (front‑end)  

```typescript
// src/app/event/[id]/page.tsx (124‑131)
const handleBuyClick = () => {
    if (!connected) {
        setIsWalletDrawerOpen(true);
    } else {
        // TODO: call POST /api/events/:id/purchase
        console.log("Processing purchase...", {
            eventId: event.id,
            quantity: ticketQuantity,
            totalPrice,
        });
    }
};
```

---

### 📌 TL;DR  

*The front‑end expects a simple REST API that serves events, detailed event data, and a ticket‑purchase endpoint secured by a Solana‑wallet signature. The data model is fully described above, and the OpenAPI sketch gives you a ready‑to‑implement contract.*  

Feel free to ask for deeper details (e.g., database schema, JWT generation, or sample server code). Happy building!