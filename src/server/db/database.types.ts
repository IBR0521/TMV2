
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "company_id": string,"cost_cents": number,"created_at": string,"documents": number,"id": string,"month": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"cost_cents"?: number,"created_at"?: string,"documents"?: number,"id"?: string,"month": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"cost_cents"?: number,"created_at"?: string,"documents"?: number,"id"?: string,"month"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_type": string,"after": Json | null,"before": Json | null,"company_id": string,"created_at": string,"id": string,"subject_id": string | null,"subject_type": string,"undo": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_type": string,"after"?: Json | null,"before"?: Json | null,"company_id": string,"created_at"?: string,"id"?: string,"subject_id"?: string | null,"subject_type": string,"undo"?: Json | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_type"?: string,"after"?: Json | null,"before"?: Json | null,"company_id"?: string,"created_at"?: string,"id"?: string,"subject_id"?: string | null,"subject_type"?: string,"undo"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"automation_settings": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"mode": string,"rule_key": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"mode": string,"rule_key": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"mode"?: string,"rule_key"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "automation_settings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "automation_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"automation_test_pings": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"id": string,"note": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "automation_test_pings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "automation_test_pings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "archived_at": string | null,"company_id": string,"created_at": string,"dot_number": string | null,"id": string,"mc_number": string | null,"name": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"company_id"?: never,"created_at"?: string,"dot_number"?: string | null,"id"?: string,"mc_number"?: string | null,"name": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"company_id"?: never,"created_at"?: string,"dot_number"?: string | null,"id"?: string,"mc_number"?: string | null,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"events": {
                  Row: {
                    "actor_id": string | null,"actor_type": string,"company_id": string,"id": string,"job_queued": boolean,"occurred_at": string,"payload": NonNullable<Json>,"processed_at": string | null,"subject_id": string | null,"subject_type": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_type"?: string,"company_id": string,"id"?: string,"job_queued"?: boolean,"occurred_at"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"subject_id"?: string | null,"subject_type": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_type"?: string,"company_id"?: string,"id"?: string,"job_queued"?: boolean,"occurred_at"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"subject_id"?: string | null,"subject_type"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"files": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"mime": string,"sha256": string | null,"size_bytes": number,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"mime": string,"sha256"?: string | null,"size_bytes": number,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"mime"?: string,"sha256"?: string | null,"size_bytes"?: number,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"company_id": string,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"role": Database["public"]['Enums']["user_role"],"status": Database["public"]['Enums']["invitation_status"],"token": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"company_id": string,"created_at"?: string,"email": string,"expires_at": string,"id"?: string,"invited_by"?: string | null,"role": Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["invitation_status"],"token": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"company_id"?: string,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["invitation_status"],"token"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "company_id": string,"created_at": string,"driver_id": string | null,"id": string,"role": Database["public"]['Enums']["user_role"],"status": Database["public"]['Enums']["membership_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"driver_id"?: string | null,"id"?: string,"role": Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["membership_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"driver_id"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["membership_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"number_sequences": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"name": string,"next_value": number,"prefix": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"name": string,"next_value"?: number,"prefix"?: string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"next_value"?: number,"prefix"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "number_sequences_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "ai_quota": number,"company_id": string,"created_at": string,"current_period_end": string | null,"id": string,"plan": string,"provider": string,"status": Database["public"]['Enums']["subscription_status"],"trial_ends_at": string | null,"truck_limit": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_quota"?: number,"company_id": string,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"plan"?: string,"provider"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"trial_ends_at"?: string | null,"truck_limit"?: number,"updated_at"?: string
                  }
                  Update: {
                    "ai_quota"?: number,"company_id"?: string,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"plan"?: string,"provider"?: string,"status"?: Database["public"]['Enums']["subscription_status"],"trial_ends_at"?: string | null,"truck_limit"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"suggestions": {
                  Row: {
                    "action_name": string | null,"action_params": NonNullable<Json>,"company_id": string,"created_at": string,"dedupe_key": string,"detail": string | null,"event_id": string | null,"id": string,"payload": NonNullable<Json>,"resolved_at": string | null,"resolved_by": string | null,"status": string,"subject_id": string | null,"subject_type": string | null,"title": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_name"?: string | null,"action_params"?: NonNullable<Json>,"company_id": string,"created_at"?: string,"dedupe_key": string,"detail"?: string | null,"event_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"subject_id"?: string | null,"subject_type"?: string | null,"title": string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "action_name"?: string | null,"action_params"?: NonNullable<Json>,"company_id"?: string,"created_at"?: string,"dedupe_key"?: string,"detail"?: string | null,"event_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"subject_id"?: string | null,"subject_type"?: string | null,"title"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "suggestions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "suggestions_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "auth_id": string,"created_at": string,"email": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_id": string,"created_at"?: string,"email": string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Update: {
                    "auth_id"?: string,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "auth_company_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"auth_driver_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"auth_member_company_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"auth_user_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"tm_accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"tm_apply_tenant_rls":
{ Args: { "p_ops"?: string,"p_table": string }; Returns: undefined
                           },
"tm_create_company_with_owner":
{ Args: { "p_dot_number": string,"p_mc_number": string,"p_name": string,"p_timezone": string }; Returns: string
                           },
"tm_tenant_tables":
{ Args: Record<PropertyKey, never>; Returns: {
              "table_name": string
            }[]
                           }
          }
          Enums: {
            "invitation_status": "pending"|"accepted"|"revoked","membership_status": "active"|"invited"|"disabled","subscription_status": "trialing"|"active"|"past_due"|"cancelled","user_role": "owner"|"dispatcher"|"accounting"|"driver"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "invitation_status": ["pending", "accepted", "revoked"],"membership_status": ["active", "invited", "disabled"],"subscription_status": ["trialing", "active", "past_due", "cancelled"],"user_role": ["owner", "dispatcher", "accounting", "driver"]
          }
        }
} as const
