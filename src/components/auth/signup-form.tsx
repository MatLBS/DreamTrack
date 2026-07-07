"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { SignupSchema, type SignupInput } from "@/lib/validation/auth";

export function SignupForm() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (values: SignupInput) => {
      const { error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        callbackURL: "/",
      });
      if (error)
        throw new Error(error.message ?? "Impossible de créer le compte");
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error) => {
      toast.error(error.message);
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
              Nom complet
            </Label>
            <Input
              id={field.name}
              name={field.name}
              placeholder="Jane Doe"
              className="h-11 text-base"
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
              Email
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              placeholder="nom@example.com"
              className="h-11 text-base"
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
              Mot de passe
            </Label>
            <PasswordInput
              id={field.name}
              name={field.name}
              placeholder="••••••••"
              className="h-11 text-base"
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
            Créer mon compte
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
