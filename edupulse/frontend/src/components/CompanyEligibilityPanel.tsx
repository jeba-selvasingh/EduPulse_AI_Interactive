import {
  eligibleCountStyle,
  fetchEligibilityTracker,
  registrationPillStyle,
  tierFilterLabel,
  type CompanyEligibility,
  type TierFilter,
} from '@/src/lib/campus-api';
import { BRAND_PRIMARY } from '@/src/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const TIER_FILTERS: TierFilter[] = ['all', 'dream', 'core_it', 'mass'];

function CompanyCard({
  company,
  batchStrength,
}: {
  company: CompanyEligibility;
  batchStrength: number;
}) {
  const eligiblePill = eligibleCountStyle(company.eligibleCount, batchStrength);
  const registrationPill = registrationPillStyle(company.registrationStatus);
  const isLowEligible = company.eligibleCount / batchStrength < 0.35;

  return (
    <View style={[styles.card, isLowEligible && styles.cardAlert]}>
      <View style={styles.row}>
        <Text style={styles.companyName}>
          {company.name} · {company.packageLabel}
        </Text>
        <View style={[styles.pill, { backgroundColor: eligiblePill.backgroundColor }]}>
          <Text style={[styles.pillText, { color: eligiblePill.color }]}>
            {company.eligibleCount} eligible
          </Text>
        </View>
      </View>
      <Text style={styles.rules}>{company.rulesSummary}</Text>
      <View style={styles.row}>
        <Text style={styles.driveDate}>Drive: {company.driveDateLabel}</Text>
        <View style={[styles.pill, { backgroundColor: registrationPill.backgroundColor }]}>
          <Text style={[styles.pillText, { color: registrationPill.color }]}>
            {company.registrationStatus === 'registered' && company.registeredCount
              ? `Registered: ${company.registeredCount}`
              : registrationPill.label}
          </Text>
        </View>
      </View>
      {isLowEligible ? (
        <Text style={styles.notEligibleNote}>{company.notEligibleCount} not eligible</Text>
      ) : null}
    </View>
  );
}

export function CompanyEligibilityPanel() {
  const [tier, setTier] = useState<TierFilter>('all');

  const query = useQuery({
    queryKey: ['company-eligibility', tier],
    queryFn: () => fetchEligibilityTracker(tier),
  });

  if (query.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading company eligibility…</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {query.error instanceof Error ? query.error.message : 'Unable to load eligibility tracker'}
        </Text>
      </View>
    );
  }

  const view = query.data;
  const wiproInsight = view.nearMissInsights.find((insight) => insight.companyId === 'wipro-turbo');

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {TIER_FILTERS.map((filter) => {
          const active = tier === filter;
          return (
            <Pressable
              key={filter}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setTier(filter)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {tierFilterLabel(filter)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {view.companies.map((company) => (
        <CompanyCard key={company.companyId} company={company} batchStrength={view.batchStrength} />
      ))}

      {wiproInsight ? (
        <View style={styles.insightCard}>
          <Text style={styles.insightText}>
            <Text style={styles.insightBold}>{wiproInsight.nearMissCount} students</Text>{' '}
            are {wiproInsight.cgpaGapLabel} away from unlocking {wiproInsight.companyName} — one
            semester improvement suffices.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 12, color: '#888' },
  errorText: { fontSize: 12, color: '#B3261E', textAlign: 'center' },
  filterRow: { marginBottom: 10, flexGrow: 0 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEE',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#EEEDFE',
  },
  filterText: { fontSize: 11, color: '#666', fontWeight: '600' },
  filterTextActive: { color: BRAND_PRIMARY },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8EE',
  },
  cardAlert: {
    borderLeftWidth: 3,
    borderLeftColor: '#E8A598',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  companyName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  rules: { fontSize: 11, color: '#666', marginTop: 4, lineHeight: 16 },
  driveDate: { fontSize: 10, color: '#888', marginTop: 6 },
  notEligibleNote: { fontSize: 10, color: '#9B1C1C', marginTop: 4, fontWeight: '600' },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: { fontSize: 10, fontWeight: '700' },
  insightCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FAC775',
  },
  insightText: { fontSize: 11, color: '#4A5568', lineHeight: 16 },
  insightBold: { fontWeight: '700', color: '#1A1A2E' },
});
