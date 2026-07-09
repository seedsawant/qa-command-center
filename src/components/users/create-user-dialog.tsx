"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { PlusIcon } from "lucide-react"
import { z } from "zod"

import { createUser } from "@/app/(app)/users/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/permissions"
import type { AppRole } from "@/types/database.types"

const ROLE_VALUES: [AppRole, ...AppRole[]] = ["producer", "qa_lead", "tester", "viewer"]

const createUserFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  fullName: z.string().max(120).optional(),
  role: z.enum(ROLE_VALUES),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type CreateUserFormValues = z.infer<typeof createUserFormSchema>

export function CreateUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { email: "", fullName: "", role: "tester", password: "" },
  })

  async function onSubmit(values: CreateUserFormValues) {
    setFormError(null)
    const result = await createUser(values)

    if (result?.error) {
      setFormError(result.error)
      return
    }

    toast.success("Account created — share the password with them directly")
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Add user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            Set their email and password directly, then share the password with them
            out of band (Slack, in person, etc.).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" placeholder="teammate@company.com" {...register("email")} />
                <FieldError errors={[errors.email]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input id="fullName" placeholder="Optional" {...register("fullName")} />
                <FieldError errors={[errors.fullName]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="text"
                  placeholder="At least 8 characters"
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.role]} />
              </FieldContent>
            </Field>
            {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
