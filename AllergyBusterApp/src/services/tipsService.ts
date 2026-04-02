import {TIPS_PROXY_URL} from '../constants/config';
import {httpClient} from './http';
import {DailyTip} from '../types/tip';

/**
 * Curated static tips — used when the AI proxy is not configured or
 * when the network request fails. Picked deterministically by date so
 * the same tip is shown all day even across app restarts.
 */
const STATIC_TIPS: string[] = [
  'Always read labels every time you buy a product — manufacturers can change ingredients and allergen warnings without notice.',
  '"May contain" warnings are voluntary in the US. If you have a severe allergy, treat these products as if they definitely contain the allergen.',
  'Cross-contact can happen in shared kitchens. When eating out, ask specifically whether the kitchen uses separate utensils and cooking surfaces.',
  'The FDA requires the top 9 allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame) to be listed in plain language on packaged food labels.',
  'Natural flavors and spices can hide allergens. If a label is unclear, call the manufacturer before eating the product.',
  'When travelling internationally, allergy labelling laws differ. Research the local requirements and consider carrying translated allergy cards.',
  'Antihistamines treat symptoms but do not stop an anaphylactic reaction. Always carry your epinephrine auto-injector if prescribed.',
  'Restaurant staff may not always know every ingredient. Ask to speak with a manager or chef, and consider checking the restaurant\'s published allergen menu online.',
  'Sesame became the 9th major allergen in the US in January 2023. Check labels on bread, hummus, tahini, and Asian sauces.',
  'Tree nut allergy does not automatically mean you are allergic to all tree nuts, but cross-contamination in processing plants is common. Consult your allergist.',
  'Milk allergy is different from lactose intolerance. An allergy triggers an immune response; intolerance is a digestive issue. Both require different management strategies.',
  'Peanuts are legumes, not true nuts, but peanut allergy is one of the most common causes of severe anaphylaxis. Always confirm peanut-free status with food providers.',
  'Hidden egg sources include albumin, globulin, lysozyme, mayonnaise, and some vaccines. Ask your doctor about egg-containing medications.',
  'Wheat-free does not mean gluten-free. Barley and rye also contain gluten but are not wheat. Look for a certified gluten-free label if you have coeliac disease.',
];

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getStaticTip(date: string): DailyTip {
  // Strip dashes and use last 4 digits mod array length for a stable daily rotation
  const seed = parseInt(date.replace(/-/g, '').slice(-4), 10);
  const index = seed % STATIC_TIPS.length;
  return {text: STATIC_TIPS[index], date};
}

export async function fetchDailyTip(): Promise<DailyTip> {
  const date = getTodayString();

  if (!TIPS_PROXY_URL) {
    return getStaticTip(date);
  }

  try {
    const response = await httpClient.get<DailyTip>(TIPS_PROXY_URL, {
      params: {date},
      timeout: 8000,
    });
    return response.data;
  } catch {
    // Network or proxy error — fall back to static tip so the app is always useful
    return getStaticTip(date);
  }
}
