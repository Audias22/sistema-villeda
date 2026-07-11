import { useFonts as useExpoFonts } from 'expo-font'
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'

export default function useFonts() {
  const [fontsLoaded, fontError] = useExpoFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  })

  return { fontsLoaded, fontError }
}
