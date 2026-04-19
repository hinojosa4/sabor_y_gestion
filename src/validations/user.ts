import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto"),
  email: z.string().email("Email inválido"),
  password_hash: z.string().min(8, "La contraseña requiere 8 caracteres").optional().or(z.literal('')), 
  role: z.enum(['admin', 'manager', 'waiter', 'chef', 'driver', 'mesero']),
  restaurantId: z.string().min(1, "El ID del restaurante es obligatorio"),
  isActive: z.boolean().default(true),
  // Es vital incluir esto porque tu formulario lo envía
  employmentDetails: z.object({
    phone: z.string(),
    shift: z.string(),
    startDate: z.string(),
    salary: z.coerce.number(), // Coerce convierte el texto a número automáticamente
    status: z.string()
  })
});