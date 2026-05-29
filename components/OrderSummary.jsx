'use client'

import React, { useState } from 'react'
import {
    PlusIcon,
    SquarePenIcon,
    XIcon
} from 'lucide-react'

import { useDispatch, useSelector } from 'react-redux'

import AddressModal from './AddressModal'

import toast from 'react-hot-toast'

import { useRouter } from 'next/navigation'

import { useUser, useAuth } from '@clerk/nextjs'

import axios from 'axios'

import { fetchCart } from '@/lib/features/cart/cartSlice'

const OrderSummary = ({ totalPrice, items }) => {

    const { user } = useUser()

    const { getToken } = useAuth()

    const dispatch = useDispatch()

    const currency =
        process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

    const router = useRouter()

    const addressList =
        useSelector((state) => state.address?.list || [])

    const [paymentMethod, setPaymentMethod] =
        useState('COD')

    const [selectedAddress, setSelectedAddress] =
        useState(null)

    const [showAddressModal, setShowAddressModal] =
        useState(false)

    const [couponCodeInput, setCouponCodeInput] =
        useState('')

    const [coupon, setCoupon] =
        useState(null)

    const shippingCharge = 5

    const discount = coupon
        ? (coupon.discount / 100) * totalPrice
        : 0

    const finalTotal =
        totalPrice + shippingCharge - discount

    // Apply Coupon

    const handleCouponCode = async (event) => {

        event.preventDefault()

        try {

            if (!user) {
                return toast.error(
                    'Please login to proceed'
                )
            }

            const token = await getToken()

            const { data } = await axios.post(
                '/api/coupon',
                {
                    code: couponCodeInput
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            setCoupon(data.coupon)

            toast.success('Coupon Applied')

        } catch (error) {

            toast.error(
                error?.response?.data?.error ||
                error.message
            )
        }
    }

    // Place Order

    const handlePlaceOrder = async (e) => {

        e.preventDefault()

        try {

            if (!user) {
                return toast.error(
                    'Please login to place order'
                )
            }

            if (!selectedAddress) {
                return toast.error(
                    'Please select an address'
                )
            }

            const token = await getToken()

            const orderData = {
                items,
                paymentMethod,
                addressId: selectedAddress.id
            }

            if (coupon) {
                orderData.couponCode = coupon.code
            }

            // Create Order

            const { data } = await axios.post(
                '/api/orders',
                orderData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            // Stripe Redirect

            if (paymentMethod === 'STRIPE') {

                window.location.href =
                    data.session.url

            } else {

                toast.success(data.message)

                router.push('/orders')

                dispatch(fetchCart(getToken))
            }

        } catch (error) {

            toast.error(
                error?.response?.data?.error ||
                error.message
            )
        }
    }

    return (

        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>

            <h2 className='text-xl font-medium text-slate-600'>
                Payment Summary
            </h2>

            <p className='text-slate-400 text-xs my-4'>
                Payment Method
            </p>

            {/* COD */}

            <div className='flex gap-2 items-center'>

                <input
                    type="radio"
                    id="COD"
                    name="payment"
                    checked={paymentMethod === 'COD'}
                    onChange={() =>
                        setPaymentMethod('COD')
                    }
                    className='accent-gray-500'
                />

                <label
                    htmlFor="COD"
                    className='cursor-pointer'
                >
                    Cash on Delivery
                </label>

            </div>

            {/* STRIPE */}

            <div className='flex gap-2 items-center mt-2'>

                <input
                    type="radio"
                    id="STRIPE"
                    name="payment"
                    checked={paymentMethod === 'STRIPE'}
                    onChange={() =>
                        setPaymentMethod('STRIPE')
                    }
                    className='accent-gray-500'
                />

                <label
                    htmlFor="STRIPE"
                    className='cursor-pointer'
                >
                    Stripe Payment
                </label>

            </div>

            {/* Address */}

            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>

                <p>Address</p>

                {selectedAddress ? (

                    <div className='flex gap-2 items-center mt-2'>

                        <p>
                            {selectedAddress.name},
                            {' '}
                            {selectedAddress.city},
                            {' '}
                            {selectedAddress.state},
                            {' '}
                            {selectedAddress.zip}
                        </p>

                        <SquarePenIcon
                            size={18}
                            className='cursor-pointer'
                            onClick={() =>
                                setSelectedAddress(null)
                            }
                        />

                    </div>

                ) : (

                    <div>

                        {addressList.length > 0 && (

                            <select
                                className='border border-slate-400 p-2 w-full my-3 outline-none rounded'
                                onChange={(e) =>
                                    setSelectedAddress(
                                        addressList[e.target.value] || null
                                    )
                                }
                            >

                                <option value="">
                                    Select Address
                                </option>

                                {addressList.map(
                                    (address, index) => (

                                        <option
                                            key={index}
                                            value={index}
                                        >
                                            {address.name},
                                            {' '}
                                            {address.city},
                                            {' '}
                                            {address.state}
                                        </option>
                                    )
                                )}

                            </select>
                        )}

                        <button
                            onClick={() =>
                                setShowAddressModal(true)
                            }
                            className='flex items-center gap-1 text-slate-600 mt-1'
                        >
                            Add Address
                            <PlusIcon size={18} />
                        </button>

                    </div>
                )}

            </div>

            {/* Price Summary */}

            <div className='pb-4 border-b border-slate-200'>

                <div className='flex justify-between'>

                    <div className='flex flex-col gap-1 text-slate-400'>

                        <p>Subtotal:</p>

                        <p>Shipping:</p>

                        {coupon && (
                            <p>Coupon Discount:</p>
                        )}

                    </div>

                    <div className='flex flex-col gap-1 font-medium text-right'>

                        <p>
                            {currency}
                            {totalPrice.toLocaleString()}
                        </p>

                        <p>
                            {currency}
                            {shippingCharge}
                        </p>

                        {coupon && (

                            <p>
                                -{currency}
                                {discount.toFixed(2)}
                            </p>
                        )}

                    </div>

                </div>

                {!coupon ? (

                    <form
                        onSubmit={handleCouponCode}
                        className='flex justify-center gap-3 mt-3'
                    >

                        <input
                            type="text"
                            value={couponCodeInput}
                            onChange={(e) =>
                                setCouponCodeInput(
                                    e.target.value
                                )
                            }
                            placeholder='Coupon Code'
                            className='border border-slate-400 p-1.5 rounded w-full outline-none'
                        />

                        <button
                            type='submit'
                            className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'
                        >
                            Apply
                        </button>

                    </form>

                ) : (

                    <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>

                        <p>
                            Code:

                            <span className='font-semibold ml-1'>
                                {coupon.code.toUpperCase()}
                            </span>
                        </p>

                        <p>
                            {coupon.description}
                        </p>

                        <XIcon
                            size={18}
                            className='hover:text-red-700 transition cursor-pointer'
                            onClick={() =>
                                setCoupon(null)
                            }
                        />

                    </div>
                )}

            </div>

            {/* Total */}

            <div className='flex justify-between py-4'>

                <p>Total:</p>

                <p className='font-medium text-right'>

                    {currency}
                    {finalTotal.toFixed(2)}

                </p>

            </div>

            {/* Place Order */}

            <button
                onClick={(e) =>
                    toast.promise(
                        handlePlaceOrder(e),
                        {
                            loading: 'Placing Order...',
                            success: 'Order Placed',
                            error: 'Something went wrong'
                        }
                    )
                }
                className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all'
            >
                Place Order
            </button>

            {showAddressModal && (

                <AddressModal
                    setShowAddressModal={
                        setShowAddressModal
                    }
                />

            )}

        </div>
    )
}

export default OrderSummary