import {useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {endMeetingInFirebase} from '../../utils/meetingService';

const useAppBackgroundHandler = meetingId => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        endMeetingInFirebase(meetingId);
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [meetingId]);
};

export default useAppBackgroundHandler;
