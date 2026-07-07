"use client";

import { useState } from "react";

import { AuthBrandPanel } from "./auth-brand-panel";
import { AuthFormPanel } from "./auth-form-panel";

type AuthTab = "login" | "signup";

interface AuthScreenProps {
  defaultTab: AuthTab;
}

export function AuthScreen({ defaultTab }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthBrandPanel />
      <AuthFormPanel activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
