import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/jwt";
import { UserRole } from "@/models/User";

type RouteHandler = (
  req: NextRequest,
  context: { params?: Record<string, string>; user: TokenPayload }
) => Promise<NextResponse>;

/**
 * Middleware de autenticación.
 * Extrae y verifica el JWT del header Authorization.
 * Si roles está definido, verifica que el usuario tenga uno de esos roles.
 *
 * Uso en un route handler:
 *   export const GET = withAuth(handler);
 *   export const POST = withAuth(handler, ["admin", "cajero"]);
 */
export function withAuth(handler: RouteHandler, roles?: UserRole[]) {
  return async (
    req: NextRequest,
    context: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    // 1. Extraer token del header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, message: "Token de autenticación no proporcionado" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // 2. Verificar token
    let decoded: TokenPayload;
    try {
      decoded = verifyToken(token);
    } catch (error: unknown) {
      const isExpired =
        error instanceof Error && error.name === "TokenExpiredError";

      return NextResponse.json(
        {
          ok: false,
          message: isExpired
            ? "La sesión ha expirado. Por favor inicia sesión nuevamente."
            : "Token inválido",
        },
        { status: 401 }
      );
    }

    // 3. Verificar rol si se requiere
    if (roles && roles.length > 0) {
      if (!roles.includes(decoded.rol as UserRole)) {
        return NextResponse.json(
          {
            ok: false,
            message: "No tienes permisos para realizar esta acción",
          },
          { status: 403 }
        );
      }
    }

    // 4. Pasar el usuario decodificado al handler
    return handler(req, { ...context, user: decoded });
  };
}