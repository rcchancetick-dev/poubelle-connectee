import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DashboardScreen from './src/screens/DashboardScreen';
import AdminScreen from './src/screens/AdminScreen';
import HistoriqueScreen from './src/screens/HistoriqueScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const Tab = createBottomTabNavigator();

/**
 * NavigationInterne
 * Separee de App() pour pouvoir consommer useTheme() (qui exige d'etre
 * a l'interieur de ThemeProvider) et adapter a la fois la barre de
 * navigation React Navigation ET la barre d'onglets au mode actif.
 */
function NavigationInterne() {
  const { couleurs, modeActif } = useTheme();

  const themeNavigation = {
    ...(modeActif === 'sombre' ? DarkTheme : DefaultTheme),
    colors: {
      ...(modeActif === 'sombre' ? DarkTheme.colors : DefaultTheme.colors),
      background: couleurs.fond,
      card: couleurs.carte,
      text: couleurs.texte,
      border: couleurs.bordure,
      primary: couleurs.bleu,
    },
  };

  return (
    <NavigationContainer theme={themeNavigation}>
      <StatusBar style={modeActif === 'sombre' ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: couleurs.bleu,
          tabBarInactiveTintColor: couleurs.texteAtt,
          tabBarStyle: {
            borderTopColor: couleurs.bordure,
            backgroundColor: couleurs.carte,
            height: 58,
            paddingBottom: 8,
            paddingTop: 6,
          },
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
  );
}

/**
 * App.js
 * Point d'entree : enveloppe toute l'application dans ThemeProvider, qui
 * gere le mode clair/sombre (systeme par defaut, bascule manuelle possible
 * depuis l'ecran Administration -> voir SelecteurTheme.js).
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationInterne />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
