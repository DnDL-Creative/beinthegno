import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Login — gate for the intheGno CMS.
   The form needs useSearchParams (for ?next), so it lives in a client
   child wrapped in <Suspense>.
   ═══════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
