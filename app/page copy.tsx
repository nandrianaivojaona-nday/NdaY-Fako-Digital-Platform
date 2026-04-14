// app/page.tsx

import {
  getPublicOperators,
  getGlobalImpact,
  getOperatorImpact,
} from "@/lib/queries";

import Logo from "../components/Logo";

export default async function Home() {
  const operators = await getPublicOperators();
  const globalImpact = await getGlobalImpact();

  return (
    <>
      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <header className="header">
        <div className="header-logo">
          <Logo />
        </div>
        <h1>NdaY'Fako</h1>
        <p>Digital Waste Collection Platform</p>
        <p>Part of NdaY Ecosystem</p>
      </header>

      {/* ========================= */}
      {/* GLOBAL IMPACT */}
      {/* ========================= */}

      <section className="section">
        <h2>Global Impact</h2>
        <div className="grid-3">
          <div className="card">
            <strong>{globalImpact.households}</strong>
            <p>Households served</p>
          </div>

          <div className="card">
            <strong>{globalImpact.kg}</strong>
            <p>Kg collected</p>
          </div>

          <div className="card">
            <strong>{globalImpact.som}%</strong>
            <p>SOM</p>
          </div>
        </div>
      </section>

      {/* ========================= */}
      {/* HOW IT WORKS */}
      {/* ========================= */}

      <section className="section">
        <h2>How it works</h2>
        <div className="grid-3">
          <div className="card">Subscribe to a plan</div>
          <div className="card">QR code on bin</div>
          <div className="card">Collector scans</div>
          <div className="card">Pickup verified</div>
          <div className="card">Impact measured</div>
          <div className="card">Waste recycled</div>
        </div>
      </section>

      {/* ========================= */}
      {/* OPERATORS */}
      {/* ========================= */}

      <section className="section">
        <h2>Choose your operator</h2>

        {operators.length === 0 && <p>No operator available</p>}

        <div className="grid-3">
          {/* Test card with inline styles */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white'
          }}>
            <h3>Test Card</h3>
            <p>This should be styled</p>
          </div>

          {operators.map((op) => (
            <OperatorCard key={op.id} operator={op} />
          ))}
        </div>
      </section >

      {/* ========================= */}
      {/* ECOSYSTEM */}
      {/* ========================= */}

      <section className="section">
        <h2>NdaY Ecosystem</h2>
        <div className="grid-3">
          <div className="card">Waste → Recycling</div>
          <div className="card">Waste → Compost</div>
          <div className="card">Compost → Agriculture</div>
          <div className="card">Agriculture → Community</div>
        </div>
      </section>

      {/* ========================= */}
      {/* LOGIN */}
      {/* ========================= */}

      <footer className="section">
        <a href="/login" className="button">
          Operator / Collector / Municipality login
        </a>
      </footer>
    </>
  );
}

// =====================================
// Operator Card (SERVER)
// =====================================

async function OperatorCard({ operator }: any) {
  const impact = await getOperatorImpact(operator.id);

  return (
    <div className="card">
      <h3>{operator.name}</h3>
      <p>{operator.city}</p>
      <p>Type: {operator.type}</p>

      <div style={{ marginTop: 10 }}>
        <p>Households: {impact.households}</p>
        <p>Kg: {impact.kg}</p>
        <p>SOM: {impact.som}%</p>
      </div>

      <a href={`/operator/${operator.id}`} className="button">
        View program
      </a>
    </div>
  );
}