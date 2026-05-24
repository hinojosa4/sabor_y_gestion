import User from "@/models/User";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) return null;
  return normalized;
}

export async function findRegisteredCustomerByEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { email: null, customer: null };

  const customer = await User.findOne({
    email: normalizedEmail,
    rol: "cliente",
  }).select("_id name email");

  return { email: normalizedEmail, customer };
}
