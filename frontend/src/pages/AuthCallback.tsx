import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

type JWTPayload = {
  sub?: string;
  email?: string;
  name?: string;
};

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token") || params.get("access_token");

    if (token) {
      localStorage.setItem("access_token", token);

      // Decode username from JWT so we don't need it as a query param
      try {
        const decoded = jwtDecode<JWTPayload>(token);
        const name = decoded.name ?? decoded.email ?? decoded.sub ?? "";
        if (name) localStorage.setItem("username", name);
      } catch (_) {
        // JWT malformed — skip, dashboard will just show no name
      }

      navigate("/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [params, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#060A10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Spinner */}
        <div
          style={{
            height: 40,
            width: 40,
            borderRadius: "50%",
            border: "2px solid rgba(34,197,94,0.2)",
            borderTopColor: "#22C55E",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: 0 }}>
          Completing sign-in…
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}