import { useEffect, useState } from "react";
import { TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import "../styles/dashboard.css";

interface ExposureSummary {
  today: {
    hiddenSugarGrams: number;
    ultraProcessedCount: number;
    allergenFlagCount: number;
  };
  week: {
    hiddenSugarGrams: number;
    ultraProcessedCount: number;
    allergenFlagCount: number;
  };
}

interface DashboardProps {
  token: string;
}

export function ExposureDashboard({ token }: DashboardProps) {
  const [summary, setSummary] = useState<ExposureSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("http://localhost:4000/api/exposure/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to load");

        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError("Failed to load exposure data");
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
    // Refresh every 30 seconds
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (isLoading) {
    return (
      <div className="dashboard-card">
        <Loader2 className="spinner" aria-hidden="true" />
        <p>Loading your exposure data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card error">
        <AlertCircle size={24} aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="dashboard-card">
        <p>No scan data yet. Start scanning to see your exposure summary.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <div className="dashboard-section">
        <h3>
          <TrendingUp size={20} aria-hidden="true" />
          Today's Exposure
        </h3>

        <div className="metric-grid">
          <div className="metric">
            <div className="metric-value">{summary.today.hiddenSugarGrams}g</div>
            <div className="metric-label">Hidden sugars</div>
          </div>

          <div className="metric">
            <div className="metric-value">{summary.today.ultraProcessedCount}</div>
            <div className="metric-label">Ultra-processed scans</div>
          </div>

          <div className="metric">
            <div className="metric-value">{summary.today.allergenFlagCount}</div>
            <div className="metric-label">Allergen flags</div>
          </div>
        </div>

        {summary.today.hiddenSugarGrams > 0 && (
          <div className="insight">
            💡 You've consumed approximately {summary.today.hiddenSugarGrams}g of hidden sugars today.
            <br />
            <small>Estimate based on scanned products with flagged sweeteners.</small>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>This Week's Trends</h3>

        <div className="metric-grid">
          <div className="metric">
            <div className="metric-value">{summary.week.hiddenSugarGrams}g</div>
            <div className="metric-label">Hidden sugars (total)</div>
          </div>

          <div className="metric">
            <div className="metric-value">{summary.week.ultraProcessedCount}</div>
            <div className="metric-label">Ultra-processed</div>
          </div>

          <div className="metric">
            <div className="metric-value">{summary.week.allergenFlagCount}</div>
            <div className="metric-label">Allergen flags</div>
          </div>
        </div>

        {summary.week.ultraProcessedCount > 0 && (
          <div className="insight">
            📊 {summary.week.ultraProcessedCount} of your scans this week were flagged as ultra-processed.
          </div>
        )}
      </div>
    </div>
  );
}
