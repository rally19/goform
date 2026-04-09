import { db } from "./src/db";
import { forms } from "./src/db/schema";
import { count, sql, isNull } from "drizzle-orm";

async function main() {
  try {
    const rows = await db
      .select({
        id: forms.id,
        title: forms.title,
        status: forms.status,
        createdAt: forms.createdAt,
        updatedAt: forms.updatedAt,
        slug: forms.slug,
        accentColor: forms.accentColor,
        responseCount: sql<number>`(
          SELECT COUNT(*) FROM form_responses WHERE form_id = ${forms.id}
        )`.mapWith(Number),
      })
      .from(forms);
      
    console.log("Success:", rows);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
