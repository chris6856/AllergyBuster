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

Line prefixes used in patched output:
  // XCODE26          primary match (matched a removed-API pattern directly)
  // XCODE26 BODY     block/paren body (inside a primary-removed block or multiline call)
  // XCODE26 CASCADE  cascade match (variable/function from a prior XCODE26 line)
  // XCODE26 CASCADE BODY  body of a cascade-removed block
  // XCODE26 CHAIN    dangling if-let/guard opener cleaned up after cascade
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
    # makeDiscounts / makeDiscount call pricingTerms APIs and are removed by name so
    # their entire bodies are block-tracked (BODY prefix) rather than being compiled,
    # and so multiline call sites are removed via paren tracking.
    "makeDiscounts",
    "makeDiscount",
    # Functions that fail on Xcode 26.4 final in openiap 2.3.0+ (1289-line source):
    # renewalCommitmentInfoIOS: uses .commitmentInfo + .renewalBillingPlanType inside
    #   #if compiler(>=6.3) guard — those properties are still absent from iOS 26.4 SDK.
    "renewalCommitmentInfoIOS",
    # makeSubscriptionOffer: offer.paymentMode (SubscriptionOffer) removed/changed in
    #   iOS 26.4; substring also matches makeSubscriptionOffers which calls it.
    "makeSubscriptionOffer",
    # parseIntroductoryOfferFromJSON: Swift 6.3 rejects try?+as? in multi-binding
    #   guard let chain; cascades into missing-arg errors at lines 915 and 921.
    "parseIntroductoryOfferFromJSON",
    # makePurchaseOffer: Transaction.Offer.paymentMode is now non-optional in iOS 26.4
    #   so `if let mode = offer.paymentMode` is a type error.
    "makePurchaseOffer",
    # ownershipTypeDescription: defined @available(iOS 17.2, *) in openiap source but
    #   called from a function with no availability guard; app targets iOS 16.0.
    "ownershipTypeDescription",
]

# Block-scoped statements where { may appear on the NEXT line (deferred brace).
_BLOCK_STMT_RE = re.compile(r"^\s*(if\s|guard\s|while\s|for\s|func\s|init\(|switch\s)")

# Named declarations that open a block: never cascade-remove these lines because
# their opening { must stay or the body is orphaned.
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

# Subscription-related variable names that must ALWAYS be treated as cascade vars,
# regardless of whether _BIND_RE can extract them (guard-chain bindings, function
# parameters, and variables in BODY-prefixed blocks all escape extraction).
_CASCADE_SEEDS = frozenset({
    "commitment",   # Transaction.commitmentInfo binding
    "discounts",    # subscription discount array
    "firstOffer",   # pricingTerms introductory offer
    "introOffer",   # introductory offer from JSON guard chain
    "pricingTerms", # Product.SubscriptionInfo.pricingTerms
    "billingPlan",  # billingPlanType binding
    "renewalPlan",  # renewalBillingPlanType binding
    "planType",     # billing plan type alias
}) - _SKIP_CASCADE  # drop any names that overlap with the skip list


# ── Primary patching pass ──────────────────────────────────────────────────────

def _patch_lines(lines, removed_patterns):
    """
    Comment out lines containing removed patterns plus their block/call bodies.

    Prefixes used:
      // XCODE26       — the trigger line itself
      // XCODE26 BODY  — block body or paren-continuation line

    BODY lines are intentionally excluded from cascade-var extraction so that
    variables defined inside a removed function body (e.g. `paymentMode` inside
    makeDiscounts) cannot contaminate cascade vars and cause knock-on damage
    elsewhere in the file.

    Cases for the trigger line:
      a) net_c > 0  → curly block opened → skip_depth tracks the body
      b) balanced   → single-line expression, no body to track
      c) net_c = 0 and _BLOCK_STMT_RE match → block stmt with deferred {
      d) net_p > 0  → multiline call with unclosed ( → paren_depth tracks args
    """
    patched = []
    skip_depth = 0
    paren_depth = 0
    pending_skip = False

    for line in lines:
        stripped = line.rstrip()
        opens_c = line.count("{")
        closes_c = line.count("}")
        opens_p = line.count("(")
        closes_p = line.count(")")
        net_c = opens_c - closes_c
        net_p = opens_p - closes_p

        if skip_depth > 0:
            skip_depth = max(0, skip_depth + net_c)
            patched.append("// XCODE26 BODY " + stripped + "\n")
            continue

        if paren_depth > 0:
            paren_depth += net_p
            patched.append("// XCODE26 BODY " + stripped + "\n")
            if paren_depth <= 0:
                paren_depth = 0
                if net_c > 0:   # e.g. closing `) {` also opens a curly block
                    skip_depth = net_c
            continue

        if pending_skip:
            patched.append("// XCODE26 BODY " + stripped + "\n")
            if opens_c > 0:
                pending_skip = False
                skip_depth = max(0, net_c)
            continue

        if any(r in line for r in removed_patterns):
            patched.append("// XCODE26 " + stripped + "\n")
            if net_c > 0:
                skip_depth = net_c                  # case a
            elif opens_c == 0 and _BLOCK_STMT_RE.match(line):
                pending_skip = True                 # case c
            elif net_p > 0:
                paren_depth = net_p                 # case d: multiline call
            # else case b — balanced or bare expression
        else:
            patched.append(line)

    return patched


