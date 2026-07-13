export type AppRole = "producer" | "qa_lead" | "tester" | "viewer"
export type ProjectStatus = "active" | "archived"
export type TestCaseStatus = "active" | "archived"
export type TestCasePriority = "critical" | "high" | "medium" | "low"
export type TestCaseCategory =
  | "smoke"
  | "regression"
  | "sanity"
  | "performance"
  | "security"
  | "uat"
  | "automation"
export type TestCasePlatform = "android" | "ios" | "web" | "api"

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: AppRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: AppRole
          is_active?: boolean
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          role?: AppRole
          is_active?: boolean
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          platform_tags: string[]
          status: ProjectStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          slug: string
          description?: string | null
          platform_tags?: string[]
          status?: ProjectStatus
          created_by: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          platform_tags?: string[]
          status?: ProjectStatus
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          added_by: string | null
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          added_by?: string | null
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          id: string
          project_id: string
          case_number: number
          title: string
          description: string | null
          preconditions: string | null
          expected_result: string | null
          priority: TestCasePriority
          category: TestCaseCategory
          platform: TestCasePlatform | null
          tags: string[]
          owner_id: string | null
          estimated_minutes: number | null
          status: TestCaseStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          project_id: string
          title: string
          description?: string | null
          preconditions?: string | null
          expected_result?: string | null
          priority?: TestCasePriority
          category?: TestCaseCategory
          platform?: TestCasePlatform | null
          tags?: string[]
          owner_id?: string | null
          estimated_minutes?: number | null
          status?: TestCaseStatus
          created_by: string
        }
        Update: {
          title?: string
          description?: string | null
          preconditions?: string | null
          expected_result?: string | null
          priority?: TestCasePriority
          category?: TestCaseCategory
          platform?: TestCasePlatform | null
          tags?: string[]
          owner_id?: string | null
          estimated_minutes?: number | null
          status?: TestCaseStatus
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cases_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_versions: {
        Row: {
          id: string
          test_case_id: string
          version_number: number
          title: string
          description: string | null
          preconditions: string | null
          expected_result: string | null
          priority: TestCasePriority
          category: TestCaseCategory
          platform: TestCasePlatform | null
          tags: string[]
          owner_id: string | null
          estimated_minutes: number | null
          changed_by: string
          changed_at: string
          change_note: string | null
        }
        Insert: {
          test_case_id: string
          version_number: number
          title: string
          description?: string | null
          preconditions?: string | null
          expected_result?: string | null
          priority: TestCasePriority
          category: TestCaseCategory
          platform?: TestCasePlatform | null
          tags?: string[]
          owner_id?: string | null
          estimated_minutes?: number | null
          changed_by: string
          change_note?: string | null
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: "test_case_versions_test_case_id_fkey"
            columns: ["test_case_id"]
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_versions_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: AppRole
      test_case_priority: TestCasePriority
      test_case_category: TestCaseCategory
      test_case_platform: TestCasePlatform
    }
  }
}
