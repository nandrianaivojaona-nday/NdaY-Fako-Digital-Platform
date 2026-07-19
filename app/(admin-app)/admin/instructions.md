## Setup Instructions

### Step 1: Add Admin SDK credentials to `.env.local`

Get your service account from Firebase Console â†’ Project Settings â†’ Service Accounts â†’ Generate new private key.

```bash
# .env.local (add these)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT**: Keep the quotes around `FIREBASE_PRIVATE_KEY` to preserve newlines.

---

### Step 2: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

---

### Step 3: Update Admin Dashboard with Link

Update `app/admin/page.tsx` to add "Manage Operators" button:

```typescript
// Add this after the stats cards

<div className="mt-6">
  <Link 
    href="/admin/operators"
    className="inline-block px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700"
  >
    Manage Operators â†’
  </Link>
</div>
```

---

## Test Flow

1. **Login as super admin** (`nandrianaivojaona@gmail.com`)
2. **Click "Manage Operators"** â†’ see NDYF01
3. **Click "+ Add Operator"**
4. **Fill form:**
   - Operator ID: `SAMVA-01`
   - Name: `SAMVA`
   - Municipality: `CUA`
   - District: `DIS04`
   - Admin Email: `admin@samva.io`
   - Password: `SAMVA2026!`
5. **Submit** â†’ creates:
   - Firestore `/operators/SAMVA-01`
   - Auth user `admin@samva.io`
   - Custom claims `{role: "operator_admin", operatorId: "SAMVA-01"}`
   - Firestore `/users/{uid}`
6. **Logout and login as `admin@samva.io`** â†’ redirects to `/operator/SAMVA-01`

---

## âœ… Story 2.2 Complete

**What works:**
- Super admin can register new operators (SAMVA, Greentsika, cooperatives)
- Auto-creates operator admin Auth user with claims
- Operators list page with status badges
- Each operator admin gets own dashboard (`/operator/{operatorId}`)

**Next**: Story 2.3 - Operator Dashboard (pickups, collectors, bins management)