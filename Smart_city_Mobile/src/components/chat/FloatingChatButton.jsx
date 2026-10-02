import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUTTON_SIZE = 58;
const BOB_DISTANCE = 8;
const BOB_DURATION = 1800;

export default function FloatingChatButton({
  onPress,
  visible = true,
  bottomOffset = 70, // default distance from bottom
  footerHeight = 56, // your tab/footer height, adjust as needed
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // combine safe-area bottom inset + footer height + offset
  const bottomPos = bottomOffset + footerHeight + insets.bottom;

  const bobAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return undefined;

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const shadowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    bobLoop.start();
    shadowLoop.start();

    return () => {
      bobLoop.stop();
      shadowLoop.stop();
    };
  }, [visible, bobAnim, shadowAnim]);

  const translateY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -BOB_DISTANCE],
  });

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.52],
  });

  const shadowRadius = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 14],
  });

  const elevation = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 10],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: bottomPos }]}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Animated.View
          style={[
            styles.shadowLayer,
            {
              backgroundColor: theme.primary,
              opacity: shadowOpacity,
              shadowColor: theme.primary,
              shadowOpacity,
              shadowRadius,
              elevation,
            },
          ]}
        />

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole="button"
            accessibilityLabel="Open AI assistant chat"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={26}
              color={theme.primaryText}
            />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowLayer: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    shadowOffset: { width: 0, height: 6 },
    ...Platform.select({
      android: { elevation: 6 },
      ios: {},
    }),
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.95,
  },
});
