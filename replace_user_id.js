const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

function processFile(filePath) {
  if (filePath.includes('schema.ts')) return; // Already updated

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace .userId with .workspaceId
  content = content.replace(/\.userId/g, '.workspaceId');

  // Replace eq(workspaceId, user.id) with eq(workspaceId, user.defaultWorkspaceId)
  content = content.replace(/eq\(([^,]+)\.workspaceId,\s*user\.id\)/g, 'eq($1.workspaceId, user.defaultWorkspaceId)');
  
  // Replace { workspaceId: user.id } with { workspaceId: user.defaultWorkspaceId }
  content = content.replace(/workspaceId:\s*user\.id/g, 'workspaceId: user.defaultWorkspaceId');

  // Any left over user.id that are now supposed to be workspaceId? 
  // We have to be careful not to break user authentication.
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log("Updated", filePath);
  }
}

['app', 'lib', 'components'].forEach(dir => walkDir(dir, processFile));
