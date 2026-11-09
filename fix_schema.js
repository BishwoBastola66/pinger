const fs = require('fs');
let schema = fs.readFileSync('lib/db/schema.ts', 'utf8');

// Remove lines 28-46
const lines = schema.split('\n');
lines.splice(27, 19);

// Now fix the double workspaceId in workspaceUsers (around line 95 which is now 95-19 = 76)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("export const workspaceUsers = pgTable")) {
    // The next line is workspaceId, the next is also workspaceId
    if (lines[i+2].includes("workspaceId: uuid('workspace_id')")) {
      lines[i+2] = "  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),";
    }
  }
}

fs.writeFileSync('lib/db/schema.ts', lines.join('\n'));
