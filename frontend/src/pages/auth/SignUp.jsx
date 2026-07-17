import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthShell, FormField, Input, PrimaryButton } from "../../components/auth/AuthShell";
import { ArrowRight, UserCheck, UserX } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../lib/auth";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pendingGuests, setPendingGuests] = useState([]);
  const [linking, setLinking] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Password validation matching backend requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setFieldErrors({ password: "Password must contain uppercase, lowercase, number, and special character" });
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: `${firstName} ${lastName}`,
        email,
        password,
      });

      // Guest Member Lifecycle (Phase D, Step 6): if ExpenseFlow detected a
      // guest member with a matching name, offer to merge it into this account.
      if (result?.matchedGuests?.length) {
        setPendingGuests(result.matchedGuests);
        setLoading(false);
        return;
      }

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
        setError(errorData?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const finishSignup = () => {
    setPendingGuests([]);
    navigate("/app/ledger");
  };

  const handleLinkGuest = async (memberId) => {
    setLinking(true);
    try {
      await authService.linkGuest(memberId);
    } catch {
      /* non-fatal: the account already exists; continue */
    } finally {
      setLinking(false);
      finishSignup();
    }
  };

  if (pendingGuests.length > 0) {
    const guest = pendingGuests[0];
    return (
      <AuthShell
        eyebrow="One last thing"
        title={<>Welcome, {firstName || "friend"}.</>}
        subtitle="We may have already tracked your activity as a guest."
        footer={<>Back to <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
      >
        <div className="rounded-md border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-6 w-6 text-ledger" />
            <div>
              <div className="font-display text-lg">We found a Guest Member named &ldquo;{guest.displayName}&rdquo;.</div>
              <div className="text-sm text-ink-muted">In {guest.circleName || "a circle"} you already owe or are owed money.</div>
            </div>
          </div>
          <p className="text-sm text-ink-soft">
            Is this you? We can merge that guest into your new account — no financial history lost, no duplicate members.
          </p>
          <div className="flex gap-3">
            <PrimaryButton type="button" disabled={linking} onClick={() => handleLinkGuest(guest.memberId)}>
              {linking ? "Merging…" : <>Yes, that&rsquo;s me <UserCheck className="h-4 w-4" /></>}
            </PrimaryButton>
            <button
              type="button"
              onClick={finishSignup}
              className="h-11 inline-flex items-center gap-2 border border-border-strong rounded-md px-4 text-sm font-medium"
            >
              <UserX className="h-4 w-4" /> No, it&rsquo;s someone else
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create account · 60 seconds"
      title={<>The first group is on us.</>}
      subtitle="No credit card. Up to five members per group. Forever free."
      footer={<>Already a member? <Link to="/signin" className="underline underline-offset-4 text-ink">Sign in</Link></>}
    >
       <form className="space-y-5" onSubmit={handleSubmit}>
         {error && !Object.keys(fieldErrors).length && (
           <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
             {error}
           </div>
         )}
         <div className="grid grid-cols-2 gap-3">
           <FormField label="First name" error={fieldErrors.name}>
             <Input
               placeholder="Maya"
               value={firstName}
               onChange={(e) => setFirstName(e.target.value)}
               required
             />
           </FormField>
           <FormField label="Last name" error={fieldErrors.name}>
             <Input
               placeholder="Ortiz"
               value={lastName}
               onChange={(e) => setLastName(e.target.value)}
               required
             />
           </FormField>
         </div>
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
         <FormField label="Password" hint="Min 8 chars, with uppercase, lowercase, number, and special character" error={fieldErrors.password}>
           <Input
             type="password"
             placeholder="••••••••••••"
             autoComplete="new-password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
           />
         </FormField>
        <div className="rounded-md border border-border bg-card p-3 text-xs text-ink-muted">
          By continuing, you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy</Link>.
        </div>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Creating account..." : <>Create my account <ArrowRight className="h-4 w-4" /></>}
        </PrimaryButton>
        <button type="button" className="w-full h-11 inline-flex items-center justify-center gap-2 border border-border-strong rounded-md text-sm font-medium">
          Continue with Google
        </button>
      </form>
    </AuthShell>
  );
}