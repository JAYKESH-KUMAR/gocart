import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"

// Verify Coupon

export async function POST(request) {

    try {

        const { userId, has } = getAuth(request)

        const { code } = await request.json()

        const coupon = await prisma.coupon.findFirst({

            where: {
                code: code.toUpperCase(),
                expiresAt: {
                    gt: new Date()
                }
            }

        })

        // Coupon Not Found

        if (!coupon) {

            return NextResponse.json(
                { error: "Coupon not found" },
                { status: 404 }
            )
        }

        // New User Coupon Check

        if (coupon.forNewUsers) {

            const userOrders = await prisma.order.findMany({
                where: { userId }
            })

            if (userOrders.length > 0) {

                return NextResponse.json(
                    {
                        error: "This coupon is only for new users"
                    },
                    { status: 400 }
                )
            }
        }

        // Plus Member Coupon Check

        if (coupon.forMembers) {

            const hasPlusPlan = has({
                plan: "plus"
            })

            if (!hasPlusPlan) {

                return NextResponse.json(
                    {
                        error: "This coupon is only for members with Plus plan"
                    },
                    { status: 400 }
                )
            }
        }

        return NextResponse.json({ coupon })

    } catch (error) {

        console.error(error)

        return NextResponse.json(
            {
                error: error.code || error.message
            },
            {
                status: 400
            }
        )
    }
}