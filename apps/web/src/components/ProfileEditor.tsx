import { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle } from "lucide-react";
import "../styles/profile.css";

interface HealthProfile {
  userId: string;
  fullName?: string | null;
  allergies: string[];
  medicalCondition?: string | null;
  dietType?: string | null;
}

interface ProfileEditorProps {
  token: string;
  onClose: () => void;
  onProfileSaved: (fullName: string | null) => void;
}

const ALLERGEN_OPTIONS = [
  { id: "milk", label: "Milk/Dairy" },
  { id: "peanuts", label: "Peanuts" },
  { id: "tree-nuts", label: "Tree nuts" },
  { id: "wheat", label: "Wheat" },
  { id: "soy", label: "Soy" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "sesame", label: "Sesame" },
  { id: "mustard", label: "Mustard" },
];

const MEDICAL_CONDITIONS = [
  { id: "diabetes", label: "Diabetes" },
  { id: "hypertension", label: "Hypertension" },
];

const DIET_TYPES = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "low-sodium", label: "Low-sodium" },
];

export function ProfileEditor({ token, onClose, onProfileSaved }: ProfileEditorProps) {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Local form state
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);

  // Load current profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("http://localhost:4000/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        setProfile(data);
        setFullName(data.fullName || "");
        setSelectedAllergies(data.allergies || []);
        setSelectedCondition(data.medicalCondition || null);
        setSelectedDiet(data.dietType || null);
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:4000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          allergies: selectedAllergies,
          medicalCondition: selectedCondition,
          dietType: selectedDiet,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      onProfileSaved(fullName.trim() || null);
      setSuccess("Profile saved!");
      setTimeout(onClose, 1500);
    } catch (err) {
      setError("Failed to save profile");
    }
  }

  function toggleAllergen(allergenId: string) {
    setSelectedAllergies((prev) =>
      prev.includes(allergenId)
        ? prev.filter((id) => id !== allergenId)
        : [...prev, allergenId]
    );
  }

  if (isLoading) return <div className="modal-overlay" onClick={onClose}><div className="modal-content"><p>Loading profile...</p></div></div>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Your Health Profile</h2>
        <p className="modal-subtitle">Help us personalize your ingredient analysis</p>

        <form onSubmit={handleSave} className="profile-form">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-banner">
              <CheckCircle size={18} aria-hidden="true" />
              <span>{success}</span>
            </div>
          )}

          <label htmlFor="full-name">
            Full name
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>

          {/* Allergies */}
          <fieldset>
            <legend>Allergies</legend>
            <div className="checkbox-grid">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <label key={allergen.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedAllergies.includes(allergen.id)}
                    onChange={() => toggleAllergen(allergen.id)}
                  />
                  <span>{allergen.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Medical Condition */}
          <fieldset>
            <legend>Medical Condition (optional)</legend>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="condition"
                  checked={selectedCondition === null}
                  onChange={() => setSelectedCondition(null)}
                />
                <span>None</span>
              </label>
              {MEDICAL_CONDITIONS.map((condition) => (
                <label key={condition.id} className="radio-label">
                  <input
                    type="radio"
                    name="condition"
                    value={condition.id}
                    checked={selectedCondition === condition.id}
                    onChange={() => setSelectedCondition(condition.id)}
                  />
                  <span>{condition.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Diet Type */}
          <fieldset>
            <legend>Diet Preference (optional)</legend>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="diet"
                  checked={selectedDiet === null}
                  onChange={() => setSelectedDiet(null)}
                />
                <span>None</span>
              </label>
              {DIET_TYPES.map((diet) => (
                <label key={diet.id} className="radio-label">
                  <input
                    type="radio"
                    name="diet"
                    value={diet.id}
                    checked={selectedDiet === diet.id}
                    onChange={() => setSelectedDiet(diet.id)}
                  />
                  <span>{diet.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} aria-hidden="true" />
              Save Profile
            </button>
          </div>
        </form>

        <p className="privacy-note">
          ⚠️ <strong>Privacy:</strong> Your health data is stored securely and never shared with third parties.
        </p>
      </div>
    </div>
  );
}
