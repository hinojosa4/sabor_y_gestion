import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, ...data } = body;
    await pusherServer.trigger("restaurant", event, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}