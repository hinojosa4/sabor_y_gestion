import { z } from 'zod';

export const userSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").optional(), 
  rol: z.enum(["admin", "cajero", "cocinero", "mesero"]),
  activo: z.boolean().default(true),
});