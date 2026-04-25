import { assertAdmin } from "@/lib/actions/admin/utils";

export async function adminProcedure() {
  try {
    const result = await assertAdmin();
    return { success: true, user: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Authentication failed" 
    };
  }
}
