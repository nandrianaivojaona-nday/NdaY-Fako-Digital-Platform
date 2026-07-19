export default function ConsoleLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
  
      <div className="app-root">
  
        <div className="app-overlay">
  
          <div className="console-root">
  
  
            <aside className="console-sidebar">
  
              <h2>NdaY</h2>
  
              <a href="/console">Console</a>
  
              <a href="/console/ecosystems">
                Ecosystems
              </a>
  
              <a href="/console/orgs">
                Organizations
              </a>
  
              <a href="/console/users">
                Users
              </a>
  
              <a href="/console/api">
                API Keys
              </a>
  
            </aside>
  
  
  
            <div className="console-main">
  
              <div className="console-topbar">
  
                NdaY Platform Console
  
              </div>
  
  
              <div className="console-content">
  
                {children}
  
              </div>
  
            </div>
  
  
          </div>
  
        </div>
  
      </div>
  
    );
  }