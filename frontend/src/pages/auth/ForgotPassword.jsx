import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthShell, FormField, Input, PrimaryButton } from "../../components/auth/AuthShell";
import { ArrowRight } from "lucide-react";
import { authService } from "../../lib/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Check your email"
        subtitle="We've sent a password reset link to your email address."
        footer={<>Remember it? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
      >
        <div className="space-y-5">
          <div className="p-4 border border-ink bg-card">
            <p className="text-sm text-ink-soft">
              If an account with that email exists, you'll receive a reset link shortly.
            </p>
          </div>
          <PrimaryButton type="button" onClick={() => navigate("/signin")}>
            Back to sign in
          </PrimaryButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title={<>Forgot your <em className="italic">password?</em></>}
      subtitle="We'll send you a link to reset it."
      footer={<>Remember it? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField label="Email" error={error}>
          <Input
            type="email"
            placeholder="you@household.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Sending..." : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
