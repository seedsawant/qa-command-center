import type { AppRole } from "@/types/database.types"

export const ROLE_LABELS: Record<AppRole, string> = {
  producer: "Producer",
  qa_lead: "QA Lead",
  tester: "Tester",
  viewer: "Viewer",
}

export const ASSIGNABLE_ROLES: AppRole[] = ["producer", "qa_lead", "tester", "viewer"]

export function canCreateProject(role: AppRole) {
  return role === "producer"
}

export function canManageMembers(role: AppRole) {
  return role === "producer"
}

export function canEditProjectSettings(role: AppRole) {
  return role === "producer"
}

export function canInviteUsers(role: AppRole) {
  return role === "producer"
}

export function canManageTestCases(role: AppRole) {
  return role === "producer" || role === "qa_lead"
}
