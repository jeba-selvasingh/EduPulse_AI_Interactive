import { BRAND_PRIMARY } from '@/src/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TabId = 'home' | 'papers' | 'campus' | 'principal';

type Tab = {
  id: TabId;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'papers', label: 'Papers', icon: '📄' },
  { id: 'campus', label: 'Campus', icon: '🎯' },
  { id: 'principal', label: 'Principal', icon: '🏛' },
];

type Props = {
  activeTab?: TabId;
  onTabPress?: (tab: TabId) => void;
};

export function HomeTabBar({ activeTab = 'home', onTabPress }: Props) {
  return (
    <View style={styles.tabbar}>
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress?.(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
    backgroundColor: '#FFF',
  },
  tab: {
    alignItems: 'center',
    minWidth: 56,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#AAA',
  },
  tabLabelActive: {
    color: BRAND_PRIMARY,
    fontWeight: '600',
  },
});
