import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border, height: 86, paddingBottom: 28, paddingTop: 8 },
        tabBarLabelStyle: { fontWeight: '700' }
      }}
    >
      <Tab.Screen name="Scannen" component={ScannerScreen} />
      <Tab.Screen name="Winkelwagen" component={CartStack} />
      <Tab.Screen name="Pakketten" component={PackagesScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { user } = useAuth();
  return <NavigationContainer>{user ? <AppTabs /> : <LoginScreen />}</NavigationContainer>;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Root />
    </AuthProvider>
  );
}
