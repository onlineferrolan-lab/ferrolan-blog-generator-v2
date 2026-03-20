import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/");
      } else {
        setError(data.error || "Error de autenticación");
        setPassword("");
      }
    } catch {
      setError("Error de conexión");
    }

    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Ferrolan · Acceso</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0F0F0F;
          font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        input:focus {
          border-color: #EF4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
          outline: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.4s ease; }
      `}</style>

      <div style={{ animation: "fadeIn 0.4s ease", width: "100%", maxWidth: 380, padding: "0 1.5rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <img
            src="/logo-ferrolan.png"
            alt="Ferrolan"
            style={{ height: 44, objectFit: "contain", filter: "brightness(1.2)", marginBottom: "1rem" }}
          />
          <div
            style={{
              background: "#EF4444",
              display: "inline-block",
              padding: "0.3rem 1rem",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              color: "#FFF",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Herramienta interna
          </div>
        </div>

        {/* Login card */}
        <div
          className={error ? "shake" : ""}
          style={{
            background: "#171717",
            border: "1px solid #333",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#111",
              padding: "0.85rem 1.5rem",
              borderBottom: "1px solid #333",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F1F1F1" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span
              style={{
                color: "#F1F1F1",
                fontWeight: 700,
                fontSize: "0.88rem",
                fontFamily: "'Oswald', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Acceso
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "1.75rem 1.5rem 1.5rem" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#F1F1F1",
                display: "block",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduce la contraseña..."
              autoFocus
              style={{
                width: "100%",
                border: "1px solid #333",
                borderRadius: 10,
                padding: "0.85rem 1rem",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                color: "#F1F1F1",
                background: "#1E1E1E",
                marginBottom: "1rem",
              }}
            />

            {error && (
              <div
                style={{
                  background: "#1C1517",
                  border: "1px solid #7F1D1D",
                  borderRadius: 8,
                  padding: "0.6rem 0.85rem",
                  color: "#EF4444",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              style={{
                width: "100%",
                background: loading ? "#DC2626" : "#EF4444",
                color: "#FFF",
                border: "none",
                borderRadius: 10,
                padding: "0.85rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = "#DC2626")}
              onMouseOut={(e) => !loading && (e.currentTarget.style.background = "#EF4444")}
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.78rem",
            color: "#555",
            lineHeight: 1.5,
          }}
        >
          Generador de blog · Solo uso interno
        </div>
      </div>
    </>
  );
}

// Force SSR — this page must not be statically pre-rendered
export async function getServerSideProps() {
  return { props: {} };
}
