// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "El email es obligatorio" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Avisar explícitamente si no está registrado
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "No existe una cuenta registrada con ese correo." },
        { status: 404 }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { ok: false, message: "Esta cuenta está desactivada. Contacta al administrador." },
        { status: 403 }
      );
    }

    const resetToken = signToken({
      userId: user._id.toString(),
      email: user.email,
      rol: user.rol,
      purpose: "password_reset",
    } as Parameters<typeof signToken>[0] & { purpose: string });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Sabor & Gestión" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: "Restablecer contraseña — Sabor & Gestión",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="width:56px;height:56px;background:#ea580c;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
            <span style="font-size:28px;">🍽</span>
          </div>
          <h2 style="font-size:20px;font-weight:600;color:#111;margin:0 0 8px;">Restablecer contraseña</h2>
          <p style="font-size:14px;color:#555;margin-bottom:24px;line-height:1.5;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en
            <strong>Sabor &amp; Gestión</strong>. Haz clic en el botón para continuar.
          </p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
            Restablecer contraseña
          </a>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
            Este enlace expira en <strong>15 minutos</strong>. Si no solicitaste esto, ignora este mensaje.
          </p>
          <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;" />
          <p style="font-size:11px;color:#d1d5db;">
            O copia y pega este enlace en tu navegador:<br/>
            <span style="color:#6b7280;word-break:break-all;">${resetUrl}</span>
          </p>
        </div>
      `,
    });

    return NextResponse.json(
      { ok: true, message: "Si el correo está registrado, recibirás un enlace en breve." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}