"use client";

import { useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ROLE_LABELS, type Role } from "../../../../convex/lib/roles";
import { PageIntro, Panel, SkeletonRows } from "../../../../components/admin/kit";
import { useSitePreferences } from "../../../../components/site-preferences-provider";
import { Button, Field, Input, Select, StatusDot, useToast } from "../../../../components/ui";
import { useSession } from "../../../../lib/use-session";

type Language = "sr" | "en";

const COPY = {
  sr: {
    breadcrumbSettings: "Podešavanja",
    title: "Korisnici",
    subtitle: "Vaš nalog, promena lozinke i uloge zaposlenih.",
    myAccount: "Moj nalog",
    role: "Uloga",
    changePassword: "Promena lozinke",
    currentPassword: "Trenutna lozinka",
    newPassword: "Nova lozinka",
    confirmPassword: "Potvrdite novu lozinku",
    passwordRule: "Najmanje 8 karaktera. Ostale prijave na ovaj nalog biće odjavljene.",
    savePassword: "Sačuvaj lozinku",
    saving: "Čuvanje…",
    passwordSaved: "Lozinka je promenjena. Ostale sesije su odjavljene.",
    mismatch: "Nove lozinke se ne poklapaju.",
    tooShort: "Nova lozinka mora imati najmanje 8 karaktera.",
    wrongCurrent: "Trenutna lozinka nije tačna.",
    tooMany: "Previše neuspešnih pokušaja. Sačekajte nekoliko minuta.",
    genericError: "Izmena nije uspela. Pokušajte ponovo.",
    usersTitle: "Korisnici i uloge",
    usersHint:
      "Novi zaposleni se prvo registruje na /auth (Registracija), a zatim mu ovde dodelite ulogu Urednik.",
    email: "Email",
    name: "Ime",
    status: "Status",
    active: "Aktivan",
    disabled: "Isključen",
    disable: "Isključi",
    enable: "Uključi",
    you: "Vi",
    lastOwner: "Mora ostati bar jedan aktivan vlasnik.",
    loading: "Učitavanje…",
  },
  en: {
    breadcrumbSettings: "Settings",
    title: "Users",
    subtitle: "Your account, password change and staff roles.",
    myAccount: "My account",
    role: "Role",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordRule: "At least 8 characters. Other sign-ins to this account will be signed out.",
    savePassword: "Save password",
    saving: "Saving…",
    passwordSaved: "Password changed. Other sessions were signed out.",
    mismatch: "The new passwords do not match.",
    tooShort: "The new password needs at least 8 characters.",
    wrongCurrent: "The current password is not correct.",
    tooMany: "Too many failed attempts. Please wait a few minutes.",
    genericError: "The change failed. Please try again.",
    usersTitle: "Users and roles",
    usersHint:
      "A new staff member first registers at /auth (Sign up); then assign the Editor role here.",
    email: "Email",
    name: "Name",
    status: "Status",
    active: "Active",
    disabled: "Disabled",
    disable: "Disable",
    enable: "Enable",
    you: "You",
    lastOwner: "At least one active owner must remain.",
    loading: "Loading…",
  },
} as const;

const errorText = (error: unknown, copy: (typeof COPY)[Language]) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("INVALID_CURRENT_PASSWORD")) return copy.wrongCurrent;
  if (message.includes("TOO_MANY_ATTEMPTS")) return copy.tooMany;
  if (message.includes("WEAK_PASSWORD")) return copy.tooShort;
  if (message.includes("LAST_OWNER")) return copy.lastOwner;
  return copy.genericError;
};

