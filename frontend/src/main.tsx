import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

// ─── Read env ────────────────────────────────────────────────────────────────
const googleClientId = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
)?.trim();

// Debug helpers — visible in DevTools Console
console.log("[PaySplit] origin:", window.location.origin);
console.log("[PaySplit] VITE_GOOGLE_CLIENT_ID set?", Boolean(googleClientId));
if (googleClientId) {
  console.log("[PaySplit] VITE_GOOGLE_CLIENT_ID:", googleClientId);
}

// ─── Missing env fallback UI ─────────────────────────────────────────────────
function MissingEnv({ name }: { name: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#060A10",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.04)",
          padding: 32,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          Missing environment variable
        </h2>

        <p style={{ color: "rgba(255,255,255,0.6)", margin: "0 0 20px", lineHeight: 1.6 }}>
          <code
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 13,
            }}
          >
            {name}
          </code>{" "}
          is not set or is empty. Create{" "}
          <code
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 13,
            }}
          >
            frontend/.env.local
          </code>{" "}
          and add it.
        </p>

        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: "14px 18px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
            Your current origin:
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
            {window.location.origin}
          </div>
        </div>

        <ul
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
            lineHeight: 1.8,
            paddingLeft: 20,
            margin: "0 0 20px",
          }}
        >
          <li>
            Value must end with{" "}
            <code
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 12,
              }}
            >
              .apps.googleusercontent.com
            </code>
          </li>
          <li>
            In Google Cloud Console → Credentials → OAuth Client, add this origin
            under <span style={{ color: "rgba(255,255,255,0.8)" }}>Authorized JavaScript origins</span>
          </li>
          <li>Restart the dev server after saving the env file.</li>
        </ul>

        <pre
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            color: "#86EFAC",
            overflowX: "auto",
            margin: 0,
          }}
        >
          {`${name}=YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com`}
        </pre>
      </div>
    </div>
  );
}

// ─── Mount ───────────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <MissingEnv name="VITE_GOOGLE_CLIENT_ID" />
      )}
    </BrowserRouter>
  </StrictMode>
);