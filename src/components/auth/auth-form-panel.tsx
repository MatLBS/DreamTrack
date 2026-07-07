"use client";

import Image from "next/image";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

type AuthTab = "login" | "signup";

interface AuthFormPanelProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
}

async function continueWithGoogle() {
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  });
  if (error) toast.error(error.message ?? "Connexion Google impossible");
}

export function AuthFormPanel({ activeTab, onTabChange }: AuthFormPanelProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as AuthTab)}
        >
          <TabsList className="h-11 w-full">
            <TabsTrigger value="login" className="flex-1">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Inscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <SignupForm />
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full text-base"
          onClick={continueWithGoogle}
        >
          <Image src="/google-icon.svg" alt="" width={16} height={16} />
          Continuer avec Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {activeTab === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
                onClick={() => onTabChange("signup")}
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
                onClick={() => onTabChange("login")}
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
