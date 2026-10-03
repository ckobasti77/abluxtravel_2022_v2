"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowRight, CircleAlert, Eye, EyeOff, LogOut, ShieldCheck } from "lucide-react";
import { useSitePreferences } from "./site-preferences-provider";
import { Badge, Button, ButtonLink, Field, Input, Stamp } from "./ui";
import { cn } from "./ui/cn";
import { type AuthMode } from "../lib/auth-routing";
import { useSession } from "../lib/use-session";

type AuthPortalProps = {
  defaultMode?: AuthMode;
  requestedMode?: AuthMode;
  nextPath?: string | null;
};

type AuthErrorCode =
  | "invalid_credentials"
  | "user_exists"
  | "too_many_attempts"
  | "account_disabled";

// Convex Auth forwards the server error message; the code is a substring.
const toAuthErrorCode = (error: unknown): AuthErrorCode => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("TOO_MANY_ATTEMPTS")) return "too_many_attempts";
  if (message.includes("ACCOUNT_DISABLED")) return "account_disabled";
  if (message.includes("USER_EXISTS")) return "user_exists";
  return "invalid_credentials";
};

const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
const REDIRECT_FALLBACK_MS = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ICON = { strokeWidth: 1.5, "aria-hidden": true } as const;

const toSafePath = (value: string | null | undefined) => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

/** Portal copy (field labels and error messages stay in dictionary.auth). */
const COPY = {
  sr: {
    overline: { signin: "Prijava", signup: "Registracija", session: "Nalog" },
    titleA: { signin: "Prijavite se na ", signup: "Otvorite ", session: "Već ste " },
    titleEm: { signin: "nalog", signup: "nalog", session: "prijavljeni" },
    intro: {
      signin: "Unesite email adresu i lozinku kojom ste otvorili nalog.",
      signup: "Za nalog su dovoljni ime, prezime, email adresa i lozinka.",
      session: "Možete da nastavite tamo gde ste stali ili da se odjavite.",
    },
    modes: "Prijava ili registracija",
    nextHint: "Posle prijave vraćamo Vas na stranicu koju ste otvorili.",
    hasAccount: "Već imate nalog?",
    processing: "Obrada u toku…",
    brand: "ABLux Travel, početna",
    links: "Brze veze",
  },
  en: {
    overline: { signin: "Sign in", signup: "Sign up", session: "Account" },
    titleA: { signin: "Sign in to your ", signup: "Open an ", session: "You are " },
    titleEm: { signin: "account", signup: "account", session: "signed in" },
    intro: {
      signin: "Enter the email address and password you registered with.",
      signup: "All you need is your name, email address and a password.",
      session: "You can continue where you left off or sign out.",
    },
    modes: "Sign in or sign up",
    nextHint: "After signing in we will take you back to the page you opened.",
    hasAccount: "Already have an account?",
    processing: "Processing…",
    brand: "ABLux Travel, home",
    links: "Quick links",
  },
} as const;

