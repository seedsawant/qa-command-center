export type AppRole = "producer" | "qa_lead" | "tester" | "viewer"
export type ProjectStatus = "active" | "archived"

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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: AppRole
    }
  }
}
