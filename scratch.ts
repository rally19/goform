import { db } from "./src/db";
import { forms } from "./src/db/schema";
async function main() {
  const allForms = await db.select().from(forms);
  console.log(allForms);
}
main();
