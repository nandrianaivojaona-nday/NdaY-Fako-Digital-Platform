// app/page.tsx

import {
  getPublicOperators,
  getGlobalImpact,
  getOperatorImpact,
} from "@/lib/queries";

export default async function Home() {
  const operators = await getPublicOperators();
  const globalImpact = await getGlobalImpact();

  return (
    <div className="app-root">                     {/* Background image */}
      <div className="app-overlay">                 {/* Dark overlay + padding */}
        <div className="page-container">            {/* Centered container */}
          {/* HEADER */}
          <header className="header">
            <h1>NdaY'Fako</h1>
            <p>Digital Waste Collection Platform</p>
            <p>Part of NdaY Ecosystem</p>
          </header>

          {/* GLOBAL IMPACT */}
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

          {/* HOW IT WORKS */}
          <section className="section">
            <h2>How it works</h2>
            <ul>
              <li>Subscribe to a waste collection plan</li>
              <li>Your bin receives a QR code</li>
              <li>Collectors scan at pickup</li>
              <li>Collection is verified digitally</li>
              <li>Impact is measured</li>
              <li>Waste enters NdaY ecosystem</li>
            </ul>
          </section>

          {/* OPERATORS */}
          <section className="section">
            <h2>Choose your operator</h2>
            {operators.length === 0 && <p>No operator available</p>}
            <div className="grid-3">
              {operators.map((op) => (
                <OperatorCard key={op.id} operator={op} />
              ))}
            </div>
          </section>

          {/* ECOSYSTEM */}
          <section className="section">
            <h2>NdaY Ecosystem</h2>
            <ul>
              <li>Waste → Recycling</li>
              <li>Waste → Compost</li>
              <li>Compost → Agriculture</li>
              <li>Agriculture → Community</li>
            </ul>
          </section>

          {/* LOGIN */}
          <footer className="section" style={{ marginTop: 'auto' }}>
            <a href="/login" className="button">
              Operator / Collector / Municipality login
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}

async function OperatorCard({ operator }: any) {
  const impact = await getOperatorImpact(operator.id);

  return (
    <div className="card">
      <h3>{operator.name}</h3>
      <p>{operator.city}</p>
      <p>Type: {operator.type}</p>
      <p>Households: {impact.households}</p>
      <p>Kg: {impact.kg}</p>
      <p>SOM: {impact.som}%</p>
      <a href={`/operator/${operator.id}`} className="button">
        View program
      </a>
    </div>
  );
}