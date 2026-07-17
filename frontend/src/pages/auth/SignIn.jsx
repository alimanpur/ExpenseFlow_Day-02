import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthShell, FormField, Input, PrimaryButton } from "../../components/auth/AuthShell";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await login({ email, password });
      navigate("/app/ledger");
    } catch (err) {
      const errorData = err.response?.data?.error;
      if (errorData?.details) {
        // Field-specific validation errors
        const fieldErrorsMap = {};
        errorData.details.forEach((detail) => {
          const field = detail.path?.[0];
          if (field) {
            fieldErrorsMap[field] = detail.message;
          }
        });
        setFieldErrors(fieldErrorsMap);
        setError(errorData.message || "Please fix the errors below");
      } else {
        setError(errorData?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in · returning member"
      title={<>Welcome back to a <em className="italic">balanced</em> book.</>}
      subtitle="Pick up where the math left off."
      footer={<>New here? <Link to="/signup" className="underline underline-offset-4 text-ink">Create account</Link></>}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && !Object.keys(fieldErrors).length && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <FormField label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            placeholder="you@household.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Password" error={fieldErrors.password} hint={<Link to="/forgot-password" className="underline underline-offset-2">Forgot?</Link>}>
          <Input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-ink" defaultChecked />
          Keep me signed in on this device
        </label>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Signing in..." : <>Continue <ArrowRight className="h-4 w-4" /></>}
        </PrimaryButton>
        <div className="relative py-2"><div className="h-px bg-border" /><span className="absolute inset-0 grid place-items-center"><span className="px-3 bg-background text-xs text-ink-muted font-mono">OR</span></span></div>
        <button type="button" className="w-full h-11 inline-flex items-center justify-center gap-2 border border-border-strong rounded-md text-sm font-medium">
          Continue with Google
        </button>
        <button type="button" className="w-full h-11 inline-flex items-center justify-center gap-2 border border-border-strong rounded-md text-sm font-medium">
          Continue with Apple
        </button>
      </form>
    </AuthShell>
  );
}
