import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DashboardScreen from './src/screens/DashboardScreen';
import AdminScreen from './src/screens/AdminScreen';
import HistoriqueScreen from './src/screens/HistoriqueScreen';
import { couleurs } from './src/theme/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: couleurs.bleu,
            tabBarInactiveTintColor: couleurs.texteAtt,
            tabBarStyle: { borderTopColor: couleurs.bordure, height: 58, paddingBottom: 8, paddingTop: 6 },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarIcon: ({ color, size }) => {
              const icones = { 'Tableau de bord': 'home', Historique: 'time', Administration: 'shield-checkmark' };
              return <Ionicons name={icones[route.name] || 'ellipse'} size={size - 2} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Tableau de bord" component={DashboardScreen} />
          <Tab.Screen name="Historique" component={HistoriqueScreen} />
          <Tab.Screen name="Administration" component={AdminScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
