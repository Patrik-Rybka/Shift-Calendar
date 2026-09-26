import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Check, Sparkles, CloudCheck } from 'lucide-react-native';

interface SuccessConfettiModalProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  subtitle?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
];

interface Particle {
  id: number;
  color: string;
  size: number;
  isCircle: boolean;
  targetX: number;
  targetY: number;
  rotations: number;
}

function generateParticles(count: number = 42): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const distance = 90 + Math.random() * 150;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance + (Math.random() * 40 - 20);

    particles.push({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 7,
      isCircle: Math.random() > 0.5,
      targetX,
      targetY,
      rotations: Math.floor(Math.random() * 4) + 2,
    });
  }
  return particles;
}

export default function SuccessConfettiModal({
  visible,
  onDismiss,
  title = 'Směny uloženy!',
  subtitle = 'Vše je úspěšně synchronizováno v cloudu',
}: SuccessConfettiModalProps) {
  const isDark = useColorScheme() === 'dark';

  const animProgress = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const particles = useRef<Particle[]>(generateParticles(44)).current;

  useEffect(() => {
    if (visible) {
      animProgress.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);

      // 1. Spring in the card
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // 2. Explode confetti
        Animated.timing(animProgress, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 2.6s
      const timer = setTimeout(() => {
        handleDismiss();
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const ui = {
    cardBg: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    successAccent: '#10B981',
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <View style={styles.centerAnchor}>
          {/* Confetti Particles Bursting From Center */}
          {particles.map((p) => {
            const translateX = animProgress.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [0, p.targetX, p.targetX * 1.3],
            });

            const translateY = animProgress.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [0, p.targetY, p.targetY + 80], // gravity drop
            });

            const scale = animProgress.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 1.3, 1, 0.4],
            });

            const opacity = animProgress.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 1, 1, 0],
            });

            const rotate = animProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${p.rotations * 360}deg`],
            });

            return (
              <Animated.View
                key={p.id}
                style={[
                  styles.particle,
                  {
                    backgroundColor: p.color,
                    width: p.size,
                    height: p.isCircle ? p.size : p.size * 1.5,
                    borderRadius: p.isCircle ? p.size / 2 : 2,
                    transform: [{ translateX }, { translateY }, { rotate }, { scale }],
                    opacity,
                  },
                ]}
              />
            );
          })}

          {/* Celebratory Center Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: ui.cardBg,
                borderColor: ui.border,
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Glowing Icon Circle */}
            <View style={styles.iconRingOuter}>
              <View style={[styles.iconRingInner, { backgroundColor: `${ui.successAccent}25` }]}>
                <View style={[styles.iconCircle, { backgroundColor: ui.successAccent }]}>
                  <Check size={32} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>
            </View>

            {/* Title & Subtitle */}
            <View style={styles.textBox}>
              <View style={styles.titleRow}>
                <Sparkles size={18} color="#F59E0B" />
                <Text style={[styles.title, { color: ui.text }]}>{title}</Text>
                <Sparkles size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.subtitle, { color: ui.textMuted }]}>{subtitle}</Text>
            </View>

            {/* Checkmark Tag */}
            <View style={[styles.doneTag, { backgroundColor: isDark ? '#161F33' : '#F1F5F9' }]}>
              <Text style={[styles.doneTagText, { color: ui.successAccent }]}>✓ Uloženo</Text>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
  },
  particle: {
    position: 'absolute',
    zIndex: 10,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 330),
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 16,
    zIndex: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  iconRingOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconRingInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  textBox: {
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  doneTag: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  doneTagText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
