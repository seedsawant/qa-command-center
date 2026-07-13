"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PLATFORM_LABELS,
  PLATFORMS,
  PRIORITIES,
  PRIORITY_LABELS,
} from "@/lib/test-cases"
import type { ActionResult, TestCaseInput } from "@/app/(app)/projects/[slug]/test-case-library/actions"
import type { TestCaseCategory, TestCasePlatform, TestCasePriority } from "@/types/database.types"

const NO_PLATFORM = "__none__"
const NO_OWNER = "__none__"

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().max(5000).optional(),
  preconditions: z.string().max(5000).optional(),
  expectedResult: z.string().max(5000).optional(),
  priority: z.enum(PRIORITIES as [TestCasePriority, ...TestCasePriority[]]),
  category: z.enum(CATEGORIES as [TestCaseCategory, ...TestCaseCategory[]]),
  platform: z.string(),
  tagsInput: z.string().max(300).optional(),
  ownerId: z.string(),
  estimatedMinutes: z.string().max(10).optional(),
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

export function TestCaseForm({
  action,
  members,
  defaultValues,
  submitLabel = "Create test case",
  readOnly = false,
}: {
  action: (input: TestCaseInput) => Promise<ActionResult>
  members: { id: string; name: string }[]
  defaultValues?: Partial<{
    title: string
    description: string
    preconditions: string
    expectedResult: string
    priority: TestCasePriority
    category: TestCaseCategory
    platform: TestCasePlatform | null
    tagsInput: string
    ownerId: string | null
    estimatedMinutes: string
  }>
  submitLabel?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      preconditions: defaultValues?.preconditions ?? "",
      expectedResult: defaultValues?.expectedResult ?? "",
      priority: defaultValues?.priority ?? "medium",
      category: defaultValues?.category ?? "regression",
      platform: defaultValues?.platform ?? NO_PLATFORM,
      tagsInput: defaultValues?.tagsInput ?? "",
      ownerId: defaultValues?.ownerId ?? NO_OWNER,
      estimatedMinutes: defaultValues?.estimatedMinutes ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    setFormError(null)

    const estimatedMinutes = values.estimatedMinutes
      ? Number.parseInt(values.estimatedMinutes, 10)
      : undefined

    if (values.estimatedMinutes && Number.isNaN(estimatedMinutes)) {
      setFormError("Estimated time must be a number.")
      return
    }

    const result = await action({
      title: values.title,
      description: values.description || undefined,
      preconditions: values.preconditions || undefined,
      expectedResult: values.expectedResult || undefined,
      priority: values.priority,
      category: values.category,
      platform: values.platform === NO_PLATFORM ? undefined : (values.platform as TestCasePlatform),
      tags: parseTags(values.tagsInput),
      ownerId: values.ownerId === NO_OWNER ? undefined : values.ownerId,
      estimatedMinutes,
    })

    if (result?.error) {
      setFormError(result.error)
      return
    }

    toast.success("Saved")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" disabled={readOnly} {...register("title")} />
            <FieldError errors={[errors.title]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea id="description" rows={3} disabled={readOnly} {...register("description")} />
            <FieldError errors={[errors.description]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="preconditions">Preconditions</FieldLabel>
            <Textarea id="preconditions" rows={2} disabled={readOnly} {...register("preconditions")} />
            <FieldError errors={[errors.preconditions]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="expectedResult">Expected result</FieldLabel>
            <Textarea id="expectedResult" rows={3} disabled={readOnly} {...register("expectedResult")} />
            <FieldError errors={[errors.expectedResult]} />
          </FieldContent>
        </Field>

        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="priority">Priority</FieldLabel>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select
                  items={PRIORITY_LABELS}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger id="priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldContent>
          <FieldContent>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  items={CATEGORY_LABELS}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldContent>
        </Field>

        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="platform">Platform</FieldLabel>
            <Controller
              control={control}
              name="platform"
              render={({ field }) => (
                <Select
                  items={{ [NO_PLATFORM]: "Not platform-specific", ...PLATFORM_LABELS }}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger id="platform" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PLATFORM}>Not platform-specific</SelectItem>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLATFORM_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldContent>
          <FieldContent>
            <FieldLabel htmlFor="owner">Owner</FieldLabel>
            <Controller
              control={control}
              name="ownerId"
              render={({ field }) => (
                <Select
                  items={{
                    [NO_OWNER]: "Unassigned",
                    ...Object.fromEntries(members.map((m) => [m.id, m.name])),
                  }}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger id="owner" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OWNER}>Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldContent>
        </Field>

        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="tagsInput">Tags</FieldLabel>
            <Input id="tagsInput" placeholder="login, api" disabled={readOnly} {...register("tagsInput")} />
            <FieldDescription>Comma-separated.</FieldDescription>
          </FieldContent>
          <FieldContent>
            <FieldLabel htmlFor="estimatedMinutes">Estimated time (minutes)</FieldLabel>
            <Input
              id="estimatedMinutes"
              inputMode="numeric"
              disabled={readOnly}
              {...register("estimatedMinutes")}
            />
            <FieldError errors={[errors.estimatedMinutes]} />
          </FieldContent>
        </Field>

        {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
        {!readOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        )}
      </FieldGroup>
    </form>
  )
}
