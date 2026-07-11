import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import useFonts from './src/hooks/useFonts';
import { colors } from './src/theme/colors';
import { fontSize } from './src/theme/typography';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const { fontsLoaded, fontError } = useFonts();

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
});
