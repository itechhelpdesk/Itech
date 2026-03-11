// HomePage.jsx
// Uses CSS variables set by AdminPalette (--au-red, --au-navy, --au-yellow, --au-gold)
// Colors update live when admin changes the palette.

const DotPattern = ({ id }) => (
  <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id={id} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700;800&display=swap');
  body { font-family: 'Source Sans 3', sans-serif; }
  .au-heading { font-family: 'Playfair Display', serif; }
`;

const HomePage = ({ setPage }) => {
  const features = [
    { icon: "🎫", title: "Submit a Ticket",      desc: "Report your concern in seconds. No need to fall in line — just fill out the form and we'll get to you ASAP.",      colorVar: "var(--au-red)"   },
    { icon: "📊", title: "Track Your Ticket",    desc: "Get real-time updates on the status of your concern. Know exactly where your ticket stands anytime.",             colorVar: "var(--au-navy)"  },
    { icon: "🏢", title: "Multiple Departments", desc: "Route your concern to IT, Registrar, Finance, Academic Affairs, Library, and more — all in one place.",           colorVar: "var(--au-red-dark)" },
    { icon: "⚡", title: "Fast Response",        desc: "Our support staff responds within 24–48 hours. Urgent concerns are flagged for immediate action.",                colorVar: "var(--au-navy)"  },
    { icon: "📱", title: "Anytime, Anywhere",    desc: "Access EduDesk from your phone, tablet, or laptop. No app needed — works right in your browser.",                colorVar: "var(--au-red-dark)" },
    { icon: "🔒", title: "Secure & Private",     desc: "Your data and concerns are kept confidential. Only authorized staff can view your tickets.",                      colorVar: "var(--au-navy-dark)" },
  ];

  const steps = [
    { num: "01", title: "Sign In",          desc: "Log in using your Student ID or school email.",                                       colorVar: "var(--au-red)"      },
    { num: "02", title: "Submit a Ticket",  desc: "Choose a category, describe your concern, and attach files if needed.",               colorVar: "var(--au-navy)"     },
    { num: "03", title: "Track Progress",   desc: "Monitor your ticket status in real-time from your dashboard.",                        colorVar: "var(--au-red-dark)" },
    { num: "04", title: "Get Resolved",     desc: "Receive updates and resolution directly from our support team.",                      colorVar: "var(--au-navy)"     },
  ];

  const stats = [
    { val: "2,400+", label: "Tickets Resolved",    bgVar: "var(--au-red)"      },
    { val: "98%",    label: "Satisfaction Rate",    bgVar: "var(--au-navy)"     },
    { val: "<24h",   label: "Average Response",     bgVar: "var(--au-red-dark)" },
    { val: "6",      label: "Support Departments",  bgVar: "var(--au-navy)"     },
  ];

  const departments = [
    { icon: "💻", label: "IT Support",  colorVar: "var(--au-red)"       },
    { icon: "📋", label: "Registrar",   colorVar: "var(--au-navy)"      },
    { icon: "💰", label: "Finance",     colorVar: "var(--au-red-dark)"  },
    { icon: "📚", label: "Academic",    colorVar: "var(--au-navy)"      },
    { icon: "🏛️", label: "Library",    colorVar: "var(--au-red-dark)"  },
    { icon: "🎓", label: "Scholarship", colorVar: "var(--au-navy-dark)" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF8", fontFamily: "'Source Sans 3', sans-serif" }}>
      <style>{styles}</style>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 60%, var(--au-red-dark) 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Gold accent bar at top */}
        <div style={{ height: "5px", background: "linear-gradient(90deg, var(--au-yellow), var(--au-gold), var(--au-yellow))", position: "absolute", top: 0, left: 0, right: 0 }} />
        <DotPattern id="hero-dots" />
        <div style={{ position: "absolute", bottom: "-60px", right: "-40px", width: "300px", height: "300px", background: "var(--au-red)", borderRadius: "50%", opacity: 0.2 }} />
        <div style={{ position: "absolute", top: "-40px", left: "-40px", width: "220px", height: "220px", background: "var(--au-yellow)", borderRadius: "50%", opacity: 0.1 }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: "1152px", margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
            color: "var(--au-yellow)", fontSize: "13px", fontWeight: 700,
            padding: "6px 16px", borderRadius: "999px", marginBottom: "24px",
            letterSpacing: "0.05em",
          }}>
            🎓 Official Student Helpdesk Portal
          </div>
          <h1 className="au-heading" style={{ fontSize: "clamp(2.2rem, 5vw, 3.75rem)", fontWeight: 900, color: "#FFFFFF", lineHeight: 1.15, marginBottom: "24px" }}>
            Get Support.<br />
            <span style={{ color: "var(--au-yellow)" }}>Fast & Easy.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto 40px", lineHeight: 1.7 }}>
            EduDesk is your one-stop student helpdesk portal. Submit concerns, track ticket status, and receive updates from your school's support departments — all in one place.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setPage?.("login")}
              style={{
                background: "var(--au-yellow)", color: "#1A1A1A", fontWeight: 800,
                padding: "14px 32px", borderRadius: "14px", fontSize: "14px",
                border: "none", cursor: "pointer",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                transition: "transform 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              🎫 Submit a Ticket
            </button>
            <button
              onClick={() => setPage?.("track")}
              style={{
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.35)",
                color: "#FFFFFF", fontWeight: 700, padding: "14px 32px",
                borderRadius: "14px", fontSize: "14px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              🔍 Track My Ticket
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 32px", marginTop: "-32px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: s.bgVar, borderRadius: "18px", padding: "24px",
              textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#FFFFFF", marginBottom: "4px", fontFamily: "'Playfair Display', serif" }}>{s.val}</p>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: "1152px", margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ color: "var(--au-red)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>Why EduDesk?</p>
          <h2 className="au-heading" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 900, color: "#1A1A1A" }}>
            Everything you need,<br />in one portal.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#FFFFFF", borderRadius: "20px", padding: "28px",
                border: "1px solid #E8E0D0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "transform 0.2s, box-shadow 0.2s", cursor: "default",
              }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
            >
              <div style={{
                width: "52px", height: "52px", background: f.colorVar,
                borderRadius: "14px", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "24px", marginBottom: "16px",
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 800, color: "#1A1A1A", marginBottom: "8px", fontSize: "15px" }}>{f.title}</h3>
              <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: "#FFFFFF", borderTop: "1px solid #E8E0D0", borderBottom: "1px solid #E8E0D0", padding: "80px 32px" }}>
        <div style={{ height: "4px", background: "linear-gradient(90deg, var(--au-red), var(--au-yellow), var(--au-navy))", maxWidth: "200px", margin: "0 auto 48px", borderRadius: "2px" }} />
        <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ color: "var(--au-navy)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>Simple Process</p>
            <h2 className="au-heading" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 900, color: "#1A1A1A" }}>How it works</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "32px" }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative" }}>
                <div style={{
                  width: "64px", height: "64px", background: s.colorVar,
                  borderRadius: "18px", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "#FFFFFF",
                  fontWeight: 900, fontSize: "18px", marginBottom: "16px",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {s.num}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ position: "absolute", top: "32px", left: "60%", width: "100%", height: "2px", background: "#E8E0D0" }} />
                )}
                <h3 style={{ fontWeight: 800, color: "#1A1A1A", marginBottom: "8px", fontSize: "15px" }}>{s.title}</h3>
                <p style={{ color: "#777", fontSize: "13px", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPARTMENTS ── */}
      <section style={{ maxWidth: "1152px", margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ color: "var(--au-red-dark)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>We've Got You Covered</p>
          <h2 className="au-heading" style={{ fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 900, color: "#1A1A1A" }}>Support Departments</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "16px" }}>
          {departments.map((d) => (
            <div
              key={d.label}
              style={{
                background: "#FFFFFF", borderRadius: "18px", padding: "24px 12px",
                textAlign: "center", border: "2px solid rgba(0,0,0,0.05)",
                cursor: "default", transition: "transform 0.2s, border-color 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = d.colorVar; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.05)"; }}
            >
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "10px" }}>{d.icon}</span>
              <p style={{ fontSize: "11px", fontWeight: 800, color: d.colorVar, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{
          background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)",
          borderRadius: "28px", padding: "60px 48px", textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "5px", background: "linear-gradient(90deg, var(--au-yellow), var(--au-gold))" }} />
          <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", background: "var(--au-yellow)", borderRadius: "50%", opacity: 0.1 }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className="au-heading" style={{ color: "#FFFFFF", fontSize: "clamp(1.6rem, 3vw, 2.5rem)", fontWeight: 900, marginBottom: "16px" }}>
              Got a concern?<br />We're here to help.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "32px", fontSize: "14px", maxWidth: "400px", margin: "0 auto 32px" }}>
              Don't stress out. Submit your ticket now and our support team will get back to you within 24 hours.
            </p>
            <button
              onClick={() => setPage?.("login")}
              style={{
                background: "var(--au-yellow)", color: "#1A1A1A", fontWeight: 800,
                padding: "14px 36px", borderRadius: "14px", fontSize: "14px",
                border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}
            >
              🎫 Submit a Ticket Now
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#1A1A1A", borderTop: "4px solid var(--au-red)", padding: "32px" }}>
        <div style={{
          maxWidth: "1152px", margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "var(--au-red)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🎓</div>
            <span style={{ fontWeight: 900, color: "var(--au-yellow)", fontSize: "16px", fontFamily: "'Playfair Display', serif" }}>EduDesk</span>
          </div>
          <p style={{ color: "#666", fontSize: "12px" }}>© 2025 EduDesk · Arellano University. All rights reserved.</p>
          <div style={{ display: "flex", gap: "20px" }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <button key={l} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#888", transition: "color 0.15s" }}
                onMouseOver={e => e.currentTarget.style.color = "var(--au-yellow)"}
                onMouseOut={e => e.currentTarget.style.color = "#888"}
              >{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;