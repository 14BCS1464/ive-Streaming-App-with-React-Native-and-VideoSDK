import {
  fontSize,
  moderateScale,
  verticalScale,
} from '../../constants/dimensions';
import React, {useEffect, useRef} from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Easing,
} from 'react-native';

const LiveButton = ({
  onPress,
  bottom = 20,
  blinkSpeed = 1000,
  backgroundColor = '#FF0000',
  textColor = '#FFFFFF',
  withPulse = true,
}) => {
  // Animation values
  const blinkAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Blinking animation
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: blinkSpeed,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 0.4,
          duration: blinkSpeed,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    // Optional pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: blinkSpeed * 1.5,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: blinkSpeed * 1.5,
          useNativeDriver: true,
        }),
      ]),
    );

    blink.start();
    if (withPulse) pulse.start();

    return () => {
      blink.stop();
      pulse.stop();
    };
  }, [blinkSpeed, withPulse]);

  const opacityInterpolation = blinkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={[styles.container, {bottom}]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.touchable}>
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor,
              opacity: opacityInterpolation,
              transform: [{scale: withPulse ? pulseAnim : 1}],
            },
          ]}>
          <Text style={[styles.text, {color: textColor}]}>Live</Text>
          <View style={[styles.dot, {backgroundColor: textColor}]} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    top: verticalScale(15),
    marginHorizontal: 5,
    alignSelf: 'center',
    marginRight: 10,
  },
  touchable: {
    borderRadius: moderateScale(20),
  },
  button: {
    paddingHorizontal: moderateScale(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    fontWeight: 'bold',
    fontSize: fontSize(10),
    marginRight: verticalScale(6),
  },
  dot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: 4,
  },
});

export default LiveButton;
