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

# Helper functions inside StoreKitTypesBridge that were removed (their definitions
# used the missing APIs) but are still called from other sites in the same file
# and from OpenIapModule.swift.
REMOVED_BRIDGE_FUNCS = [
    "billingPlanTypeIOS",
    "renewalBillingPlanTypeIOS",
]

# Patterns that begin a block-scoped statement — { may appear on the next line.
# Only these trigger pending_skip; plain `let/var` assignments do not.
_BLOCK_STMT_RE = re.compile(r"^\s*(if\s|guard\s|while\s|for\s|func\s|init\(|switch\s)")


def patch_lines(path, removed_patterns):
    """
    Comment out lines containing removed patterns, plus their block bodies.

    Three cases for the opening {:
      a) { on the matched line, net > 0  → skip_depth = net (classic)
      b) { on the matched line, balanced → single-line body, nothing to skip
      c) { deferred to a later line       → pending_skip = True (new)
         (only for control-flow / func stmts; plain assignments have no block)
    """
    with open(path) as f:
        lines = f.readlines()

    patched = []
    skip_depth = 0
    pending_skip = False

    for line in lines:
        stripped = line.rstrip()
        opens = line.count("{")
        closes = line.count("}")
        net = opens - closes

        # ── inside a skipped block ───────────────────────────────────────────
        if skip_depth > 0:
            skip_depth += net
            patched.append("// XCODE26 " + stripped + "\n")
            continue

        # ── waiting for the deferred { ───────────────────────────────────────
        if pending_skip:
            patched.append("// XCODE26 " + stripped + "\n")
            if opens > 0:
                pending_skip = False
                skip_depth = max(0, net)
            continue

        # ── check if this line contains a removed pattern ────────────────────
        if any(r in line for r in removed_patterns):
            patched.append("// XCODE26 " + stripped + "\n")
            if net > 0:
                skip_depth = net                       # case a
            elif opens == 0 and _BLOCK_STMT_RE.match(line):
                pending_skip = True                    # case c — deferred {
            # else: case b — balanced single-line or bare expression, no block
        else:
            patched.append(line)

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
        print("Types.swift: no changes needed (already optional or pattern not matched)")
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
# Patch for removed StoreKit APIs AND for call sites of helper functions whose
# definitions were removed (billingPlanTypeIOS / renewalBillingPlanTypeIOS).
bridge = f"{PODS}/Helpers/StoreKitTypesBridge.swift"
if not check_file(bridge, "StoreKitTypesBridge.swift"):
    sys.exit(1)

n = patch_lines(bridge, REMOVED_STOREKIT + REMOVED_BRIDGE_FUNCS)
print(f"StoreKitTypesBridge.swift: patched {n} lines")

# ── Types.swift ────────────────────────────────────────────────────────────────
types = f"{PODS}/Models/Types.swift"
if check_file(types, "Types.swift"):
    patch_types(types)

# ── OpenIapModule.swift ────────────────────────────────────────────────────────
# Calls StoreKitTypesBridge.renewalBillingPlanTypeIOS / billingPlanTypeIOS,
# both of which were removed by the bridge patch above.
module = f"{PODS}/OpenIapModule.swift"
if check_file(module, "OpenIapModule.swift"):
    n = patch_lines(module, REMOVED_BRIDGE_FUNCS)
    print(f"OpenIapModule.swift: patched {n} lines")
