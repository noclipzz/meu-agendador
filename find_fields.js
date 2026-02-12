const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/yanka/OneDrive/Área de Trabalho/nohudapp/meu-agendador/app');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.toLowerCase().includes('telefone') || content.toLowerCase().includes('phone') || content.toLowerCase().includes('cpf') || content.toLowerCase().includes('cep')) {
        console.log(`FILE: ${file}`);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (line.toLowerCase().includes('telefone') || line.toLowerCase().includes('phone') || line.toLowerCase().includes('cpf') || line.toLowerCase().includes('cep')) {
                console.log(`  ${i + 1}: ${line.trim()}`);
            }
        });
    }
});