function ChangePasswordForm({ copy }: { copy: (typeof COPY)[Language] }) {
  const changePassword = useAction(api.users.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (next.length < 8) return setError(copy.tooShort);
    if (next !== confirm) return setError(copy.mismatch);
    setStatus("saving");
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setStatus("saved");
      toast.show({ message: copy.passwordSaved });
    } catch (caught) {
      setError(errorText(caught, copy));
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="adm-stack">
      <h3 className="adm-section-title" style={{ margin: 0 }}>
        {copy.changePassword}
      </h3>
      <p className="adm-hint" style={{ margin: 0 }}>
        {copy.passwordRule}
      </p>
      <div className="adm-form adm-form--3">
        <Field label={copy.currentPassword}>
          <Input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required />
        </Field>
        <Field label={copy.newPassword}>
          <Input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} required minLength={8} />
        </Field>
        <Field label={copy.confirmPassword}>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
        </Field>
      </div>
      {error ? (
        <p className="ui-field__error" role="alert">
          <span>{error}</span>
        </p>
      ) : null}
      {status === "saved" ? (
        <p className="adm-hint" role="status" style={{ margin: 0 }}>
          {copy.passwordSaved}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" loading={status === "saving"} loadingLabel={copy.saving}>
          {copy.savePassword}
        </Button>
      </div>
    </form>
  );
}

function UsersTable({
  copy,
  language,
  selfId,
}: {
  copy: (typeof COPY)[Language];
  language: Language;
  selfId: string;
}) {
  const users = useQuery(api.users.list, {});
  const setRole = useMutation(api.users.setRole);
  const setDisabled = useAction(api.users.setDisabled);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (userId: string, task: () => Promise<unknown>) => {
    setBusyId(userId);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(errorText(caught, copy));
    } finally {
      setBusyId(null);
    }
  };

  if (users === undefined) {
    return <SkeletonRows rows={4} label={copy.loading} />;
  }

  return (
    <div className="adm-stack">
      {error ? (
        <p className="ui-field__error" role="alert" style={{ padding: "0 1rem" }}>
          <span>{error}</span>
        </p>
      ) : null}
      <div className="adm-table-wrap">
        <table className="adm-table" style={{ minWidth: 640 }}>
          <caption className="ui-sr-only">{copy.usersTitle}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.email}</th>
              <th scope="col">{copy.name}</th>
              <th scope="col">{copy.role}</th>
              <th scope="col">{copy.status}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user._id === selfId;
              const busy = busyId === user._id;
              return (
                <tr key={user._id}>
                  <td>
                    {user.email}
                    {isSelf ? <span className="adm-muted"> ({copy.you})</span> : null}
                  </td>
                  <td>{user.displayName}</td>
                  <td style={{ minWidth: 160 }}>
                    <Select
                      value={user.role}
                      disabled={isSelf || busy}
                      aria-label={`${copy.role}: ${user.email}`}
                      onChange={(event) =>
                        run(user._id, () =>
                          setRole({
                            userId: user._id as Id<"users">,
                            role: event.target.value as Role,
                          })
                        )
                      }
                    >
                      {(["customer", "editor", "owner"] as const).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role][language]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <div className="adm-row">
                      <StatusDot status={user.disabled ? "off" : "active"} label={user.disabled ? copy.disabled : copy.active} />
                      {isSelf ? null : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            run(user._id, () =>
                              setDisabled({
                                userId: user._id as Id<"users">,
                                disabled: !user.disabled,
                              })
                            )
                          }
                        >
                          {user.disabled ? copy.enable : copy.disable}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminKorisniciPage() {
  const { language } = useSitePreferences();
  const lang: Language = language === "sr" ? "sr" : "en";
  const copy = COPY[lang];
  const session = useSession();

  return (
    <div className="adm-page">
      <PageIntro>{copy.subtitle}</PageIntro>

      <Panel id="account" title={copy.myAccount} sub={session ? `${session.email} · ${copy.role}: ${ROLE_LABELS[session.role][lang]}` : undefined}>
        <ChangePasswordForm copy={copy} />
      </Panel>

      {session?.isOwner ? (
        <Panel id="users" title={copy.usersTitle} sub={copy.usersHint} flush>
          <UsersTable copy={copy} language={lang} selfId={session.id} />
        </Panel>
      ) : null}
    </div>
  );
}
