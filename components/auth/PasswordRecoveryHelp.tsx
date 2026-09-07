export function PasswordRecoveryHelp() {
  return (
    <details className="password-recovery-help">
      <summary>Forgot password?</summary>
      <p>Ask the instance owner to reset your password. If you run this server, use its terminal:</p>
      <code>docker compose exec composeerr node scripts/reset-password.mjs admin</code>
      <p>Replace <strong>admin</strong> with your username. With the production Compose file, add <strong>-f compose.prod.yaml</strong> after <strong>docker compose</strong>.</p>
      <p>The command prints a temporary password. Sign in with it, then choose a new password.</p>
    </details>
  );
}
