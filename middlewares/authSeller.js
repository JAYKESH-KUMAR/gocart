import prisma from '@/lib/prisma';

const authSeller = async (userId) => {
    try {
        console.log("CLERK USER ID:", userId);

        if (!userId) return false;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true },
        });

        console.log("DB USER:", user);
        console.log("STORE:", user?.store);
        console.log("STATUS:", user?.store?.status);

        if (!user || !user.store) {
            return false;
        }

        if (user.store.status === 'approved') {
            return user.store.id;
        }

        return false;

    } catch (error) {
        console.error(error);
        return false;
    }
};

export default authSeller;