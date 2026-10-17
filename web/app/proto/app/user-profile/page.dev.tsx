import type { Metadata } from "next";
import { UserProfile } from "@/proto/features/users/components/user-profile";

export const metadata: Metadata = {
  title: "Profile"
};

export default function UserProfilePage() {
  return <UserProfile />;
}
