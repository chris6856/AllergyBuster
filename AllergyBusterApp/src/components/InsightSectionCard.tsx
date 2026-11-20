import React, {useState} from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {EVIDENCE_LABELS, Finding, FindingLevel, InsightSection} from '../analysis/types';

const LEVEL_COLORS: Record<FindingLevel, {fg: string; bg: string}> = {
  alert: {fg: colors.danger, bg: '#FDECEA'},
  caution: {fg: colors.warning, bg: colors.warningLight},
  info: {fg: colors.textSecondary, bg: colors.background},
  ok: {fg: colors.primary, bg: '#E8F5E9'},
};

const LEVEL_ICON: Record<FindingLevel, string> = {alert: '⚠', caution: '!', info: 'i', ok: '✓'};

function FindingRow({f}: {f: Finding}) {
  const c = LEVEL_COLORS[f.level];
  return (
    <View style={styles.finding}>
      <View style={[styles.dot, {backgroundColor: c.fg}]}>
        <Text style={styles.dotText}>{LEVEL_ICON[f.level]}</Text>
      </View>
      <View style={styles.findingBody}>
        <Text style={styles.findingTitle}>{f.title}</Text>
        {f.detail ? <Text style={styles.findingDetail}>{f.detail}</Text> : null}
        {f.source ? (
          f.source.url ? (
            <Text
              style={styles.sourceLink}
              accessibilityRole="link"
              onPress={() => Linking.openURL(f.source!.url!).catch(() => {})}>
              Source: {f.source.name}
              {f.source.date ? ` (${f.source.date.slice(0, 10)})` : ''} ↗
            </Text>
          ) : (
            <Text style={styles.source}>Source: {f.source.name}</Text>
          )
        ) : null}
      </View>
    </View>
  );
}

/**
 * One analysis section. Collapsed: title, evidence status, one-line summary.
 * Expanded: every finding with its source. `children` replaces the generic
 * finding list (the Allergy Check uses the 1.x allergen components).
 */
export function InsightSectionCard({
  section,
  initiallyOpen = false,
  children,
}: {
  section: InsightSection;
  initiallyOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const c = LEVEL_COLORS[section.level];
  const expandable = !!children || section.findings.length > 0;

  return (
    <View style={[styles.card, {borderLeftColor: c.fg}]}>
      <TouchableOpacity
        onPress={() => expandable && setOpen(o => !o)}
        activeOpacity={expandable ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        accessibilityLabel={`${section.title}. ${EVIDENCE_LABELS[section.status]}. ${section.summary}`}>
        <View style={styles.header}>
          <Text style={styles.title}>{section.title}</Text>
          <View style={[styles.badge, {backgroundColor: c.bg}]}>
            <Text style={[styles.badgeText, {color: c.fg}]}>{EVIDENCE_LABELS[section.status]}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          {/* A custom body (Allergy Check) restates the summary, so hide it when open. */}
          <Text style={styles.summary} numberOfLines={open ? undefined : 2}>
            {open && children ? '' : section.summary}
          </Text>
          {expandable ? <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text> : null}
        </View>
      </TouchableOpacity>
      {open ? (
        <View style={styles.body}>
          {children ?? section.findings.map(f => <FindingRow key={f.id} f={f} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontSize: fontSizes.md, fontWeight: '800', color: colors.textPrimary, flexShrink: 1},
  badge: {borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, marginLeft: spacing.sm},
  badgeText: {fontSize: fontSizes.xs, fontWeight: '700'},
  summaryRow: {flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs},
  summary: {flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18},
  chevron: {fontSize: fontSizes.md, color: colors.textDisabled, marginLeft: spacing.sm},
  body: {marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm},
  finding: {flexDirection: 'row', marginBottom: spacing.sm},
  dot: {width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, marginTop: 1},
  dotText: {color: colors.white, fontSize: 11, fontWeight: '800'},
  findingBody: {flex: 1},
  findingTitle: {fontSize: fontSizes.sm, fontWeight: '700', color: colors.textPrimary},
  findingDetail: {fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18, marginTop: 2},
  source: {fontSize: fontSizes.xs, color: colors.textDisabled, marginTop: 2},
  sourceLink: {fontSize: fontSizes.xs, color: colors.primary, marginTop: 2, fontWeight: '600'},
});
