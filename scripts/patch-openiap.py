#!/usr/bin/env python3
"""
Patch openiap Swift sources for Xcode 26.4 final SDK compatibility.

StoreKit APIs that existed in iOS 26 beta were removed from the final Xcode 26.4 SDK:
  - Product.SubscriptionInfo.PricingTerms / BillingPlanType
  - Product.PurchaseOption.billingPlanType
  - Transaction.billingPlanType / commitmentInfo
  - Product.SubscriptionInfo.RenewalInfo.commitmentInfo / renewalBillingPlanType
  - Product.SubscriptionInfo.pricingTerms

AllergyBuster only uses non-consumable IAP, so none of these code paths execute.
"""
import os
import re
import sys

PODS = "AllergyBusterApp/ios/Pods/openiap/packages/apple/Sources"

# iOS 26 beta StoreKit property / type accesses removed from Xcode 26.4 final SDK
REMOVED_STOREKIT = [
    ".billingPlanType",
    ".commitmentInfo",
    ".renewalBillingPlanType",
    ".pricingTerms",
    "SubscriptionInfo.PricingTerms",
    "SubscriptionInfo.BillingPlanType",
]

# Bridge helper functions whose definitions used the missing APIs.
# Their call sites must also be commented out.
REMOVED_BRIDGE_FUNCS = [
    "billingPlanTypeIOS",
    "renewalBillingPlanTypeIOS",
    "transactionCommitmentInfoIOS",
]

# Patterns that begin a block-scoped statement — { may appear on the next line.
# Only these trigger pending_skip; plain `let/var` assignments do not.
_BLOCK_STMT_RE = re.compile(r"^\s*(if\s|guard\s|while\s|for\s|func\s|init\(|switch\s)")

# Variable names too generic to cascade-comment safely
_SKIP_CASCADE = {
    "self", "super", "result", "error", "value", "data",
    "response", "config", "state", "options", "context", "type", "key",
    "product", "transaction", "subscription",
}


def _patch_lines(lines, removed_patterns):
    """
    First pass: comment out lines containing removed patterns plus their block bodies.

    Three cases for the opening {:
      a) { on the matched line, net > 0   → skip_depth = net (classic)
      b) { balanced on the matched line   → single-line body, nothing to skip
      c) { deferred to a later line       → pending_skip (only for block statements)
    """
    patched = []
    skip_depth = 0
    pending_skip = False

    for line in lines:
        stripped = line.rstrip()
        opens = line.count("{")
        closes = line.count("}")
        net = opens - closes

        if skip_depth > 0:
            skip_depth += net
            patched.append("// XCODE26 " + stripped + "\n")
            continue

        if pending_skip:
            patched.append("// XCODE26 " + stripped + "\n")
            if opens > 0:
                pending_skip = False
                skip_depth = max(0, net)
            continue

        if any(r in line for r in removed_patterns):
            patched.append("// XCODE26 " + stripped + "\n")
            if net > 0:
                skip_depth = net                      # case a
            elif opens == 0 and _BLOCK_STMT_RE.match(line):
                pending_skip = True                   # case c — deferred {
            # else case b — balanced or bare expression, no block to skip
        else:
            patched.append(line)

    return patched


def _patch_cascade(patched_lines):
    """
    Second pass: when a removed-API line bound a variable (let X = something.api),
    that variable is now undefined.  Comment out any remaining live line that uses X.

    Matches: X. X? X! (i.e. the variable followed by an access or optional operator)
    Uses a negative lookbehind so that `obj.X` (field access) does not match.
    """
    # Extract variable names from patched-out binding lines
    bind_re = re.compile(r"^// XCODE26.*?\b(?:let|var)\s+(\w+)\s*=")
    cascade_vars = set()
    for line in patched_lines:
        m = bind_re.match(line)
        if m:
            v = m.group(1)
            if v not in _SKIP_CASCADE:
                cascade_vars.add(v)

    if not cascade_vars:
        return patched_lines, 0

    print(f"  cascade variables: {sorted(cascade_vars)}")
    patterns = [
        re.compile(r"(?<![.\w])" + re.escape(v) + r"[.?!]")
        for v in cascade_vars
    ]

    result = []
    n = 0
    for line in patched_lines:
        if line.startswith("// XCODE26"):
            result.append(line)
        elif any(p.search(line) for p in patterns):
            result.append("// XCODE26 CASCADE " + line.rstrip() + "\n")
            n += 1
        else:
            result.append(line)

    return result, n


def patch_file(path, removed_patterns, cascade=False):
    with open(path) as f:
        lines = f.readlines()

    patched = _patch_lines(lines, removed_patterns)

    if cascade:
        patched, n_cascade = _patch_cascade(patched)
        if n_cascade:
            print(f"  + {n_cascade} cascade lines")

    os.chmod(path, 0o644)
    with open(path, "w") as f:
        f.writelines(patched)

    n = sum(1 for l in patched if l.startswith("// XCODE26"))
    return n


def patch_types(path):
    """
    Make commitmentRenewalBillingPlanType optional (= nil default) so struct
    initialisers that omit it (because we patched out the argument) still compile.
    """
    with open(path) as f:
        content = f.read()

    before = content
    content = re.sub(
        r"(commitmentRenewalBillingPlanType\s*:\s*)(SubscriptionBillingPlanTypeIOS)\b(?!\?)",
        r"\1\2? = nil",
        content,
    )

    if content == before:
        print("Types.swift: no changes needed (already optional or pattern not found)")
        return

    os.chmod(path, 0o644)
    with open(path, "w") as f:
        f.write(content)
    print("Types.swift: made commitmentRenewalBillingPlanType optional")


def check_file(path, label):
    if not os.path.isfile(path):
        print(f"WARNING: {label} not found at {path}")
        for root, _, files in os.walk("AllergyBusterApp"):
            for name in files:
                if name == os.path.basename(path):
                    print(f"  Found at: {os.path.join(root, name)}")
        return False
    return True


# ── StoreKitTypesBridge.swift ──────────────────────────────────────────────────
# Patch removed StoreKit APIs + call sites of removed bridge helpers.
# Then cascade-comment any lines whose variables are now undefined.
bridge = f"{PODS}/Helpers/StoreKitTypesBridge.swift"
if not check_file(bridge, "StoreKitTypesBridge.swift"):
    sys.exit(1)

n = patch_file(bridge, REMOVED_STOREKIT + REMOVED_BRIDGE_FUNCS, cascade=True)
print(f"StoreKitTypesBridge.swift: {n} lines patched total")

# ── Types.swift ────────────────────────────────────────────────────────────────
types = f"{PODS}/Models/Types.swift"
if check_file(types, "Types.swift"):
    patch_types(types)

# ── OpenIapModule.swift ────────────────────────────────────────────────────────
# Calls StoreKitTypesBridge.{renewalBillingPlanTypeIOS,billingPlanTypeIOS,
# transactionCommitmentInfoIOS} — all removed by the bridge patch above.
module = f"{PODS}/OpenIapModule.swift"
if check_file(module, "OpenIapModule.swift"):
    n = patch_file(module, REMOVED_BRIDGE_FUNCS, cascade=False)
    print(f"OpenIapModule.swift: {n} lines patched total")
