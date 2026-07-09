"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult, ProjectInput } from "@/app/(app)/projects/actions"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  description: z.string().max(2000).optional(),
  platformTags: z.string().max(300).optional(),
})

type FormValues = z.infer<typeof formSchema>

function parseTags(input?: string) {
  if (!input) return []
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  )
}

export function ProjectForm({
  action,
  defaultValues,
  submitLabel = "Create project",
}: {
  action: (input: ProjectInput) => Promise<ActionResult>
  defaultValues?: Partial<FormValues>
  submitLabel?: string
}) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      platformTags: defaultValues?.platformTags ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    const result = await action({
      name: values.name,
      description: values.description || undefined,
      platformTags: parseTags(values.platformTags),
    })

    if (result?.error) {
      setFormError(result.error)
      return
    }

    toast.success("Project saved")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" placeholder="Project Andromeda" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="What is this project?"
              rows={3}
              {...register("description")}
            />
            <FieldError errors={[errors.description]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="platformTags">Platform tags</FieldLabel>
            <Input
              id="platformTags"
              placeholder="mobile, android, ios"
              {...register("platformTags")}
            />
            <FieldDescription>Comma-separated, purely informational.</FieldDescription>
            <FieldError errors={[errors.platformTags]} />
          </FieldContent>
        </Field>
        {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
