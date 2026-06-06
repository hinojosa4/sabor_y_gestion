import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password_hash: z.string().min(8).optional().or(z.literal('')), 
  role: z.enum(['admin', 'gerente', 'mesero', 'cocinero', 'delivery', 'cajero', 'bartender']),
  restaurantId: z.string().min(1),
  isActive: z.boolean().default(true),
  employmentDetails: z.object({
    phone: z.string(),
    shift: z.string(),
    startDate: z.string(),
    salary: z.coerce.number(),
    status: z.string()
  })
});