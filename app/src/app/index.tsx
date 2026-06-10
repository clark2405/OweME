import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>OweMe 📦</Text>
        <Text style={styles.tagline}>The app that gets your stuff back.</Text>
        <Text style={styles.emptyState}>
          Nobody owes you anything. Either you&apos;re very organized or very
          stingy 😌
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tagline: {
    fontSize: 16,
    color: '#6B6B6B',
  },
  emptyState: {
    marginTop: 24,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#8A8A8A',
  },
});
