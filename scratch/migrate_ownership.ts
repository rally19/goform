import { db } from "../src/db";
import { forms } from "../src/db/schema";
import { isNotNull, isNull } from "drizzle-orm";

async function migrate() {
  console.log("Starting ownership migration...");
  
  const result = await db.update(forms)
    .set({ userId: null })
    .where(isNotNull(forms.organizationId))
    .returning({ id: forms.id });

  console.log(`Migration complete. Updated ${result.length} organization forms to have null userId.`);
}

migrate().catch(console.error);
