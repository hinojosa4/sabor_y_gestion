import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const mode = searchParams.get("state") ?? "login"; // 👈 recuperamos el mode

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_cancelled", req.url));
  }

  try {
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
      return NextResponse.redirect(new URL("/login?error=google_token", req.url));
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();

    if (!profile.email) {
      return NextResponse.redirect(new URL("/login?error=google_profile", req.url));
    }

    await connectDB();

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      if (mode === "login") {
        // 👈 Solo login: el usuario no existe, rechazar
        return NextResponse.redirect(new URL("/login?error=google_not_registered", req.url));
      }

      // 👈 Modo register: crear el usuario
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: `google_oauth_${profile.id}`,
        rol: "cliente",
        activo: true,
        googleId: profile.id,
      });
    } else if (!user.activo) {
      return NextResponse.redirect(new URL("/login?error=account_disabled", req.url));
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      rol: user.rol,
    });

    const userSafe = user.toObject();
    delete userSafe.password;

    const redirectUrl = new URL("/auth/google/success", req.url);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("user", JSON.stringify(userSafe));

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[GET /api/auth/google/callback]", err);
    return NextResponse.redirect(new URL("/login?error=server", req.url));
  }
}