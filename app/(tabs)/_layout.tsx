import React from 'react';
import { TopTabs } from 'expo-router/js-top-tabs';
import { ArcTabs } from '@/components/ArcTabs';
import { colors } from '@/theme';

/** What each page is called on the wheel. */
const LABELS: Record<string, string> = {
  index: 'Главная',
  deadlines: 'Дедлайны',
  tasks: 'Таски',
  events: 'Ивенты',
  profile: 'Профиль',
};

export default function TabsLayout() {
  return (
    <TopTabs
      // Rendered after the scenes so it sits above them; the rail positions
      // itself at the top of the screen regardless.
      tabBarPosition="bottom"
      tabBar={(props: any) => <ArcTabs {...props} labels={LABELS} />}
      screenOptions={{
        // Neighbours are rendered ahead of time — a swipe must never reveal a
        // blank page — but the far tabs stay unmounted until you reach them.
        lazy: true,
        lazyPreloadDistance: 1,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <TopTabs.Screen name="index" />
      <TopTabs.Screen name="deadlines" />
      <TopTabs.Screen name="tasks" />
      <TopTabs.Screen name="events" />
      <TopTabs.Screen name="profile" />
    </TopTabs>
  );
}
