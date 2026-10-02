import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomNavBar from '../components/BottomNavBar';
import HomeScreen from '../screens/home/HomeScreen';
import BillsScreen from '../screens/bills/BillsScreen';
import AnnouncementsScreen from '../screens/announcements/AnnouncementsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SosScreen from '../screens/sos/SosScreen';

const Tab = createBottomTabNavigator();

function PrimeTabBar({ state, navigation }) {
  const activeRoute = state.routes[state.index]?.name;

  const onTabPress = name => {
    const route = state.routes.find(item => item.name === name);
    if (!route) return;

    const focused = activeRoute === name;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onTabLongPress = name => {
    const route = state.routes.find(item => item.name === name);
    if (!route) return;
    navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  return (
    <BottomNavBar
      activeRoute={activeRoute}
      onTabPress={onTabPress}
      onTabLongPress={onTabLongPress}
    />
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: true,
      }}
      tabBar={PrimeTabBar}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bills" component={BillsScreen} />
      <Tab.Screen name="SOS" component={SosScreen} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
