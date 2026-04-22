
const fs = require('fs');
const path = require('path');

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                search(fullPath);
            }
        } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Failed to process message embedding')) {
                console.log('Found in:', fullPath);
            }
        }
    }
}

search('.');
