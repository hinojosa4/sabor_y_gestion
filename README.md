## git  Arquitectura del Proyecto

El proyecto sigue una arquitectura modular y escalable, separando la lógica de negocio de la interfaz de usuario y las configuraciones del servidor.

## 📁 Estructura

```bash
src/
├─ app/                 # El corazón de Next.js (App Router)
│  ├─ api/              # Endpoints del Backend (Serverless Functions)
│  │  ├─ auth/          # Lógica de autenticación (JWT, Login)
│  │  ├─ users/         # CRUD de usuarios y empleados
│  │  ├─ categories/    # Gestión de categorías de la cafetería
│  │  └─ dishes/        # Gestión del menú de platos
│  ├─ login/            # Vista de inicio de sesión
│  ├─ dashboard/        # Panel principal de administración
│  ├─ layout.tsx        # Estructura base de la aplicación
│  └─ page.tsx          # Página de inicio (Landing/Root)
│
├─ components/          # Componentes de React reutilizables
│  ├─ ui/               # Botones, inputs, modales (piezas básicas)
│  ├─ forms/            # Formularios complejos (Login, registro de platos)
│  └─ layout/           # Barras laterales, navegación, headers
│
├─ features/            # Lógica de negocio específica por módulo
│  ├─ auth/             # Hooks y lógica de autenticación
│  ├─ users/            # Funcionalidades específicas de usuarios
│  ├─ categories/       # Operaciones de categorías
│  └─ dishes/           # Operaciones de platos y menú
│
├─ lib/                 # Utilidades y configuraciones externas
│  ├─ db.ts             # Configuración y conexión a MongoDB (Mongoose)
│  └─ utils.ts          # Funciones auxiliares generales
│
├─ models/              # Esquemas de Mongoose (Base de Datos)
│  ├─ User.ts           # Modelo de Usuario (Roles, contraseñas)
│  ├─ Category.ts       # Modelo de Categoría
│  └─ Dish.ts           # Modelo de Plato/Producto
│
├─ validations/         # Esquemas de validación de datos
│  └─ ...               # Validación de inputs para evitar datos corruptos
│
├─ types/               # Definiciones de TypeScript e Interfaces
│  └─ index.ts          # Centralización de tipos del proyecto
│
└─ tests/               # Suite de pruebas
   ├─ unit/             # Pruebas de funciones aisladas
   └─ integration/      # Pruebas de flujo completo

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

-----------------------------------------------------------------------------------------------------

