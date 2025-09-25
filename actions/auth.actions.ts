import { signOut } from "next-auth/react";

export async function userSignOut() {
  signOut();
}