// Read-only Linux process sample. Measures all of plasmashell, not wallpaper alone.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';

const seconds = Number(process.argv[2] ?? 10);
if (!Number.isFinite(seconds) || seconds < 1 || seconds > 120) {
    throw new Error('Usage: node checks/usage.mjs [seconds: 1..120]');
}
const ticksPerSecond = Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim());
const pids = readdirSync('/proc').filter(name => /^\d+$/.test(name)).filter(pid => {
    try {
        return readFileSync(`/proc/${pid}/comm`, 'utf8').trim() === 'plasmashell'
            && Number(readFileSync(`/proc/${pid}/status`, 'utf8').match(/^Uid:\s+(\d+)/m)?.[1]) === process.getuid();
    } catch { return false; } // Processes can exit during enumeration.
});
if (pids.length !== 1) throw new Error(`Expected one plasmashell for current UID, found ${pids.length}`);
const pid = pids[0];
function sample() {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    const status = readFileSync(`/proc/${pid}/status`, 'utf8');
    return {
        ticks: Number(fields[11]) + Number(fields[12]), start: fields[19],
        rssKiB: Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]), time: performance.now()
    };
}
const before = sample();
await new Promise(resolve => setTimeout(resolve, seconds * 1000));
const after = sample();
if (before.start !== after.start) throw new Error('plasmashell restarted during sample');
const elapsed = (after.time - before.time) / 1000;
const cpuPercentOneCore = (after.ticks - before.ticks) / ticksPerSecond / elapsed * 100;
console.log(JSON.stringify({
    process: 'plasmashell (including panels and other widgets)', pid: Number(pid), seconds: elapsed,
    cpuPercentOneCore, cpuPercentAllLogicalCpus: cpuPercentOneCore / cpus().length,
    logicalCpus: cpus().length, rssMiB: after.rssKiB / 1024
}, null, 2));
