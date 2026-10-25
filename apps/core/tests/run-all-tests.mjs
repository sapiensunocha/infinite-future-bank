import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'security-api.test.mjs',
  'auth-services.test.mjs',
  'financial-logic.test.mjs',
  'ui-user-flow.test.mjs'
];

console.log('================================================================');
console.log('   IFB DEUS PLATFORM: INSTITUTIONAL BANKING VERIFICATION SUITE   ');
console.log('================================================================\n');

async function runTest(file) {
  const filePath = path.join(__dirname, file);
  return new Promise((resolve) => {
    const proc = spawn('node', ['--test', filePath], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    proc.on('close', (code) => {
      resolve({ file, passed: code === 0, code });
    });
  });
}

async function runAll() {
  const results = [];
  for (const file of testFiles) {
    console.log(`\n▶ Running Suite: ${file}`);
    const result = await runTest(file);
    results.push(result);
  }

  console.log('\n================================================================');
  console.log('                     TEST SUMMARY REPORT                        ');
  console.log('================================================================');

  let allPassed = true;
  for (const res of results) {
    const mark = res.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(` ${mark.padEnd(10)} | ${res.file}`);
    if (!res.passed) allPassed = false;
  }

  console.log('================================================================\n');
  if (allPassed) {
    console.log('🎉 ALL INSTITUTIONAL SECURITY & FUNCTIONAL SUITES PASSED CLEANLY.\n');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW TEST OUTPUT ABOVE.\n');
    process.exit(1);
  }
}

runAll();
