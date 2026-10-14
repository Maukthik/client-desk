import { z } from "zod";

export const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
export const password = z.string().min(8, "Use at least 8 characters").max(200);
export const name = z.string().trim().min(1, "Required").max(120);
export const optionalText = (max = 5000) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));
