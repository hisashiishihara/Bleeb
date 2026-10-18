#!/usr/bin/env python3
"""Fail closed on likely credentials anywhere in reachable Git history.

Never emit content, candidate secrets, or fragments of matching lines.
This is an automated heuristic check, not a comprehensive security audit.
"""
import re
import subprocess
import sys

def git(*args):
    return subprocess.check_output(["git", *args], stderr=subprocess.DEVNULL)

# Resolve all reachable objects, including tags and non-default refs fetched by checkout.
commits = git("rev-list", "--all").decode().splitlines()
objects = set()
for line in git("rev-list", "--objects", "--all").decode("utf-8", "replace").splitlines():
    objects.add(line.split(" ", 1)[0])
patterns = [
    ("private-key", re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----")),
    ("provider-token", re.compile(rb"(?:sk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16})")),
    ("credential-assignment", re.compile(rb"(?i)(?:api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|password)\s*[:=]\s*[\"']?[A-Za-z0-9_+/.=-]{24,}")),
    ("signed-url", re.compile(rb"(?i)(?:X-Amz-Signature|X-Goog-Signature|sig=)[a-f0-9]{32,}")),
]
findings = {}
scanned = 0
for oid in objects:
    kind = git("cat-file", "-t", oid).strip()
    if kind != b"blob":
        continue
    size = int(git("cat-file", "-s", oid))
    if size > 2_000_000:
        continue
    data = git("cat-file", "blob", oid)
    if b"\x00" in data[:8192]:
        continue
    scanned += 1
    matched = [name for name, pattern in patterns if pattern.search(data)]
    if matched:
        findings[oid[:12]] = matched

print(f"Historical audit: {len(commits)} commits, {scanned} unique text blobs inspected.")
if findings:
    print(f"REVIEW REQUIRED: {len(findings)} blobs matched heuristic detectors.")
    for oid, categories in sorted(findings.items()):
        print(f"blob={oid} categories={','.join(categories)}")
    sys.exit(1)
print("PASS: No matches to configured high-confidence secret patterns.")
print("LIMITATION: Heuristic scan only; perform a separate full gitleaks scan and manual historical review before Public release.")
