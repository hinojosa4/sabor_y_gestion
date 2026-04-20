// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Si el usuario cancela en Google
  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_cancelled", req.url));
  }

  try {
    // 1. Intercambiar code por tokens de Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[Google callback] No access_token:", tokenData);
      return NextResponse.redirect(new URL("/login?error=google_token", req.url));
    }

    // 2. Obtener perfil del usuario desde Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    // profile contiene: id, email, name, picture, verified_email

    if (!profile.email) {
      return NextResponse.redirect(new URL("/login?error=google_profile", req.url));
    }

    // 3. Buscar o crear usuario en MongoDB
    await connectDB();

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      // Usuario nuevo: se crea con rol "cliente" por defecto
      // Sin contraseña porque solo entra con Google
      user = await User.create({
        nombre: profile.name,
        email: profile.email,
        password: `google_oauth_${profile.id}`, // placeholder, nunca se usa para login manual
        rol: "cliente",
        activo: true,
        googleId: profile.id,
      });
    } else if (!user.activo) {
      return NextResponse.redirect(new URL("/login?error=account_disabled", req.url));
    }

    // 4. Generar tu propio JWT (igual que en login normal)
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      rol: user.rol,
    });

    const userSafe = user.toObject();
    delete userSafe.password;

    // 5. Redirigir al frontend con token y user en query params
    // El frontend los leerá y los guardará en localStorage
    const redirectUrl = new URL("/auth/google/success", req.url);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("user", JSON.stringify(userSafe));

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[GET /api/auth/google/callback]", err);
    return NextResponse.redirect(new URL("/login?error=server", req.url));
  }
}