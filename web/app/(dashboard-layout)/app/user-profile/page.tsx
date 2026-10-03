import type { Metadata } from "next";
import { UserProfile } from "@/features/users/components/user-profile";

export const metadata: Metadata = {
  title: "Profile"
};

export default function UserProfilePage() {
  return <UserProfile />;
}
