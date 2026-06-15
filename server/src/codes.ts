// Short, human-friendly room codes. Avoids visually ambiguous characters
// (0/O, 1/I/L) so codes are easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

export function generateCode(exists: (code: string) => boolean): string {
  // Practically never loops more than once, but guard against collisions.
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!exists(code)) return code;
  }
  throw new Error("Unable to allocate a unique room code");
}
