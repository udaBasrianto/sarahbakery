import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ChatBot } from "@/components/ChatBot";
import { AppearanceLoader } from "@/components/AppearanceLoader";
import { CustomerShell } from "@/components/CustomerShell";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import CustomOrderPage from "./pages/CustomOrderPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminBannersPage from "./pages/admin/AdminBannersPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import WishlistPage from "./pages/WishlistPage";
import BlogListPage from "./pages/BlogListPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import AdminBlogPage from "./pages/admin/AdminBlogPage";
import AdminAffiliatesPage from "./pages/admin/AdminAffiliatesPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AffiliatePage from "./pages/AffiliatePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: any) => {
        const name = (error?.name || "").toLowerCase();
        const msg = (error?.message || "").toLowerCase();
        if (name.includes("abort") || msg.includes("aborted") || msg.includes("aborter")) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppearanceLoader />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Customer Routes (mobile-locked frame) */}
          <Route element={<CustomerShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/custom-order" element={<CustomOrderPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/profile" element={<ProfileEditPage />} />
            <Route path="/dashboard/orders" element={<OrderHistoryPage />} />
            <Route path="/dashboard/wishlist" element={<WishlistPage />} />
            <Route path="/dashboard/affiliate" element={<AffiliatePage />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/banners" element={<AdminBannersPage />} />
            <Route path="/admin/blog" element={<AdminBlogPage />} />
            <Route path="/admin/affiliates" element={<AdminAffiliatesPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
        <ChatBot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
