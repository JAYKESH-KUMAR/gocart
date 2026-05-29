import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            
            include: {
                rating: {
                    select: {
                        createdAt: true,
                        rating: true,
                        review: true,
                        user: {
                            select: {
                                name: true,
                                image: true
                            }
                        }
                    }
                },
                store: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json({ products });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }
}