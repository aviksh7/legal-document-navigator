import { spawnSync } from "node:child_process";

function git(args, input) {
  const result = spawnSync("git", args, {
    input,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || ![0, 1].includes(result.status)) {
    throw new Error("Unable to inspect Git metadata.");
  }
  return result;
}

try {
  // Include the index even for force-added ignored files, and visible new files.
  const listing = git([
    "ls-files", "--cached", "--others", "--exclude-standard", "-z",
  ]);
  if (listing.status !== 0) throw new Error("Unable to list repository files.");
  const paths = [...new Set(listing.stdout.split("\0").filter(Boolean))];

  // Honor both shared ignores and local exclusions without reading file contents.
  const ignored = paths.length
    ? git(["check-ignore", "--no-index", "--stdin", "-z"], `${paths.join("\0")}\0`)
    : { stdout: "" };
  const prohibited = new Set(ignored.stdout.split("\0").filter(Boolean));
  const sensitivePath = /(^|\/)(\.?env(?:[._-]|$)|\.?local(?:[._/-]|$)|\.?private(?:[._/-]|$)|\.?scratch(?:[._/-]|$)|secrets?(?:[._/-]|$)|credentials?(?:[._/-]|$)|id_(?:rsa|ed25519)(?:[._-]|$))/i;
  const credentialFile = /\.(?:pem|key|p12|pfx)$/i;
  for (const path of paths) {
    if (sensitivePath.test(path) || credentialFile.test(path)) {
      prohibited.add(path);
    }
  }

  if (prohibited.size) {
    // Do not expose potentially sensitive names or contents in CI logs.
    console.error(`Repository hygiene failed: ${prohibited.size} prohibited path(s).`);
    console.error("Review Git's index and visible new files against docs/SECURITY.md.");
    process.exitCode = 1;
  } else {
    console.log(`Repository hygiene passed: ${paths.length} indexed or visible new file(s) checked.`);
  }
} catch {
  console.error("Repository hygiene failed: unable to inspect Git metadata.");
  process.exitCode = 1;
}
