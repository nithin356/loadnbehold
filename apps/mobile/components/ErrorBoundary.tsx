import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0F0F1A', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="warning-outline" size={36} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            The app ran into an unexpected error. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 24, width: '100%' }}>
              <Text style={{ fontSize: 12, color: '#EF4444', fontFamily: 'monospace' }} numberOfLines={5}>
                {this.state.error.message}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={this.handleReset}
            style={{
              backgroundColor: '#6C5CE7',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 32,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
