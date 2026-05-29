import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// toggle stock of a product
export async function PATCH(request) {
    try {
        const { userId } = getAuth(request);
        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json(
                { error: "missing productId" },
                { status: 400 }
            );
        }

        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json(
                { error: "not authorized" },
                { status: 401 }
            );
        }

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product || product.storeId !== storeId) {
            return NextResponse.json(
                { error: "product not found" },
                { status: 404 }
            );
        }

        await prisma.product.update({
            where: { id: productId },
            data: {
                inStock: !product.inStock
            }
        });

        return NextResponse.json({
            success: true
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}