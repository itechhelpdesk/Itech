import { useState, useEffect } from "react";
import { loadAndApplyTheme } from "../AdminDashboard/AdminPallete"; // adjust path as needed

const Navbar = ({ page, setPage }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Load saved palette (safety net if App.jsx hasn't done it yet)
  useEffect(() => { loadAndApplyTheme(); }, []);

  const navLinks = [
    { key: "home",  label: "Home" },
    { key: "about", label: "About" },
    { key: "track", label: "Track Ticket" },
  ];

  return (
    <>
      <style>{`
        :root {
          --au-red:       #DA291C;
          --au-red-dark:  #B52217;
          --au-navy:      #1B3A6B;
          --au-navy-dark: #122850;
          --au-yellow:    #F5D000;
          --au-gold:      #F0C040;
        }
        .au-navbar {
          background: var(--au-navy);
          border-bottom: 3px solid var(--au-gold);
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
        }
        .au-logo-text {
          font-weight: 900;
          color: var(--au-yellow);
          font-size: 1.25rem;
          letter-spacing: 0.05em;
        }
        .au-nav-link {
          padding: 0.4rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
          cursor: pointer;
          background: transparent;
        }
        .au-nav-link:hover {
          color: var(--au-yellow);
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
        }
        .au-nav-link.active {
          color: var(--au-yellow);
          background: rgba(255,255,255,0.1);
          border-color: var(--au-gold);
        }
        .au-signin-btn {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--au-yellow);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .au-signin-btn:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        .au-cta-btn {
          background: var(--au-red);
          color: #fff;
          font-size: 0.875rem;
          font-weight: 700;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
          transition: background 0.2s, transform 0.1s;
        }
        .au-cta-btn:hover {
          background: var(--au-red-dark);
        }
        .au-cta-btn:active {
          transform: scale(0.97);
        }
        .au-hamburger {
          background: transparent;
          border: 1.5px solid rgba(255,255,255,0.2);
          color: var(--au-yellow);
          border-radius: 8px;
          padding: 0.4rem 0.65rem;
          font-size: 1.1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .au-hamburger:hover {
          background: rgba(255,255,255,0.08);
        }
        .au-mobile-menu {
          background: var(--au-navy-dark);
          border-top: 2px solid var(--au-gold);
          padding: 1rem;
        }
        .au-mobile-link {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.65rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 2px;
        }
        .au-mobile-link:hover, .au-mobile-link.active {
          background: rgba(255,255,255,0.08);
          color: var(--au-yellow);
        }
        .au-mobile-cta {
          width: 100%;
          margin-top: 0.5rem;
          background: var(--au-red);
          color: #fff;
          font-weight: 700;
          font-size: 0.875rem;
          padding: 0.7rem 1rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .au-mobile-cta:hover {
          background: var(--au-red-dark);
        }
        .au-topbar {
          height: 3px;
          background: linear-gradient(90deg, var(--au-red), var(--au-gold), var(--au-red));
        }
      `}</style>

      <nav className="sticky top-0 z-50">
        <div className="au-topbar" />
        <div className="au-navbar">
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            {/* Logo */}
            <button onClick={() => setPage("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src="/itech.png"
                alt="iTech Logo"
                style={{ height: "110px", width: "140px", objectFit: "contain", marginTop: "10px" }}
              />
            </button>

            {/* Desktop Nav Links */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} className="hidden md:flex">
              {navLinks.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setPage(n.key)}
                  className={`au-nav-link${page === n.key ? " active" : ""}`}
                >
                  {n.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }} className="hidden md:flex">
              <button onClick={() => setPage("login")} className="au-signin-btn">
                Sign In
              </button>
              <button onClick={() => setPage("login")} className="au-cta-btn">
                Submit a Ticket →
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="au-hamburger md:hidden"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="au-mobile-menu md:hidden">
            {[
              { key: "home",  label: "🏠 Home" },
              { key: "about", label: "ℹ️ About" },
              { key: "track", label: "🔍 Track Ticket" },
            ].map((n) => (
              <button
                key={n.key}
                onClick={() => { setPage(n.key); setMenuOpen(false); }}
                className={`au-mobile-link${page === n.key ? " active" : ""}`}
              >
                {n.label}
              </button>
            ))}
            <button
              onClick={() => { setPage("login"); setMenuOpen(false); }}
              className="au-mobile-cta"
            >
              Sign In / Submit Ticket
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;