export default function AuthPortal({
  defaultMode = "signin",
  requestedMode,
  nextPath,
}: AuthPortalProps) {
  const router = useRouter();
  const session = useSession();
  const { dictionary, language } = useSitePreferences();
  const { signIn, signOut } = useAuthActions();
  const copy = COPY[language];

  const resolvedMode = requestedMode ?? defaultMode;
  const resolvedNextPath = useMemo(() => toSafePath(nextPath), [nextPath]);

  const [mode, setMode] = useState<AuthMode>(resolvedMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState<AuthErrorCode | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [website, setWebsite] = useState("");
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [syncedMode, setSyncedMode] = useState<AuthMode>(resolvedMode);

  // Switching between sign-in and sign-up clears errors and passwords.
  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setAuthError(null);
    setValidationError(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  // Follow a new mode from the URL (adjusted during render, not in an effect).
  if (syncedMode !== resolvedMode) {
    setSyncedMode(resolvedMode);
    if (mode !== resolvedMode) switchMode(resolvedMode);
  }

  const serverErrorText = useMemo(() => {
    if (!authError) return null;
    if (authError === "user_exists") return dictionary.auth.userExists;
    if (authError === "too_many_attempts") return dictionary.auth.tooManyAttempts;
    if (authError === "account_disabled") return dictionary.auth.accountDisabled;
    return dictionary.auth.invalidCredentials;
  }, [authError, dictionary.auth]);

  const roleLabel =
    session?.role === "owner"
      ? dictionary.auth.roleOwner
      : session?.role === "editor"
        ? dictionary.auth.roleEditor
        : dictionary.auth.roleCustomer;

  // After a successful sign-in, wait for the verified session (users.me) to
  // pick the destination; fall back after a few seconds.
  useEffect(() => {
    if (!pendingRedirect) return;
    if (session) {
      router.replace(resolvedNextPath ?? (session.isStaff ? "/admin" : "/"));
      router.refresh();
      return;
    }
    const timer = window.setTimeout(() => {
      router.replace(resolvedNextPath ?? "/");
      router.refresh();
    }, REDIRECT_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [pendingRedirect, resolvedNextPath, router, session]);
  const destinationAfterAuth = resolvedNextPath ?? "/";

  const validateInput = (): string | null => {
    if (mode === "signup") {
      if (firstName.trim().length < MIN_NAME_LENGTH) {
        return dictionary.auth.firstNameTooShort;
      }
      if (lastName.trim().length < MIN_NAME_LENGTH) {
        return dictionary.auth.lastNameTooShort;
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      return dictionary.auth.invalidEmail;
    }

    if (!password.trim()) {
      return dictionary.auth.requiredFields;
    }

    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      return dictionary.auth.passwordTooShort;
    }

    if (mode === "signup" && password !== confirmPassword) {
      return dictionary.auth.passwordMismatch;
    }

    return null;
  };

  const handleModeChange = (nextMode: AuthMode) => {
    if (mode === nextMode) return;
    switchMode(nextMode);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || session || pendingRedirect) {
      return;
    }

    const validationMessage = validateInput();
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }

    setSubmitting(true);
    setValidationError(null);
    setAuthError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      await signIn(
        "password",
        mode === "signin"
          ? { flow: "signIn", email: cleanEmail, password }
          : {
              flow: "signUp",
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: cleanEmail,
              password,
              website,
            }
      );
      setPendingRedirect(true);
    } catch (error) {
      setAuthError(toAuthErrorCode(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth?mode=signin");
    router.refresh();
  };

  const submitLabel = submitting || pendingRedirect
    ? copy.processing
    : mode === "signin"
      ? dictionary.auth.signInButton
      : dictionary.auth.signUpButton;

  const switchPrompt = mode === "signin" ? dictionary.auth.noAccount : copy.hasAccount;
  const switchLabel = mode === "signin" ? dictionary.auth.signUpTitle : dictionary.auth.signInTitle;

  const view = session ? "session" : mode;
  const errorText = validationError ?? serverErrorText;
  const visibilityLabel = showPassword ? dictionary.auth.hidePassword : dictionary.auth.showPassword;
  const VisibilityIcon = showPassword ? EyeOff : Eye;

  return (
    <main id="main-content" className="pg auth">
      <div className="auth-desk">
        <section className="auth-sheet ui-paper" aria-labelledby="auth-title">
          <div className="auth-sheet__head">
            <Link href="/" className="auth-brand" aria-label={copy.brand}>
              <Image src="/logo-light.avif" alt="" width={301} height={318} className="auth-brand__logo" priority />
              <span className="auth-brand__wordmark" aria-hidden="true">
                <strong>ABlux</strong>
                <small>Travel</small>
              </span>
            </Link>
            <Stamp className="auth-sheet__stamp" shape="round" tone="teal" eyebrow="ABLux" code="Beograd" detail="2022" decorative />
          </div>

          <p className="auth-sheet__overline">{copy.overline[view]}</p>
          <h1 id="auth-title" className="auth-sheet__title">
            {copy.titleA[view]}
            <em>{copy.titleEm[view]}</em>
          </h1>
          <p className="auth-sheet__intro">{copy.intro[view]}</p>

          <hr className="auth-sheet__perf" />

          {session ? (
            <div className="auth-session">
              <p className="auth-session__label">{dictionary.auth.signedInAs}</p>
              <p className="auth-session__name">{session.displayName}</p>
              <p className="auth-session__email">{session.email}</p>
              <div className="auth-session__meta">
                <Badge tone="route">
                  <ShieldCheck {...ICON} />
                  {roleLabel}
                </Badge>
                <span>{dictionary.auth.sessionReady}</span>
              </div>

              <div className="auth-session__actions">
                <ButtonLink href={destinationAfterAuth} variant="primary" block icon={<ArrowRight {...ICON} />}>
                  {dictionary.auth.continueButton}
                </ButtonLink>
                {session.isStaff ? (
                  <ButtonLink href="/admin" variant="secondary" block>
                    {dictionary.nav.admin}
                  </ButtonLink>
                ) : null}
                <Button variant="secondary" block onClick={handleSignOut} iconStart={<LogOut {...ICON} />}>
                  {dictionary.nav.signOut}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-modes" role="group" aria-label={copy.modes}>
                <button
                  type="button"
                  className={cn("auth-modes__btn", mode === "signin" && "is-active")}
                  aria-pressed={mode === "signin"}
                  onClick={() => handleModeChange("signin")}
                >
                  {dictionary.auth.signInTitle}
                </button>
                <button
                  type="button"
                  className={cn("auth-modes__btn", mode === "signup" && "is-active")}
                  aria-pressed={mode === "signup"}
                  onClick={() => handleModeChange("signup")}
                >
                  {dictionary.auth.signUpTitle}
                </button>
              </div>

              {resolvedNextPath ? <p className="auth-next">{copy.nextHint}</p> : null}

              <form onSubmit={handleSubmit} className="auth-form">
                {mode === "signup" ? (
                  <div className="auth-form__split">
                    <Field label={dictionary.auth.firstName}>
                      <Input
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        autoComplete="given-name"
                        disabled={submitting}
                        required
                      />
                    </Field>
                    <Field label={dictionary.auth.lastName}>
                      <Input
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        autoComplete="family-name"
                        disabled={submitting}
                        required
                      />
                    </Field>
                  </div>
                ) : null}

                <Field label={dictionary.auth.email}>
                  <Input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={submitting}
                    required
                  />
                </Field>

                <Field label={dictionary.auth.password} hint={mode === "signup" ? dictionary.auth.passwordHint : undefined}>
                  <div className="auth-password">
                    <Input
                      className="auth-password__input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      disabled={submitting}
                      required
                    />
                    <button
                      type="button"
                      className="auth-password__toggle"
                      aria-label={visibilityLabel}
                      title={visibilityLabel}
                      onClick={() => setShowPassword((previous) => !previous)}
                      disabled={submitting}
                    >
                      <VisibilityIcon {...ICON} />
                    </button>
                  </div>
                </Field>

                {mode === "signup" ? (
                  <Field label={dictionary.auth.confirmPassword}>
                    <div className="auth-password">
                      <Input
                        className="auth-password__input"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        disabled={submitting}
                        required
                      />
                      <button
                        type="button"
                        className="auth-password__toggle"
                        aria-label={visibilityLabel}
                        title={visibilityLabel}
                        onClick={() => setShowPassword((previous) => !previous)}
                        disabled={submitting}
                      >
                        <VisibilityIcon {...ICON} />
                      </button>
                    </div>
                  </Field>
                ) : null}

                {mode === "signup" ? (
                  <div aria-hidden="true" className="form-honeypot">
                    <label>
                      Website
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </label>
                  </div>
                ) : null}

                <div aria-live="polite">
                  {errorText ? (
                    <p className="auth-notice" role="alert">
                      <CircleAlert {...ICON} />
                      <span>{errorText}</span>
                    </p>
                  ) : null}
                </div>

                <Button type="submit" variant="primary" block disabled={submitting} aria-busy={submitting || pendingRedirect || undefined}>
                  {submitLabel}
                </Button>
              </form>

              <p className="auth-switch">
                {switchPrompt}{" "}
                <button
                  type="button"
                  className="auth-switch__btn"
                  onClick={() => handleModeChange(mode === "signin" ? "signup" : "signin")}
                  disabled={submitting}
                >
                  {switchLabel}
                </button>
              </p>
            </>
          )}
        </section>

        <nav className="auth-links" aria-label={copy.links}>
          <Link href="/">{dictionary.nav.home}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/kontakt">{dictionary.nav.contact}</Link>
        </nav>
      </div>
    </main>
  );
}
