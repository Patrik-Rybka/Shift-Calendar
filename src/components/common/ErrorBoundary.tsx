import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { logger } from '@/services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('CRASH', error.message, error.stack || errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleResetStorage = async () => {
    try {
      await AsyncStorage.multiRemove([
        'family-shift-auth-storage',
        'family-shift-data-storage',
        'family-shift-settings-storage',
      ]);
      this.handleRestart();
    } catch (e) {
      console.error('Failed to clear AsyncStorage:', e);
      this.handleRestart();
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Neznámá systémová chyba';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <AlertTriangle size={36} color="#EF4444" strokeWidth={2.2} />
              </View>

              <Text style={styles.title}>Kalendář narazil na problém</Text>
              <Text style={styles.description}>
                Došlo k neočekávané chybě při spuštění. Vaše uložená data na serveru zůstávají v bezpečí.
              </Text>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={this.handleRestart}
                  activeOpacity={0.85}
                >
                  <RefreshCw size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Zkusit znovu spustit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={this.handleResetStorage}
                  activeOpacity={0.85}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={styles.secondaryButtonText}>Vyčistit mezipaměť telefonu</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.detailsToggle}
                onPress={this.toggleDetails}
                activeOpacity={0.7}
              >
                <Text style={styles.detailsToggleText}>
                  {this.state.showDetails ? 'Skrýt technické detaily' : 'Zobrazit technické detaily pro správce'}
                </Text>
                {this.state.showDetails ? (
                  <ChevronUp size={16} color="#94A3B8" />
                ) : (
                  <ChevronDown size={16} color="#94A3B8" />
                )}
              </TouchableOpacity>

              {this.state.showDetails && (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsErrorTitle}>Chyba:</Text>
                  <Text style={styles.detailsErrorText}>{errorMessage}</Text>
                  {stack ? (
                    <>
                      <Text style={[styles.detailsErrorTitle, { marginTop: 10 }]}>Zásobník volání:</Text>
                      <Text style={styles.detailsStackText}>{stack}</Text>
                    </>
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '700',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#090D16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginTop: 12,
  },
  detailsErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailsErrorText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  detailsStackText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
