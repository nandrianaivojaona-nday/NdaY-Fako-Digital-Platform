import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "finish-setup not implemented yet" },
    { status: 501 }
  );

}
