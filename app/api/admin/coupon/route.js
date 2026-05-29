import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";


import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
export async function POST(request) {
    try {
    const { userId } = await getAuth(request);
    const isAdmin = await authAdmin(userId);


    if (!isAdmin) {
        return NextResponse.json({ error: " not authorized" }, { status: 401 });
    }

    const { coupon } = await request.json();
    coupon.code = coupon.code.toUpperCase();
    const existingCoupon = await prisma.coupon.findUnique({ where: { code: coupon.code } });
    if (existingCoupon) {
        return NextResponse.json({ error: "Coupon with this code already exists" }, { status: 400 });
    }

    const createdCoupon = await prisma.coupon.create({ data: coupon });
    //Run Inngest function to delete coupon on expiry
    await inngest.send({
        name: "app/coupon.expired",
        data: {
            code: createdCoupon.code,
                expires_at: createdCoupon.expiresAt
            }
        });

        return NextResponse.json({ message: "Coupon added successfully" });
    
    } catch (error) {
        console.error(error);
        if(error.code === "P2002"){
            return NextResponse.json({ error: "Coupon with this code already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

    





//delete coupon /api/coupon/:id=couponId
export async function DELETE(request){
    try {
        const { userId } = await getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: " not authorized" }, { status: 401 });
        }
        const { searchParams } = request.nextUrl;
        const code = searchParams.get('code');
        await prisma.coupon.delete({ where: { code } });
        return NextResponse.json({ message: "Coupon deleted successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

//get all coupons for admin
export async function GET(request) {
    try {
        const { userId } =  getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: " not authorized" }, { status: 401 });
        }
        const coupons = await prisma.coupon.findMany();
        return NextResponse.json({ coupons });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}