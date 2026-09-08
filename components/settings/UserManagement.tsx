"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AuthUser } from "@/lib/auth/types";
import { getUsers, manageUsers } from "@/lib/client/users";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
export function UserManagement({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [temporary, setTemporary] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (temporary) dialog.current?.showModal();
  }, [temporary]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      const data = await manageUsers("POST", {
        ...values,
        confirmPassword: values.password,
      });
      setUsers(data.users);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create user.");
    } finally {
      setBusy(false);
    }
  }
  async function action(user: AuthUser, method: "DELETE" | "PATCH") {
    if (
      !window.confirm(
        method === "DELETE"
          ? `Delete ${user.username}? This removes the account and signs out all its sessions.`
          : `Reset the password for ${user.username}? All their sessions will be revoked.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const data = await manageUsers(method, { id: user.id });
      setUsers(data.users);
      if (data.temporaryPassword)
        setTemporary({
          username: user.username,
          password: data.temporaryPassword,
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update user.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card settings-card-padded">
      <h2>Users</h2>
      <p>Create accounts, reset passwords and manage access.</p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.username}
                    {user.id === currentUserId ? " (you)" : ""}
                  </td>
                  <td>{user.role}</td>
                  <td>{user.mustChangePassword ? "Change required" : "Set"}</td>
                  <td>
                    <div className="user-actions">
                      <Button
                        variant="secondary"
                        disabled={busy || user.id === currentUserId}
                        onClick={() => void action(user, "PATCH")}
                      >
                        Reset password
                      </Button>
                      <Button
                        variant="text"
                        disabled={busy || user.id === currentUserId}
                        onClick={() => void action(user, "DELETE")}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>Create user</h3>
      <form onSubmit={create}>
        <fieldset className="provider-fields" disabled={busy}>
          <div className="settings-grid">
            <div className="settings-field">
              <label htmlFor="new-user-name">Username</label>
              <Input
                id="new-user-name"
                name="username"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_.-]+"
                autoComplete="off"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="new-user-password">Initial password</label>
              <Input
                id="new-user-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="settings-field">
            <label htmlFor="new-user-role">Role</label>
            <Select id="new-user-role" name="role" defaultValue="user">
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </Select>
            <span>
              The user must change their initial password at first sign-in.
            </span>
          </div>
          <div className="settings-actions">
            <Button type="submit">{busy ? "Working..." : "Create user"}</Button>
          </div>
        </fieldset>
      </form>
      <dialog
        className="account-dialog"
        ref={dialog}
        onClose={() => setTemporary(null)}
        aria-labelledby="temporary-password-title"
      >
        <h2 id="temporary-password-title">Temporary password</h2>
        <p>
          Share this password with {temporary?.username}. They must change it at
          next sign-in.
        </p>
        <code>{temporary?.password}</code>
        <p>This password is shown only now.</p>
        <form method="dialog">
          <Button type="submit">Close</Button>
        </form>
      </dialog>
    </section>
  );
}
