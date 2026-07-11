import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import useFonts from './src/hooks/useFonts';
import { colors } from './src/theme/colors';
import { fontFamily, fontSize } from './src/theme/typography';

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
        <View style={styles.container}>
          <Text style={styles.title}>Sistema Villeda - App móvil</Text>
          <StatusBar style="auto" />
        </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h1,
    color: colors.navy,
    textAlign: 'center',
  },
});
