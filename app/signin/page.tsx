import type { Metadata } from "next";
import { SigninForm } from "./SigninForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in via magic link to manage your seat.",
};

export default function SigninPage() {
  return <SigninForm />;
}
