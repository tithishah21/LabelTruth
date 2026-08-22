import { useState } from "react";
import { UserPlus, AlertCircle } from "lucide-react";
import "../styles/auth.css";

interface RegisterProps {
  onRegisterSuccess: (token: string, userId: string) => void;
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onRegisterSuccess, onSwitchToLogin }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      onRegisterSuccess(data.token, data.userId);
    } catch (err) {
      setError("Network error. Is the API running on localhost:4000?");
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>LabelTruth</h1>
        <p className="auth-tagline">Create your health profile.</p>

        <form onSubmit={handleRegister} className="auth-form">
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
            <small>At least 8 characters</small>
          </label>

          <label htmlFor="confirm">
            Confirm Password
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading} className="auth-button">
            <UserPlus size={18} aria-hidden="true" />
            {isLoading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <button type="button" className="link-button" onClick={onSwitchToLogin}>Log in</button>
        </p>
      </div>
    </div>
  );
}
