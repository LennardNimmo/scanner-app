import 'react-native-gesture-handler';
import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { CartScreen } from './src/screens/CartScreen';
import { DealScreen } from './src/screens/DealScreen';
import { PackagesScreen } from './src/screens/PackagesScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { BrandLogo } from './src/components/BrandLogo';
import { colors, radius, shadow } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.mint,
    card: colors.white,
    text: colors.text,
    border: colors.border
  }
};

const tabIcons: Record<string, string> = {
  Scannen: '▣',
  Winkelwagen: '◔',
  Pakketten: '⌁',
  Account: '•'
};

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WinkelwagenHome" component={CartScreen} />
      <Stack.Screen name="Beste deal" component={DealScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 16,
          height: 74,
          borderRadius: radius.xl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.white,
          paddingBottom: 12,
          paddingTop: 10,
          ...shadow.card
        },
        tabBarLabelStyle: { fontWeight: '900', fontSize: 11 },
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              width: 28,
              height: 24,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? colors.mintSoft : 'transparent'
            }}
          >
            <Text style={{ color, fontSize: 16, fontWeight: '900' }}>{tabIcons[route.name] || '•'}</Text>
          </View>
        )
      })}
    >
      <Tab.Screen name="Scannen" component={ScannerScreen} />
      <Tab.Screen name="Winkelwagen" component={CartStack} />
      <Tab.Screen name="Pakketten" component={PackagesScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <BrandLogo />
      <Text style={{ marginTop: 16, color: colors.muted, fontWeight: '700' }}>SlimBesteld laden...</Text>
    </View>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <NavigationContainer theme={navTheme}>{user ? <AppTabs /> : <LoginScreen />}</NavigationContainer>;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Root />
    </AuthProvider>
  );
}
