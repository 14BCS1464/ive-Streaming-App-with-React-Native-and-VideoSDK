// useAppBackgroundHandler.js
import {useEffect, useRef} from 'react';
import {AppState, BackHandler} from 'react-native';
import {removeParticipantFromMeeting} from '../../utils/meetingService';

const useAppBackgroundHandlerExit = (meetingId, participant, leaveCallback) => {
  const appState = useRef(AppState.currentState);

  // Handle Android back button press
  useEffect(() => {
    const backAction = () => {
      handleLeave();
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [meetingId, participant]);

  // Handle app background state
  useEffect(() => {
    const handleAppStateChange = async nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        await handleLeave();
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
  }, [meetingId, participant]);

  const handleLeave = async () => {
    try {
      if (meetingId && participant) {
        await removeParticipantFromMeeting(meetingId, participant);
      }
      if (leaveCallback) {
        leaveCallback();
      }
    } catch (error) {
      console.error('Error during leave handling:', error);
    }
  };

  return {handleLeave};
};

export default useAppBackgroundHandlerExit;
