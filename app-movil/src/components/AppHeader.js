import { Image, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { fontFamily, fontSize } from '../theme/typography'

export default function AppHeader({ title }) {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo-villeda.jpg')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h3,
    color: colors.navy,
  },
})
