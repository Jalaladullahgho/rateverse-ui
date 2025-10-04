﻿export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
export async function GET(){ const user = await currentUser(); return NextResponse.json({ user }); }




