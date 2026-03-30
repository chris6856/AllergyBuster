## Problem

People who have allergies have to rely on other people to have knowledge about allergies and keep them safe when shopping, eating out and different outings where there is food. Depending on their specific allergy, it can be a matter of life or death depending on the reaction they get.

## Solution

Build a one-tap mobile app (iOS & Android) that allows a person to scan, take a picture, or enter search criteria to retrieve allergy information quickly and reliably.

"One operation" refers to the searching features — a single action returns results with no extra steps.

## Target Users

Anyone managing allergies — individuals, parents managing a child's allergies, or caregivers.

## Allergy Coverage

All possible allergens are displayed for any given product. No user-specific filtering.

## Features

* Scan a product barcode and see allergy information on that product
* Take a photo of a product label and see allergy information for that label
* Text search screen with a segmented control to switch between Products and Restaurants modes
* Products mode: search by product name, ingredient, or brand
* Restaurants mode: search by restaurant name
* If barcode or photo scan returns no results, display "No results found" and offer an empty manual text search as the next step
* Show daily allergy tips on app open (AI-generated)
* Display user testimonials in the app

## Data Sources

* **Product data**: Open Food Facts (free, open source) as primary source; supplement with a paid API (e.g. Edamam, Nutritionix, or Spoonacular) if coverage gaps exist
* **Restaurant data**: OpenMenu (free, open source) as primary source; Yelp Fusion (paid) as fallback for broader coverage
* **Daily tips**: AI-generated (provider TBD — e.g. Claude, OpenAI)
* If no results are found from any source, display "No results found"
* If no network connection is available, display a "No network found" message

## Legal & Medical

* Legal disclaimer shown on first app launch only (with user acceptance)
* Clearly states this is non-medical advice and users should consult their doctor

## Platform

* iOS and Android
* Framework: React Native

## Out of Scope

* Restaurant search by GPS/location
* In-app sharing
* User allergen profiles / personalized filtering
* Saving user-entered product data
* Offline product database caching
