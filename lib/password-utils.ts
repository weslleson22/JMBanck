export function generateReadablePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  return `Jm@${pick(upper)}${pick(lower)}${pick(lower)}${pick(digits)}${pick(digits)}${pick(digits)}`;
}

