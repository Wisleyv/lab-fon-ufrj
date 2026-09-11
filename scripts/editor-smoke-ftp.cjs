const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const FtpSrv = require("ftp-srv");
const ftp = require("basic-ftp");

const repoRoot = path.resolve(__dirname, "..");
const username = "labfon-smoke";
const password = "labfon-smoke-password";

async function provisionSmokeRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-ftp-smoke-"));
  const sourceRoot = path.join(root, "labfon-source");

  await fs.mkdir(sourceRoot, { recursive: true });
  await copyPublicationFixture(root);

  for (const directory of ["content", "scripts", "src"]) {
    await fs.cp(path.join(repoRoot, directory), path.join(sourceRoot, directory), {
      recursive: true,
    });
  }

  for (const fileName of [
    "package.json",
    "index.html",
    "editor.html",
    "vite.config.js",
  ]) {
    await fs.copyFile(
      path.join(repoRoot, fileName),
      path.join(sourceRoot, fileName),
    );
  }

  return root;
}

async function copyPublicationFixture(root) {
  const distRoot = path.join(repoRoot, "dist");

  try {
    await fs.access(path.join(distRoot, "index.html"));
    for (const entry of await fs.readdir(distRoot)) {
      await fs.cp(path.join(distRoot, entry), path.join(root, entry), {
        recursive: true,
      });
    }
    return;
  } catch {
    await fs.writeFile(
      path.join(root, "index.html"),
      "<!doctype html><title>Lab-FON smoke publication</title>",
      "utf8",
    );
    await fs.writeFile(path.join(root, "data.json"), '{"page":{"sections":[]}}\n', "utf8");
    await fs.mkdir(path.join(root, "assets"), { recursive: true });
  }
}

async function startDisposableFtpServer(root) {
  const server = new FtpSrv({
    url: "ftp://127.0.0.1:0",
    pasv_url: "127.0.0.1",
    greeting: ["Lab-FON disposable smoke server"],
  });

  server.on("login", ({ username: login, password: secret }, resolve, reject) => {
    if (login === username && secret === password) {
      resolve({ root });
      return;
    }
    reject(new Error("Invalid disposable smoke credentials"));
  });

  await server.listen();
  const address = server.server.address();
  return { server, port: address.port };
}

async function verifyDisposableFtp({ root, port }) {
  const client = new ftp.Client(10000);
  const retrievedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-ftp-retrieved-"));

  try {
    await client.access({
      host: "127.0.0.1",
      port,
      user: username,
      password,
      secure: false,
    });

    const publicationEntries = await client.list("/");
    const sourceEntries = await client.list("/labfon-source");
    await client.downloadToDir(retrievedRoot, "/labfon-source");

    const required = [
      "package.json",
      "content/page.json",
      "content/site.json",
      "scripts/build-data.js",
    ];
    for (const relativePath of required) {
      await fs.access(path.join(retrievedRoot, relativePath));
    }

    return {
      publicationEntries,
      sourceEntries,
      retrievedRoot,
      root,
    };
  } finally {
    client.close();
  }
}

async function stopDisposableFtpServer(server, directories) {
  await server.close();
  await Promise.all(
    directories.map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
}

async function main() {
  const root = await provisionSmokeRoot();
  const { server, port } = await startDisposableFtpServer(root);
  let verification;

  try {
    verification = await verifyDisposableFtp({ root, port });
    console.log("Disposable Lab-FON FTP server ready");
    console.log("");
    console.log("Host: 127.0.0.1");
    console.log(`Port: ${port}`);
    console.log("Security: FTP (plain local test endpoint)");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log("");
    console.log("Published site folder: /");
    console.log("Editable project folder: /labfon-source");
    console.log("");
    console.log(
      `Automated verification passed: root listing (${verification.publicationEntries.length} entries), source listing (${verification.sourceEntries.length} entries), retrieval, and workspace validation.`,
    );
    console.log(`Temporary FTP root: ${root}`);
    console.log("Press Ctrl+C to stop.");

    const shutdown = async () => {
      await stopDisposableFtpServer(server, [root, verification.retrievedRoot]);
      process.exit(0);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    await stopDisposableFtpServer(server, [root]);
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Disposable FTP smoke setup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  copyPublicationFixture,
  provisionSmokeRoot,
  startDisposableFtpServer,
  stopDisposableFtpServer,
  verifyDisposableFtp,
};