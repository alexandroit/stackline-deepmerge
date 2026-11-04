"""Reject stale current-version claims in the exact npm tarball before publication."""
import json
import re
import sys
import tarfile

VERSION = r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?"
CURRENT = re.compile(r"^\s*\*{0,2}Current\s+(?:package\s+)?version\s*:", re.I)


def check_readme(manifest, readme):
    name, version = manifest["name"], manifest["version"]
    if name not in readme:
        raise ValueError(f"README does not identify {name}")
    claims = 0
    for number, line in enumerate(readme.splitlines(), 1):
        versions = []
        if CURRENT.search(line):
            versions = re.findall(VERSION, line)
            if not versions:
                raise ValueError(f"README:{number}: current version is missing")
        elif re.search(r"^\|\s*Package\s*\|", line, re.I):
            versions = re.findall(re.escape(name) + r"@(" + VERSION + r")", line)
        for declared in versions:
            claims += 1
            if declared != version:
                raise ValueError(f"README:{number}: {declared} differs from {name}@{version}")
    return claims


def check_archive(path):
    with tarfile.open(path, "r:gz") as archive:
        manifests = [m for m in archive.getmembers() if m.name.lstrip("./") == "package/package.json"]
        readmes = [m for m in archive.getmembers() if m.name.lstrip("./").lower() in ("package/readme.md", "package/readme")]
        if len(manifests) != 1 or len(readmes) != 1:
            raise ValueError("Package must have one root package.json and one README.md or README")
        if not all(m.isfile() and m.size < 8 * 1024 * 1024 for m in manifests + readmes):
            raise ValueError("Package metadata must be regular files smaller than 8 MiB")
        manifest = json.load(archive.extractfile(manifests[0]))
        readme = archive.extractfile(readmes[0]).read().decode("utf-8")
        claims = check_readme(manifest, readme)
        return {"package": manifest["name"], "version": manifest["version"], "readmeVersionClaims": claims}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 check-release-readme.py package.tgz [...]")
    for path in sys.argv[1:]:
        print(json.dumps(check_archive(path), sort_keys=True))
