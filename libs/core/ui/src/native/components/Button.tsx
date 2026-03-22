import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { TouchableOpacityProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'icon';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const textColors: Record<Variant, string> = {
  primary: '#ffffff',
  secondary: '#0f172a',
  ghost: '#475569',
  destructive: '#ffffff',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : typeof children === 'string' ? (
        <Text style={[styles.text, { color: textColors[variant] }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 6,
  },
  primary: { backgroundColor: '#0f172a' },
  secondary: { backgroundColor: '#f1f5f9' },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: '#ef4444' },
  sm: { paddingHorizontal: 12, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 9 },
  icon: { width: 32, height: 32 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 14, fontWeight: '500' },
});
