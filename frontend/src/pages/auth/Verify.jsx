import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthShell, PrimaryButton } from "../../components/auth/AuthShell";
import { Check, X } from "lucide-react";
import { authService } from "../../lib/auth";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError("Invalid verification link");
        setLoading(false);
        return;
      }

      try {
        await authService.verifyEmail(token);
        setSuccess(true);
        setTimeout(() => navigate("/signin"), 3000);
      } catch (err) {
        setError(err.response?.data?.error?.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  if (loading) {
    return (
      <AuthShell
        eyebrow="Verify your email"
        title="Verifying..."
        subtitle="Please wait while we verify your email address."
      >
        <div className="space-y-6">
          <div className="border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 mx-auto border-2 border-ink rounded-full mb-4 animate-pulse" />
            <p className="text-ink-soft">Verifying your email address...</p>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Verify your email"
        title={<>Email <em className="italic">verified!</em></>}
        subtitle="Your account has been successfully verified."
        footer={<>Ready to go? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
      >
        <div className="space-y-6">
          <div className="border border-ink bg-card p-8 text-center">
            <div className="h-16 w-16 mx-auto grid place-items-center border-2 border-ledger bg-ledger text-paper rounded-full mb-4">
              <Check className="h-8 w-8" />
            </div>
            <p className="text-ink-soft mb-6">
              Your email has been verified successfully. You can now sign in to your account.
            </p>
            <PrimaryButton type="button" onClick={() => navigate("/signin")}>
              Go to sign in
            </PrimaryButton>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Verify your email"
      title="Verification failed"
      subtitle="We couldn't verify your email address."
      footer={<>Need help? <Link to="/help" className="underline underline-offset-4 text-ink">Contact support</Link></>}
    >
      <div className="space-y-6">
        <div className="border-2 border-vermilion bg-vermilion/5 p-8 text-center">
          <div className="h-16 w-16 mx-auto grid place-items-center border-2 border-vermilion text-vermilion rounded-full mb-4">
            <X className="h-8 w-8" />
          </div>
          <p className="text-ink-soft mb-2">{error}</p>
          <p className="text-sm text-ink-muted mb-6">
            The verification link may have expired or is invalid. Please request a new verification email.
          </p>
          <PrimaryButton type="button" onClick={() => navigate("/signin")}>
            Go to sign in
          </PrimaryButton>
        </div>
      </div>
    </AuthShell>
  );
}
