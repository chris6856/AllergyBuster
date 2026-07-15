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

# Named declarations that open a block: never cascade-remove these lines because
# their opening { would orphan the body. if/guard/while/for blocks ARE removable
# (they'll be removed together with their body via block-tracking cascade).
_DECL_OPEN_RE = re.compile(
    r"^\s*(?:(?:static|class|final|open|public|internal|private|fileprivate|override)\s+)*"
    r"(?:func|class\s+\w|struct\s+\w|enum\s+\w|extension\s+\w|init\s*[\(\<]|subscript\s*[\(\<])"
)

# Variable names too generic, or critical functions, that must not be cascade-removed.
_SKIP_CASCADE = {
    "self", "super", "result", "error", "value", "data",
    "response", "config", "state", "options", "context",
    "type", "key", "info", "item", "name", "text",
    "price", "date", "status", "count", "index", "total",
    "product", "transaction", "subscription",
    # Core purchase functions — essential for non-consumable IAP:
    "purchase", "purchaseIOS", "purchaseOptions",
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


def _cascade_pass(patched_lines):
    """
    One cascade pass.  Extracts cascade vars from ALL // XCODE26 lines
    (primary, block-body, and prior CASCADE lines), then comments out every
    live line that references any of those vars as a whole word (\bVAR\b).

    Block-opening lines are handled as follows:
      - Named declarations (func/class/struct/enum/extension/init): NEVER
        cascade-removed — their opening { must stay or the body is orphaned.
      - All other block openers (if/guard/while/closure, etc.): cascade-
        removed WITH their entire body (block-tracking) so braces stay balanced.
    """
    cascade_vars = set()
    for line in patched_lines:
        if not line.startswith("// XCODE26"):
            continue
        m = _BIND_RE.match(line)
        if m:
            v = m.group(1)
            if v not in _SKIP_CASCADE and len(v) >= 5:
                cascade_vars.add(v)

    if not cascade_vars:
        return patched_lines, 0

    patterns = [re.compile(r"\b" + re.escape(v) + r"\b") for v in cascade_vars]

    result = []
    n_new = 0
    i = 0
    lines = patched_lines
    while i < len(lines):
        line = lines[i]
        if line.startswith("// XCODE26"):
            result.append(line)
            i += 1
            continue

        if any(p.search(line) for p in patterns):
            opens = line.count("{")
            closes = line.count("}")
            net = opens - closes

            if net > 0 and _DECL_OPEN_RE.match(line):
                # Named declaration: protect it — never cascade-remove
                result.append(line)
                i += 1
            elif net > 0:
                # Block-opening non-declaration (if/guard/closure/etc.):
                # cascade-remove this line AND its entire block body so
                # braces remain balanced.
                result.append("// XCODE26 CASCADE " + line.rstrip() + "\n")
                n_new += 1
                depth = net
                i += 1
                while i < len(lines) and depth > 0:
                    body = lines[i]
                    depth += body.count("{") - body.count("}")
                    if body.startswith("// XCODE26"):
                        result.append(body)
                    else:
                        result.append("// XCODE26 CASCADE " + body.rstrip() + "\n")
                        n_new += 1
                    i += 1
            else:
                result.append("// XCODE26 CASCADE " + line.rstrip() + "\n")
                n_new += 1
                i += 1
        else:
            result.append(line)
            i += 1

    return result, n_new


def _patch_cascade(patched_lines):
    """
    Up to 2 cascade passes so transitive variable dependencies are caught
    (e.g. `terms` → `firstOffer` → line 890).  Stops early if nothing new
    is cascade-commented.
    """
    total = 0
    for _ in range(2):
        patched_lines, n_new = _cascade_pass(patched_lines)
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
