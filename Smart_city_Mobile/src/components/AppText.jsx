import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
} from 'react-native';
import {
  containsMyanmarText,
  getMyanmarTextStyle,
} from '../theme/typography';

function textFromChildren(children) {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return '';
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(textFromChildren).join('');
  }
  if (React.isValidElement(children)) {
    return textFromChildren(children.props?.children);
  }
  return '';
}

function inferVariant(style, requestedVariant) {
  if (requestedVariant) return requestedVariant;
  const flattened = StyleSheet.flatten(style) || {};
  const weight = flattened.fontWeight;
  if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) {
    return 'bold';
  }
  if (weight === 'lighter' || (Number(weight) > 0 && Number(weight) <= 300)) {
    return 'thin';
  }
  return 'regular';
}

function myanmarLayoutStyle(value, style, variant) {
  if (!containsMyanmarText(value)) return null;
  const flattened = StyleSheet.flatten(style) || {};
  const fontSize = Number(flattened.fontSize) || 14;
  const currentLineHeight = Number(flattened.lineHeight) || 0;

  return {
    ...getMyanmarTextStyle(value, inferVariant(style, variant)),
    lineHeight: Math.max(currentLineHeight, Math.ceil(fontSize * 1.55)),
    includeFontPadding: true,
  };
}

export const AppText = forwardRef(function AppText(
  { children, style, myanmarVariant, ...props },
  ref,
) {
  const value = textFromChildren(children);
  return (
    <NativeText
      ref={ref}
      {...props}
      style={[style, myanmarLayoutStyle(value, style, myanmarVariant)]}
    >
      {children}
    </NativeText>
  );
});

export const AppTextInput = forwardRef(function AppTextInput(
  {
    style,
    value,
    defaultValue,
    placeholder,
    myanmarVariant,
    ...props
  },
  ref,
) {
  const visibleValue = value ?? defaultValue ?? placeholder ?? '';
  return (
    <NativeTextInput
      ref={ref}
      {...props}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      style={[
        style,
        myanmarLayoutStyle(visibleValue, style, myanmarVariant),
      ]}
    />
  );
});

export { textFromChildren };
