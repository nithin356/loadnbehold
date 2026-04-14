import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const c = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing['3xl'],
        }}
      >
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 340,
          }}
        >
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: '700',
              color: c.textPrimary,
              marginBottom: spacing.sm,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: c.textSecondary,
              lineHeight: 22,
              marginBottom: spacing.xl,
            }}
          >
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                height: 46,
                borderRadius: radius.lg,
                backgroundColor: c.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textSecondary }}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                height: 46,
                borderRadius: radius.lg,
                backgroundColor: destructive ? c.error : c.brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
