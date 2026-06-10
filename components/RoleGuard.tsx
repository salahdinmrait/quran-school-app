import React from "react";
import { Redirect } from "expo-router";
import { useAuth, Role } from "../lib/auth";
import { Loading } from "./ui";

export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}
