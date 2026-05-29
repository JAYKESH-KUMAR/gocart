import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import Stripe from "stripe";

// Place Order

export async function POST(request) {

    try {
        console.log("STEP 1");

        const { userId, has } = getAuth(request);

        if (!userId) {
            return NextResponse.json(
                { error: "not authorized" },
                { status: 401 }
            );
        }

        const {
            addressId,
            items,
            couponCode,
            paymentMethod
        } = await request.json();
        console.log("STEP 2");

        // Validate Order Data

        if (
            !addressId ||
            !paymentMethod ||
            !items ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return NextResponse.json(
                { error: "missing order details" },
                { status: 400 }
            );
        }

        // Check Coupon
        console.log("STEP 3");

        let coupon = null;

        if (couponCode) {

            coupon = await prisma.coupon.findUnique({
                where: {
                    code: couponCode.toUpperCase()
                }
            });

            if (!coupon) {

                return NextResponse.json(
                    { error: "Coupon not found" },
                    { status: 404 }
                );
            }

            // New User Coupon Check

            if (coupon.forNewUser) {

                const userOrders = await prisma.order.findMany({
                    where: { userId }
                });

                if (userOrders.length > 0) {

                    return NextResponse.json(
                        {
                            error: "This coupon is only for new users"
                        },
                        { status: 400 }
                    );
                }
            }

            // Plus Member Coupon Check

            if (coupon.forMember) {

                const hasPlusPlan = has({
                    plan: "plus"
                });

                if (!hasPlusPlan) {

                    return NextResponse.json(
                        {
                            error: "This coupon is only for Plus members"
                        },
                        { status: 400 }
                    );
                }
            }
        }

        // Check Plus Membership

        const isPlusMember = has({
            plan: "plus"
        });

        // Group Orders By Store

        const ordersByStore = new Map();

        for (const item of items) {

            const product = await prisma.product.findUnique({
                where: {
                    id: item.id
                }

            });

            if (!product) continue;

            const storeId = product.storeId;

            if (!ordersByStore.has(storeId)) {
                ordersByStore.set(storeId, []);
            }

            ordersByStore.get(storeId).push({
                ...item,
                price: product.price
            });
        }
        console.log("STEP 4");
        console.log("ordersByStore size:", ordersByStore.size);

        let orderIds = [];
        let fullAmount = 0;
        let isShippingFeeAdded = false;

        // Create Orders

        for (const [storeId, sellerItems] of ordersByStore.entries()) {
            console.log("STEP 5");

            let total = sellerItems.reduce(
                (acc, item) => acc + item.price * item.quantity,
                0
            );

            // Apply Coupon Discount

            if (coupon) {
                total -= (total * coupon.discount) / 100;
            }

            // Shipping Fee

            if (!isPlusMember && !isShippingFeeAdded) {
                total += 5;
                isShippingFeeAdded = true;
            }

            fullAmount += parseFloat(total.toFixed(2));
            console.log("STEP 6");

            const order = await prisma.order.create({


                data: {
                    userId,
                    storeId,
                    addressId,

                    isCouponUsed: coupon ? true : false,

                    coupon: coupon ? coupon : {},

                    paymentMethod,

                    total: parseFloat(total.toFixed(2)),

                    orderItems: {

                        create: sellerItems.map((item) => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            });
            console.log("STEP 7");

            orderIds.push(order.id);
        }

        if (paymentMethod === 'STRIPE') {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const origin = await request.headers.get('origin');

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Order'
                            },

                            unit_amount: Math.round(fullAmount * 100)
                        },
                        quantity: 1
                    }
                ],

                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, //  current time + 30 minutes
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'gocart'
                }
            });
            return NextResponse.json({ session });

        }

        // Clear Cart

        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                cart: {}
            }
        });

        return NextResponse.json({
            success: true,
            message: "Order placed successfully",
            orderIds,
            fullAmount
        });

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            {
                error: error.code || error.message
            },
            {
                status: 400
            }
        );
    }
}

// Get Orders

export async function GET(request) {

    try {

        const { userId } = getAuth(request);

        if (!userId) {

            return NextResponse.json(
                { error: "not authorized" },
                { status: 401 }
            );
        }

        const orders = await prisma.order.findMany({

            where: {
                userId,
                OR: [
                    {
                        paymentMethod: "COD"
                    },
                    {
                        AND: [
                            {
                                paymentMethod: "STRIPE"
                            },
                            {
                                isPaid: true
                            }
                        ]
                    }
                ]
            },

            include: {
                orderItems: {
                    include: {
                        product: true
                    }
                },
                address: true
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json({ orders });

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            {
                error: error.message
            },
            {
                status: 400
            }
        );
    }
}