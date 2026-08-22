import { useState } from "react";
import { LogIn, AlertCircle } from "lucide-react";
import "../styles/auth.css";

interface LoginProps {
  onLoginSuccess: (token: string, userId: string) => void;
  onSwitchToRegister: () => void;
}

export function LoginPage({ onLoginSuccess, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.token, data.userId);
    } catch (err) {
      setError("Network error. Is the API running on localhost:4000?");
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>LabelTruth</h1>
        <p className="auth-tagline">Decode your ingredients.</p>

        <form onSubmit={handleLogin} className="auth-form">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <label htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </label>

          <label htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading} className="auth-button">
            <LogIn size={18} aria-hidden="true" />
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <button type="button" className="link-button" onClick={onSwitchToRegister}>Sign up</button>
        </p>
      </div>
    </div>
  );
}
