const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'my-app', 'src');

const replacements = {
  'bg-white(?!/|\\w)': 'bg-white dark:bg-slate-800',
  'text-slate-700(?!\\w)': 'text-slate-700 dark:text-slate-300',
  'text-slate-800(?!\\w)': 'text-slate-800 dark:text-slate-200',
  'text-slate-900(?!\\w)': 'text-slate-900 dark:text-slate-100',
  'text-slate-600(?!\\w)': 'text-slate-600 dark:text-slate-400',
  'text-slate-500(?!\\w)': 'text-slate-500 dark:text-slate-400',
  'border-slate-100(?!\\w)': 'border-slate-100 dark:border-slate-700',
  'border-slate-200(?!\\w)': 'border-slate-200 dark:border-slate-700',
  'bg-slate-50(?!/|\\w)': 'bg-slate-50 dark:bg-slate-900',
  'bg-slate-100(?!/|\\w)': 'bg-slate-100 dark:bg-slate-800',
  'shadow-slate-200/50': 'shadow-slate-200/50 dark:shadow-none'
};

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [search, replace] of Object.entries(replacements)) {
        const regex = new RegExp(`(?<!dark:)${search}`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(dir);
console.log('Done');
