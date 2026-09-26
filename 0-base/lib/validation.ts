export function validateLoginId(loginId: string): string | null {
  if (loginId.length < 6 || loginId.length > 12) return "Login ID must be between 6 and 12 characters.";
  if (!/^[A-Za-z0-9_.]+$/.test(loginId)) return "Login ID may only contain letters, numbers, _ and .";
  return null;
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
  return null;
}
