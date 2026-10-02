/** Mêmes règles que le backend ; le serveur reste l'autorité (le frontend n'est pas une couche de sécurité). */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  return EMAIL.test(value.trim()) ? undefined : "Adresse email invalide";
}

export function validatePassword(value: string): string | undefined {
  if (value.length < 8) return "Au moins 8 caractères";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Au moins une lettre et un chiffre";
  return undefined;
}
