import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1,"El email es obligatorio" )
    .email("El email no tiene un formato válido")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;