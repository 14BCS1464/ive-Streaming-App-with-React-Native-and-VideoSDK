import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  Dimensions,
} from 'react-native';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  Constants,
  register,
  RTCView,
} from '@videosdk.live/react-native-sdk';
import {authToken} from '../../apiServices/api';
import {
  addInPremiumMember,
  addParticipantToMeeting,
  getActiveMeetings,
  isMemberPremiumByAccessToken,
  listenForMeetingEnd,
  removeParticipantFromMeeting,
} from '../../utils/meetingService';
import {goBack} from '../../navigator/rootNavigatorRef';
import commonToast from '../../utils/commonToast';
import {useSelector} from 'react-redux';
import useAppBackgroundHandler from './useAppBackgroundHandler';
import useAppBackgroundHandlerExit from './useAppBackgroundHandlerExit';
import {colors} from 'constants';
import PremiumMembershipModal from './PremiumMembershipModal';

// Register VideoSDK
register();

// Request permissions
async function requestPermissions() {
  if (Platform.OS === 'android') {
    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      return (
        grants['android.permission.CAMERA'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        grants['android.permission.RECORD_AUDIO'] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
}

// Participant Component
function Participant({participantId}) {
  const {webcamStream, webcamOn, displayName} = useParticipant(participantId);
  return (
    <View style={styles.participantContainer}>
      {webcamOn && webcamStream ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
          objectFit={'cover'}
          style={styles.video}
        />
      ) : (
        <View style={styles.noVideo}>
          <Text style={styles.noVideoText}>{displayName || 'Participant'}</Text>
        </View>
      )}
    </View>
  );
}

// Reactions Component
function Reactions({onReaction}) {
  const reactions = ['❤️', '👍', '😂', '🤩'];
  return (
    <View style={styles.reactionContainer}>
      {reactions.map((reaction, index) => (
        <TouchableOpacity
          key={index}
          style={styles.reactionButton}
          onPress={() => onReaction(reaction)}>
          <Text style={styles.reactionText}>{reaction}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Join Screen
function JoinView({initializeStream}) {
  const [modalVisible, setModalVisible] = useState(false);
  const userInfo = useSelector((state: any) => state.loginReducers.loginData);
  const handleAction = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;
    try {
      const meeting = await getActiveMeetings();
      await initializeStream(meeting[0].meetingId);

      await addParticipantToMeeting(
        meeting[0].meetingId,
        userInfo['member-token'],
      );
    } catch (err) {
      alert(err);
    }
  };
  useEffect(() => {
    //  alert(JSON.stringify(userInfo['member-token'].isCoach));
    checkPremiumStatus();
  }, []);
  const checkPremiumStatus = async () => {
    const isPremium = await isMemberPremiumByAccessToken(
      userInfo['access-token'],
    );
    setModalVisible(!isPremium);
  };
  const close = () => {
    goBack();
  };
  const onBuyNow = async () => {
    await addInPremiumMember(userInfo);
    checkPremiumStatus();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Stream</Text>
      <TouchableOpacity style={styles.joinButton} onPress={handleAction}>
        <Text style={styles.buttonText}>Join Stream</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.joinButton, {}]}
        onPress={() => goBack()}>
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>

      <PremiumMembershipModal
        visible={modalVisible}
        onClose={close}
        onBuyNow={onBuyNow}
      />
    </View>
  );
}

const leaveMeatingWhenBack = () => {};
// Live Stream Container
function LSContainer({streamId, onLeave}) {
  const [joined, setJoined] = useState(false);
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width < Dimensions.get('window').height
      ? 'portrait'
      : 'landscape',
  );

  useEffect(() => {
    const updateOrientation = ({window}) => {
      setOrientation(window.width < window.height ? 'portrait' : 'landscape');
    };

    const subscription = Dimensions.addEventListener(
      'change',
      updateOrientation,
    );

    return () => {
      subscription?.remove();
    };
  }, []);
  const userInfo = useSelector((state: any) => state.loginReducers.loginData);

  const {handleLeave} = useAppBackgroundHandlerExit(
    streamId,
    userInfo['member-token'],
    async () => {
      onLeave;
      goBack();
      await removeParticipantFromMeeting(streamId, userInfo['member-token']);
    },
  );
  const {join} = useMeeting({
    onMeetingJoined: () => setJoined(true),
    onMeetingLeft: handleLeave,
    onError: error => Alert.alert('Error', error.message),
  });

  return (
    <View
      style={[
        styles.fullScreenContainer,
        orientation === 'landscape' && styles.landscapeContainer,
      ]}>
      {joined ? (
        <StreamView orientation={orientation} />
      ) : (
        <View
          style={[
            styles.joinContainer,
            orientation === 'landscape' && styles.landscapeJoinContainer,
          ]}>
          <Text style={styles.streamIdText}>Stream ID: {streamId}</Text>
          <TouchableOpacity style={styles.joinButton} onPress={join}>
            <Text style={styles.buttonText}>Start Streaming</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Stream View
function StreamView({orientation}) {
  const {participants} = useMeeting();
  const participantId = Array.from(participants.keys()).find(
    participantId =>
      participants.get(participantId).mode === Constants.modes.SEND_AND_RECV,
  );

  const handleReaction = reaction => {
    console.log(`Reaction: ${reaction}`);
  };

  return (
    <View style={styles.streamView}>
      {participantId ? <Participant participantId={participantId} /> : null}
      <Reactions onReaction={handleReaction} />
      <LSControls orientation={orientation} />
    </View>
  );
}

// Live Stream Controls
function LSControls({orientation}) {
  const {leave, toggleMic, toggleWebcam, end} = useMeeting();

  return (
    <View
      style={[
        styles.controls,
        orientation === 'landscape' && styles.landscapeControls,
      ]}>
      <TouchableOpacity style={styles.controlButton} onPress={leave}>
        <Text style={styles.controlText}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

// Main App Component
function ParentViewer() {
  const [streamId, setStreamId] = useState(null);

  const initializeStream = async () => {
    try {
      const meeting = await getActiveMeetings();
      setStreamId(meeting[0].meetingId);

      listenForMeetingEnd(meeting[0].meetingId, () => {
        setStreamId(null);
        goBack();
        commonToast.showToast(' Ended by the host.');
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to join stream');
      console.error(error);
    }
  };

  const onStreamLeave = () => setStreamId(null);

  if (!authToken) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Missing Auth Token</Text>
      </SafeAreaView>
    );
  }

  return streamId ? (
    <MeetingProvider
      config={{
        meetingId: streamId,
        micEnabled: false,
        webcamEnabled: false,
        name: 'User',
        mode: Constants.modes.RECV_ONLY,
        cameraConfig: {
          facingMode: 'environment',
          aspectRatio: 16 / 9,
        },
      }}
      token={authToken}>
      <LSContainer streamId={streamId} onLeave={onStreamLeave} />
    </MeetingProvider>
  ) : (
    <JoinView initializeStream={initializeStream} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C2526',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#1C2526',
  },
  landscapeContainer: {
    flexDirection: 'row',
  },
  joinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeJoinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  joinButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 3,
    margin: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  streamIdText: {
    fontSize: 16,
    color: '#A3BFFA',
    textAlign: 'center',
    marginVertical: 20,
  },
  streamView: {
    flex: 1,
    width: '100%',
  },
  participantContainer: {
    flex: 1,
    backgroundColor: '#2D3748',
  },
  video: {
    flex: 1,
  },
  noVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A5568',
  },
  noVideoText: {
    fontSize: 18,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  reactionContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
  },
  reactionButton: {
    padding: 10,
    marginHorizontal: 8,
    backgroundColor: 'rgba(74, 85, 104, 0.7)',
    borderRadius: 8,
  },
  reactionText: {
    fontSize: 22,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  landscapeControls: {
    right: 0,
    left: 'auto',
    width: 100,
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 30,
  },
  controlButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    elevation: 2,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 20,
    color: '#FF6B6B',
    marginTop: 100,
  },
});

export default ParentViewer;
