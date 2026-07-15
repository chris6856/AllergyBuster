#!/usr/bin/env python3
"""
Patch StoreKitTypesBridge.swift in the openiap npm package to remove references
to StoreKit APIs that existed in iOS 26 beta but were removed from the final
Xcode 26.4 SDK. AllergyBuster only uses non-consumable IAP so these
subscription-only code paths are never executed at runtime.

Removed APIs:
  Product.SubscriptionInfo.PricingTerms
  Product.SubscriptionInfo.BillingPlanType
  Product.PurchaseOption.billingPlanType
  Transaction.billingPlanType / commitmentInfo
  Product.SubscriptionInfo.RenewalInfo.commitmentInfo / renewalBillingPlanType
"""
import sys
import os

BRIDGE_REL = "AllergyBusterApp/node_modules/openiap/packages/apple/Sources/Helpers/StoreKitTypesBridge.swift"

path = os.path.join(os.getcwd(), BRIDGE_REL)

if not os.path.isfile(path):
    print(f"WARNING: not found at {path}")
    print("Searching...")
    for root, dirs, files in os.walk("AllergyBusterApp/node_modules"):
        for name in files:
            if name == "StoreKitTypesBridge.swift":
                print(f"  Found: {os.path.join(root, name)}")
    sys.exit(0)

REMOVED = [
    ".billingPlanType",
    ".commitmentInfo",
    ".renewalBillingPlanType",
    ".pricingTerms",
    "PricingTerms",
    "BillingPlanType",
    "SubscriptionBillingPlanTypeIOS",
]

with open(path) as f:
    lines = f.readlines()

patched = []
skip_depth = 0

for line in lines:
    if skip_depth > 0:
        skip_depth += line.count("{") - line.count("}")
        patched.append("// XCODE26 " + line.rstrip() + "\n")
        continue

    if any(r in line for r in REMOVED):
        net = line.count("{") - line.count("}")
        if net > 0:
            skip_depth = net
        patched.append("// XCODE26 " + line.rstrip() + "\n")
    else:
        patched.append(line)

with open(path, "w") as f:
    f.writelines(patched)

n = sum(1 for l in patched if l.startswith("// XCODE26"))
print(f"Patched {n} lines in StoreKitTypesBridge.swift")
