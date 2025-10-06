import fs from 'fs';
import path from 'path';

const servicesToUpdate = [
  'client/services/employeesService.ts',
  'client/services/productionService.ts',
  'client/services/visionService.ts',
  'client/services/camerasService.ts',
  'client/services/factoriesService.ts',
  'client/services/agentsService.ts'
];

servicesToUpdate.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if not exists
    if (!content.includes('import { apiFetch }')) {
      content = 'import { apiFetch } from "@/config/api";\n' + content;
    }
    
    // Replace fetch("/api/ with apiFetch("api/
    content = content.replace(/fetch\("\/api\//g, 'apiFetch("api/');
    
    // Replace fetch('/api/ with apiFetch('api/
    content = content.replace(/fetch\('\/api\//g, "apiFetch('api/");
    
    // Replace fetch(`/api/ with apiFetch(`api/
    content = content.replace(/fetch\(`\/api\//g, 'apiFetch(`api/');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${filePath}`);
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n✅ All services updated successfully!');
