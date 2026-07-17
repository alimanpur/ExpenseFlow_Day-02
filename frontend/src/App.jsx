import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/Sonner";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./layouts/AppLayout.jsx";
import CurrencySelection from "./components/auth/CurrencySelection";

const Landing = lazy(() => import("./pages/landing/Home.jsx"));
const Product = lazy(() => import("./pages/marketing/Product.jsx"));
const Pricing = lazy(() => import("./pages/marketing/Pricing.jsx"));
const FAQ = lazy(() => import("./pages/marketing/FAQ.jsx"));
const About = lazy(() => import("./pages/marketing/About.jsx"));
const UseCases = lazy(() => import("./pages/marketing/UseCases.jsx"));
const Contact = lazy(() => import("./pages/marketing/Contact.jsx"));
const Docs = lazy(() => import("./pages/marketing/Docs.jsx"));

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="min-h-[calc(100vh-88px)] grid place-items-center">
      <div className="h-8 w-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster closeButton richColors />
          <CurrencySelection />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Marketing routes */}
              <Route index element={<Landing />} />
              <Route path="/product" element={<Product />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Auth routes - redirect if already authenticated */}
              <Route path="/signin" element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              } />
              <Route path="/signup" element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />
              <Route path="/verify" element={
                <PublicRoute>
                  <Verify />
                </PublicRoute>
              } />

              {/* App routes - protected */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Ledger />} />
                <Route path="ledger" element={<Ledger />} />
                <Route path="entries" element={<Entries />} />
                <Route path="people" element={<People />} />
                <Route path="circles" element={<Circles />} />
                <Route path="circles/new" element={<NewCircle />} />
                <Route path="circles/:id" element={<CircleDetail />} />
                <Route path="archive" element={<Archive />} />
                <Route path="expenses/new" element={<NewExpense />} />
                <Route path="expenses/:id" element={<ExpenseDetail />} />
                <Route path="expenses/:id/edit" element={<EditExpense />} />
                <Route path="settlements" element={<Settlements />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="activity" element={<Activity />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="help" element={<Help />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="reports" element={<Reports />} />
                <Route path="search" element={<Search />} />
                <Route path="*" element={<div className="p-12 text-center"><h2 className="font-display text-3xl">Page not found.</h2></div>} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
