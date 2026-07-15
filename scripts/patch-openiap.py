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

# Bridge helper functions whose definitions used the missing APIs;
# call sites in any file must also be commented out.
REMOVED_BRIDGE_FUNCS = [
    "billingPlanTypeIOS",
    "renewalBillingPlanTypeIOS",
    "transactionCommitmentInfoIOS",
]

# Block-scoped statements where { may appear on the NEXT line (deferred brace).
_BLOCK_STMT_RE = re.compile(r"^\s*(if\s|guard\s|while\s|for\s|func\s|init\(|switch\s)")

# Variable names too generic or too important for non-subscription code
# to safely cascade-comment everywhere.
_SKIP_CASCADE = {
    "self", "super", "result", "error", "value", "data",
    "response", "config", "state", "options", "context",
    "type", "key", "info", "item", "name", "text",
    "price", "date", "status", "count", "index", "total",
    "product", "transaction", "subscription",
}


def _patch_lines(lines, removed_patterns):
    """
    First pass: comment out lines containing removed patterns plus their block bodies.

    Cases for the opening {:
      a) { on matched line, net > 0   → skip_depth = net
      b) { balanced on matched line   → single-line body, nothing to skip
      c) { deferred to a later line   → pending_skip (block-statement lines only)
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
                pending_skip = True                   # case c
            # else case b — balanced or bare expression
        else:
            patched.append(line)

    return patched


# Regex to extract a variable name from any XCODE26-prefixed binding line.
# Handles: `let X = ...`, `var X = ...`, `if let X = ...`, `guard let X = ...`, etc.
_BIND_RE = re.compile(r"^// XCODE26.*?\b(?:let|var)\s+(\w+)\s*=")


def _patch_cascade(patched_lines):
    """
    Multi-pass cascade: any variable bound to a removed-API value on a
    // XCODE26 line becomes undefined.  Comment out every remaining live line
    that references that variable as a whole word (\bVAR\b), then repeat until
    stable (handles transitive dependencies).

    Unlike the previous [.?!] suffix approach this also catches:
      - bare arguments:  someFunc(firstOffer)
      - from: labels:    makeInfo(from: commitment)
      - conditional use: if firstOffer != nil { ... }
    """
    max_passes = 6
    total = 0

    for pass_num in range(max_passes):
        # Re-extract cascade vars from ALL XCODE26-prefixed lines each pass
        # (includes lines produced by previous cascade passes).
        cascade_vars = set()
        for line in patched_lines:
            m = _BIND_RE.match(line)
            if m:
                v = m.group(1)
                if v not in _SKIP_CASCADE and len(v) >= 5:
                    cascade_vars.add(v)

        if not cascade_vars:
            break

        patterns = [re.compile(r"\b" + re.escape(v) + r"\b") for v in cascade_vars]

        result = []
        n_new = 0
        for line in patched_lines:
            if line.startswith("// XCODE26"):
                result.append(line)
            elif any(p.search(line) for p in patterns):
                result.append("// XCODE26 CASCADE " + line.rstrip() + "\n")
                n_new += 1
            else:
                result.append(line)

        patched_lines = result
        total += n_new

        if n_new == 0:
            break

    if total:
        print(f"  cascade: {total} lines across passes")
    return patched_lines


def patch_file(path, removed_patterns, cascade=False):
    with open(path) as f:
        lines = f.readlines()

    patched = _patch_lines(lines, removed_patterns)

    if cascade:
        patched = _patch_cascade(patched)

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
        print("Types.swift: no changes needed")
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
module = f"{PODS}/OpenIapModule.swift"
if check_file(module, "OpenIapModule.swift"):
    n = patch_file(module, REMOVED_BRIDGE_FUNCS, cascade=False)
    print(f"OpenIapModule.swift: {n} lines patched total")
