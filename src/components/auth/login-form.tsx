"use client";

import { useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { createLoginSchema, type LoginInput } from "@/lib/validation/auth";
import { actionErrorMessage, AuthClientError } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const LoginSchema = useMemo(() => createLoginSchema(t.auth.validation), [t]);

  const mutation = useMutation({
    mutationFn: async (values: LoginInput) => {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: "/",
      });
      if (error) throw new AuthClientError(error.code);
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      const code = error instanceof AuthClientError ? error.code : undefined;
      toast.error(actionErrorMessage(t, code));
    },
  });

  const form = useForm({
    defaultValues: { email: "", password: "" } as LoginInput,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value).catch(() => {});
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-5"
    >
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            LoginSchema.shape.email.safeParse(value).error?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <Label
              htmlFor={field.name}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t.auth.login.emailLabel}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              placeholder={t.auth.login.emailPlaceholder}
              className="h-11 border-2 border-input bg-muted/30 text-base"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) =>
            LoginSchema.shape.password.safeParse(value).error?.issues[0]
              ?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <Label
              htmlFor={field.name}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t.auth.login.passwordLabel}
            </Label>
            <PasswordInput
              id={field.name}
              name={field.name}
              placeholder={t.auth.login.passwordPlaceholder}
              className="h-11 border-2 border-input bg-muted/30 text-base"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={!canSubmit || isSubmitting}
          >
            {t.auth.login.submit}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
