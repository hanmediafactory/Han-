import fs from 'fs';

const files = [
  'data/han.sqlite',
  'data/han.sqlite-wal',
  'work/backups/phase0-20261020/han.sqlite',
  'work/verification-backup.sqlite',
  'work/scratch_recovery_audit/recovered-mobile.sqlite'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  const str = buf.toString('latin1');
  console.log(`\n=== Scanning ${f} (${buf.length} bytes) ===`);

  // Search for any occurrence of 16000
  let idx = 0;
  let count16k = 0;
  while ((idx = str.indexOf('16000', idx)) !== -1) {
    count16k++;
    const snippet = str.slice(Math.max(0, idx - 80), Math.min(str.length, idx + 80)).replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
    console.log(`  [16000 Match at ${idx}]: ...${snippet}...`);
    idx += 5;
  }
  if (count16k === 0) console.log('  No "16000" occurrences found.');

  // Also search for JSON blocks with amount
  const matches = str.match(/\{[^{}]{5,200}\"amount\"[^{}]{5,200}\}/g) || [];
  console.log(`  JSON fragments with "amount": ${matches.length}`);
  const unique = Array.from(new Set(matches));
  for (const u of unique) {
    const clean = u.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    console.log(`    -> ${clean}`);
  }
}
