import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "GoCart. - Store Dashboard",
    description: "GoCart. - Store Dashboard",
};

export default function RootStoreLayout({ children }) {
    return (
        <StoreLayout>
            {children}
        </StoreLayout>
    );
}