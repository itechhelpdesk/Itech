// AboutPage.jsx
// Uses CSS variables set by AdminPalette (--au-red, --au-navy, --au-yellow, --au-gold)

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

const AboutPage = ({ setPage }) => {
  const team = [
    { name: "Dr. Maria Santos", role: "IT Director",      emoji: "👩‍💼" },
    { name: "Mr. Jose Reyes",   role: "Registrar Head",   emoji: "👨‍💼" },
    { name: "Ms. Ana Garcia",   role: "Finance Officer",  emoji: "👩‍💼" },
    { name: "Prof. Carlo Lim",  role: "Academic Affairs", emoji: "👨‍🏫" },
  ];

  const values = [
    { icon: "🎯", title: "Our Goal",      desc: "Zero unresolved student concerns." },
    { icon: "⚡", title: "Speed",         desc: "Response within 24–48 hours guaranteed." },
    { icon: "🤝", title: "Collaboration", desc: "6 departments working together for you." },
    { icon: "🔒", title: "Privacy",       desc: "Your data is safe and confidential." },
  ];

  const contacts = [
    { icon: "📧", label: "Email",        val: "helpdesk@school.edu" },
    { icon: "📞", label: "Hotline",      val: "(02) 8123-4567" },
    { icon: "🕐", label: "Office Hours", val: "Mon–Fri, 8AM–5PM" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ── */}
      <section className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)" }}>
        <DotPattern id="about-dots" />
        {/* Gold top accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: "linear-gradient(90deg, var(--au-yellow), var(--au-gold), var(--au-yellow))" }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "var(--au-yellow)" }}>
            ℹ️ About EduDesk
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">
            Dedicated to Student Support
          </h1>
          <p className="text-base lg:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
            EduDesk was built to bridge the gap between students and their school's support departments — making it faster, easier, and more transparent to get the help you need.
          </p>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: "var(--au-red)" }}>Our Mission</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-5">
              Making student life easier, one ticket at a time.
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              EduDesk is the official student helpdesk platform of our institution. We aim to streamline communication between students and administrative departments — eliminating long queues, missed concerns, and delayed responses.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              From IT issues to enrollment problems, scholarship queries to academic concerns — EduDesk connects you with the right department, fast.
            </p>
            <button
              onClick={() => setPage("login")}
              className="text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md"
              style={{ background: "var(--au-red)" }}
              onMouseOver={e => e.currentTarget.style.background = "var(--au-red-dark)"}
              onMouseOut={e => e.currentTarget.style.background = "var(--au-red)"}
            >
              Get Started →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition">
                <span className="text-2xl block mb-2">{v.icon}</span>
                <p className="font-bold text-gray-800 text-sm mb-1">{v.title}</p>
                <p className="text-gray-500 text-xs">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-bold text-sm uppercase tracking-widest mb-2" style={{ color: "var(--au-navy)" }}>Our People</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Meet the Support Team</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((t) => (
              <div
                key={t.name}
                className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100 hover:shadow-md transition hover:-translate-y-1"
                style={{ "--hover-border": "var(--au-red)" }}
                onMouseOver={e => e.currentTarget.style.borderColor = "var(--au-red)"}
                onMouseOut={e => e.currentTarget.style.borderColor = "#f3f4f6"}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
                  style={{ background: "rgba(0,0,0,0.05)" }}>
                  {t.emoji}
                </div>
                <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: "var(--au-red)" }}>{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Get In Touch</h2>
          <p className="text-gray-500 text-sm">Can't find what you're looking for? Reach us directly.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {contacts.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-md transition">
              <span className="text-3xl block mb-2">{c.icon}</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className="font-bold text-gray-800 text-sm">{c.val}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutPage;