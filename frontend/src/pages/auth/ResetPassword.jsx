import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { AuthShell, FormField, Input, PrimaryButton } from "../../components/auth/AuthShell";
import { ArrowRight } from "lucide-react";
import { authService } from "../../lib/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        eyebrow="Create new password"
        title="Invalid reset link"
        subtitle="The password reset link is invalid or has expired."
        footer={<>Remember it now? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
      >
        <div className="space-y-5">
          <div className="p-4 border border-vermilion bg-vermilion/5">
            <p className="text-sm text-ink-soft">
              Please request a new password reset link.
            </p>
          </div>
          <PrimaryButton type="button" onClick={() => navigate("/forgot-password")}>
            Request new link
          </PrimaryButton>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Create new password"
        title="Password reset successful"
        subtitle="Your password has been updated."
        footer={<>Remember it now? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
      >
        <div className="space-y-5">
          <div className="p-4 border border-ink bg-card">
            <p className="text-sm text-ink-soft">
              You can now sign in with your new password. Redirecting...
            </p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create new password"
      title={<>Set a new <em className="italic">password.</em></>}
      subtitle="Make it strong. Make it memorable."
      footer={<>Remember it now? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField label="New password" hint="Min 12 characters" error={error}>
          <Input
            type="password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Confirm password" error={error}>
          <Input
            type="password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </FormField>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Resetting..." : <>Reset password <ArrowRight className="h-4 w-4" /></>}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