# ── Dangling if-let / guard chain cleanup ──────────────────────────────────────

# Recognise if-let / guard chain openers and continuations.
_CHAIN_OPENER_RE = re.compile(r"^\s*(if|guard)\s+(let|var)\s")
_CHAIN_CONT_RE   = re.compile(r"^\s{2,}(let|var)\s")  # indented-only let/var

def _remove_dangling_chains(patched_lines):
    """
    After primary patching: find any live if-let/guard chain line that ends with
    a trailing ',' but whose next LIVE line is NOT a chain continuation.  This
    happens when cascade (or primary) removes every subsequent binding, leaving
    the opener dangling with no body or else clause — a Swift syntax error.

    Marks those lines // XCODE26 CHAIN and iterates until stable.
    """
    result = list(patched_lines)
    changed = True
    while changed:
        changed = False
        live = [(i, result[i]) for i in range(len(result))
                if not result[i].startswith("// XCODE26")]
        for pos, (i, line) in enumerate(live):
            stripped = line.rstrip()
            if not stripped.endswith(","):
                continue
            if not (_CHAIN_OPENER_RE.match(stripped) or _CHAIN_CONT_RE.match(stripped)):
                continue
            # Is the next live line a chain continuation?
            if pos + 1 < len(live):
                next_s = live[pos + 1][1].rstrip()
                if _CHAIN_CONT_RE.match(next_s):
                    continue   # next is another binding — chain still valid
            # Dangling — remove this opener/continuation
            result[i] = "// XCODE26 CHAIN " + stripped + "\n"
            changed = True
            break   # live list is stale; restart the while loop

    return result


# ── Cascade pass ───────────────────────────────────────────────────────────────

# Extract a bound variable name from a primary or CASCADE (non-BODY) XCODE26 line.
# Deliberately excludes:
#   // XCODE26 BODY  — variables inside removed blocks (e.g. makeDiscounts body)
#   // XCODE26 CASCADE BODY — body of a cascade-removed block
# This prevents spurious contamination of cascade vars.
_BIND_RE = re.compile(
    r"^// XCODE26 (?!BODY|CASCADE BODY).*?\b(?:let|var)\s+(\w+)\s*="
)


def _cascade_pass(patched_lines):
    """
    One cascade pass.  Seeds cascade vars from _CASCADE_SEEDS, then extracts
    additional vars from PRIMARY and CASCADE (non-BODY) XCODE26 lines via
    _BIND_RE.  BODY lines are excluded so function-body locals cannot become
    cascade vars.

    Then comments out every LIVE line that references any cascade var as a
    whole word (\\bVAR\\b), using block-tracking for non-declaration openers.
    """
    cascade_vars = set(_CASCADE_SEEDS)

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
                # Block-opening non-declaration: cascade with block body
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
                        result.append("// XCODE26 CASCADE BODY " + body.rstrip() + "\n")
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
    """Up to 2 cascade passes; stops early when nothing new is removed."""
    total = 0
    for _ in range(2):
        patched_lines, n_new = _cascade_pass(patched_lines)
        total += n_new
        if n_new == 0:
            break
    if total:
        print(f"  cascade: {total} lines across passes")
    return patched_lines


def _debug_cascade_vars(patched_lines):
    """Print cascade vars that would be extracted, for diagnostic purposes."""
    cascade_vars = set(_CASCADE_SEEDS)
    for line in patched_lines:
        if not line.startswith("// XCODE26"):
            continue
        m = _BIND_RE.match(line)
        if m:
            v = m.group(1)
            if v not in _SKIP_CASCADE and len(v) >= 5:
                cascade_vars.add(v)
    extracted = cascade_vars - _CASCADE_SEEDS
    print(f"  cascade seeds    : {sorted(_CASCADE_SEEDS)}")
    print(f"  cascade extracted: {sorted(extracted)}")
    print(f"  cascade total    : {sorted(cascade_vars)}")


# ── Main patch pipeline ────────────────────────────────────────────────────────

def patch_file(path, removed_patterns, cascade=False):
    with open(path) as f:
        lines = f.readlines()

    patched = _patch_lines(lines, removed_patterns)

    if cascade:
        # Remove dangling if-let/guard chain openers BEFORE cascade so the
        # cascade pass sees a structurally valid (commented) chain, not a
        # half-removed one with a trailing comma and no continuation.
        patched = _remove_dangling_chains(patched)
        patched = _patch_cascade(patched)

    os.chmod(path, 0o644)
    with open(path, "w") as f:
        f.writelines(patched)

    n = sum(1 for l in patched if l.startswith("// XCODE26"))
    return n


def patch_types(path):
    """
    Make commitmentRenewalBillingPlanType optional (= nil default) so struct
    initialisers that omit it still compile.
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

with open(bridge) as _f:
    _bridge_lines = _f.readlines()

_primary_patched = _patch_lines(_bridge_lines, REMOVED_STOREKIT + REMOVED_BRIDGE_FUNCS)
_debug_cascade_vars(_primary_patched)

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
