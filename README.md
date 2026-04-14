This **README** is designed for your GitHub repository `NdaY-Fako-Platform`. It provides a high-level overview of the architecture, the unique administrative data model for Madagascar, and the operational flows we have established.

---

# 🌿 NdaY-Fako Platform
### *Digital Governance & Circular Economy for Urban Waste Management*

**NdaY-Fako** is a serverless, full-stack ecosystem designed to transition urban waste management from manual processes to data-driven, verifiable operations. Built specifically for the administrative context of Madagascar, it bridges the gap between **National Authorities**, **Private Operators**, and **Citizens**.

---

## 🏗️ System Architecture

The platform is built on a modern, "Zero-Infrastructure" stack to ensure scalability and ease of deployment in varied connectivity environments.



### 1. Presentation Layer (Frontend)
* **Framework:** Next.js 15 (App Router) for high-performance server-side rendering.
* **UI/UX:** React + Tailwind CSS with a **Glassmorphism** aesthetic.
* **Icons:** Lucide-React.
* **Mobile-First:** Optimized for field use via QR scanning interfaces.

### 2. Application Layer (Logic)
* **Server Actions:** Secure, server-side business logic (e.g., `getPublicOperators`).
* **Webhooks:** API routes for third-party payment integration (MVola, Orange Money).
* **Role-Based Access Control (RBAC):** Distinct permissions for Citizens, Collectors, Operators, and Administrators.

### 3. Data Layer (Persistence)
* **Database:** Google Firebase Firestore (NoSQL).
* **Real-Time:** Instant dashboard updates when a bin is scanned.
* **Geo-Hierarchy:** Data is structurally aligned with the hierarchy of **Municipality → Arrondissement → Fokontany → Sector**.

---

## 🗺️ The "Ground Truth" Assessment Flow

Unlike standard apps, NdaY-Fako uses a **Pre-Deployment Assessment** to ensure operational efficiency. No truck is deployed until the "Ground Truth" is verified.



1.  **Campaign Strategy:** Admin creates an `audit_campaign` (e.g., "Tana 4 Pilot").
2.  **6-Step Stepper:** Field Agents map buildings, population density, and building types (Villa, Apartment, Commercial).
3.  **Sales Conversion:** Agents capture `salesStatus` (Accepted/Interested) to build a lead pipeline.
4.  **Plan Recommendation:** Logic layer filters the `plans` collection based on building type and estimated volume.
5.  **Validation:** Authorities approve the audit, triggering the delivery of a **QR-coded Bin**.

---

## 📂 Data Model Highlights

The Firestore schema is designed for high relationality within a NoSQL structure:

* **`audit_campaigns`**: Strategic containers for neighborhood onboarding.
* **`audits`**: Technical records of physical buildings, GPS coordinates, and potential waste volume.
* **`pickups`**: Transactional logs created by collectors scanning QR codes.
* **`impact_metrics`**: Aggregated data (Kg collected, SOM %) displayed on the public dashboard.

---

## 🚀 Key Features

* **QR-Linked Infrastructure:** Every household bin acts as a "Digital Address."
* **Automated Billing:** Subscription management based on service frequency (e.g., Villa Premium).
* **Audit Trail:** Complete traceability from the moment an agent identifies a building to the daily weight of waste collected.
* **Multi-Tenant:** Supports multiple private operators working under the same municipal umbrella.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend/Backend** | Next.js 15+ |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth |
| **Styling** | Tailwind CSS |
| **Deployment** | Vercel (Serverless) |
| **Scanning** | HTML5-QRCode |

---

## 👨‍💻 Development

### Getting Started
1.  **Clone the repo:** `git clone ...`
2.  **Install dependencies:** `npm install`
3.  **Seed the Database:** Run `node scripts/seed-firestore.js` to populate the administrative hierarchy and service plans.
4.  **Run Development:** `npm run dev`

**Built by NdaY' Individual Enterprise.**
*Engineering for a cleaner, data-driven future.*# NdaY'Fako Digital Platform
A Digital Platform for Waste Management part of NdaY'Digital Ecosystem
