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
import { createSignupSchema, type SignupInput } from "@/lib/validation/auth";
import { actionErrorMessage, AuthClientError } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/locale-provider";

export function SignupForm() {
  const t = useT();
  const router = useRouter();
  const SignupSchema = useMemo(
    () => createSignupSchema(t.auth.validation),
    [t],
  );

  const mutation = useMutation({
    mutationFn: async (values: SignupInput) => {
      const { error } = await authClient.signUp.email({
        name: values.name,
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
    defaultValues: { name: "", email: "", password: "" } as SignupInput,
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
        name="name"
        validators={{
          onChange: ({ value }) =>
            SignupSchema.shape.name.safeParse(value).error?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <Label
              htmlFor={field.name}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t.auth.signup.nameLabel}
            </Label>
            <Input
              id={field.name}
              name={field.name}
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
        name="email"
        validators={{
          onChange: ({ value }) =>
            SignupSchema.shape.email.safeParse(value).error?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <Label
              htmlFor={field.name}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t.auth.signup.emailLabel}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              placeholder={t.auth.signup.emailPlaceholder}
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
            SignupSchema.shape.password.safeParse(value).error?.issues[0]
              ?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <Label
              htmlFor={field.name}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t.auth.signup.passwordLabel}
            </Label>
            <PasswordInput
              id={field.name}
              name={field.name}
              placeholder={t.auth.signup.passwordPlaceholder}
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
            {t.auth.signup.submit}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
