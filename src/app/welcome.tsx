import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Users, WifiOff, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const features = [
    {
      icon: Calendar,
      iconColor: '#38BDF8', // Sky
      title: 'Bleskové razítkování',
      desc: 'Žádné zdlouhavé formuláře. Dole jednoduše ťuknete na svou směnu a jedním dotykem ji orazítkujete do kalendáře.',
    },
    {
      icon: Users,
      iconColor: '#34D399', // Emerald
      title: 'Propojená rodina',
      desc: 'Každý má aplikaci ve svém telefonu. Přes jednoduchý rodinný kód vidíte, kdo má zrovna volno, ranní nebo noční.',
    },
    {
      icon: WifiOff,
      iconColor: '#FBBF24', // Amber
      title: 'Funguje i bez signálu',
      desc: 'Ve fabrice, v lese i v suterénu. Směny máte v mobilu okamžitě dostupné i zcela offline.',
    },
    {
      icon: ShieldCheck,
      iconColor: '#818CF8', // Indigo
      title: 'Bezpečné a soukromé',
      desc: 'Žádné reklamy ani sledování. Kalendář je určen výhradně pro vás a vaši rodinu.',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: `${theme.tint}20` }]}>
            <Text style={[styles.badgeText, { color: theme.tint }]}>Rodinný kalendář směn</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            Plánování směn{'\n'}snadno a přehledně
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Navrženo pro rychlé a bezstarostné zapisování pracovních směn celé rodiny.
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.cardsContainer}>
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <View
                key={index}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${item.iconColor}15` },
                  ]}
                >
                  <Icon size={28} color={item.iconColor} />
                </View>
                <View style={styles.cardTextContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA Button */}
      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.tint }]}
          activeOpacity={0.85}
          onPress={() => router.push('/auth' as any)}
        >
          <Text style={styles.primaryButtonText}>Začít / Pokračovat</Text>
          <ArrowRight size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  cardsContainer: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
