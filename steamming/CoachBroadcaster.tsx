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
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  Constants,
  register,
  RTCView,
} from '@videosdk.live/react-native-sdk';
import {authToken, createStream} from '../../apiServices/api';
import {goBack} from '../../navigator/rootNavigatorRef';
import {colors} from '../../constants';
import {
  addMeetingToFirebase,
  endMeetingInFirebase,
  setupMeetingParticipantsListener,
} from '../../utils/meetingService';
import useAppBackgroundHandler from './useAppBackgroundHandler';

// Register VideoSDK
register();

const {width, height} = Dimensions.get('window');

async function requestPermissions() {
  if (Platform.OS === 'android') {
    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      if (
        grants['android.permission.CAMERA'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        grants['android.permission.RECORD_AUDIO'] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        return true;
      } else {
        Alert.alert(
          'Permissions required',
          'Camera and microphone permissions are required',
        );
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
}

function Participant({participantId, isLocal = false, participants = []}) {
  const {webcamStream, webcamOn} = useParticipant(participantId);

  return (
    <View style={styles.fullScreenContainer}>
      {webcamOn && webcamStream ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
          objectFit={'cover'}
          style={styles.portraitVideo}
          mirror={isLocal && Platform.OS === 'ios'}
        />
      ) : (
        <View style={styles.noVideo}>
          <Text style={styles.noVideoText}>Camera is off</Text>
        </View>
      )}

      {/* Participants Overlay */}
      <View style={styles.participantsOverlay}>
        <Text style={styles.participantsTitle}>
          Viewers ({participants.length})
        </Text>
        <View style={styles.participantsList}>
          {participants.slice(0, 5).map((p, index) => (
            <View key={`${p.id}-${index}`} style={styles.participantBadge}>
              <Text style={styles.participantName}>{p.memberName || 'U'}</Text>
            </View>
          ))}
          {participants.length > 5 && (
            <View style={styles.moreBadge}>
              <Text style={styles.moreText}>+{participants.length - 5}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function JoinScreen({onStartStream}) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      setLoading(false);
      return;
    }
    await onStartStream();
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.joinContainer}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.joinContent}>
        <Text style={styles.joinTitle}>Start Your Live Broadcast</Text>
        <TouchableOpacity
          style={[styles.startButton, loading && styles.disabledButton]}
          onPress={handleStart}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.startButtonText}>GO LIVE</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.startButton,
            {marginTop: 10, backgroundColor: colors.NO},
          ]}
          onPress={goBack}>
          <Text style={styles.startButtonText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function LiveSessionScreen({streamId, onEndSession}) {
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const unsubscribe = setupMeetingParticipantsListener(
      streamId,
      participants => {
        setParticipants(participants);
      },
    );
    return () => unsubscribe();
  }, [streamId]);

  const {join, leave, toggleMic, toggleWebcam, meeting} = useMeeting({
    onMeetingJoined: () => setJoined(true),
    onMeetingLeft: onEndSession,
    onError: error => Alert.alert('Error', error.message),
  });

  const localParticipant = meeting?.localParticipant;

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar hidden />

      {joined ? (
        <>
          <View style={styles.sessionHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{`Live: ${streamId}`}</Text>
            </View>
          </View>

          <Participant
            participantId={localParticipant?.id}
            isLocal
            participants={participants}
          />

          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => toggleMic()}>
              <Text style={styles.controlText}>
                {localParticipant?.micOn ? 'MUTE' : 'UNMUTE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => toggleWebcam()}>
              <Text style={styles.controlText}>
                {localParticipant?.webcamOn ? 'CAMERA OFF' : 'CAMERA ON'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.endButton]}
              onPress={() => leave()}>
              <Text style={styles.controlText}>END LIVE</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.joinOverlay}>
          <Text style={styles.streamId}>Stream ID: {streamId}</Text>
          <TouchableOpacity style={styles.joinButton} onPress={join}>
            <Text style={styles.joinButtonText}>START BROADCAST</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CoachBroadcaster(props) {
  const {program} = props.route.params;
  const [streamId, setStreamId] = useState(null);

  useAppBackgroundHandler(streamId);

  const startStream = async () => {
    try {
      const newStreamId = await createStream({token: authToken});
      await addMeetingToFirebase(newStreamId, props.route.params);
      setStreamId(newStreamId);
    } catch (error) {
      Alert.alert('Error', 'Failed to create stream');
      console.error(error);
    }
  };

  const endStream = () => {
    endMeetingInFirebase(streamId);
    setStreamId(null);
  };

  if (!authToken) {
    return (
      <View style={styles.container}>
        <Text>Missing authentication token</Text>
      </View>
    );
  }

  return streamId ? (
    <MeetingProvider
      config={{
        meetingId: streamId,
        micEnabled: true,
        webcamEnabled: true,
        name: program,
        mirror: false,
        defaultCamera: 'back',
        mode: Constants.modes.SEND_AND_RECV,
        orientation: 'portrait',
        cameraConfig: {
          facingMode: 'environment',
          resolution: 'high',
          frameRate: 30,
        },
      }}
      token={authToken}>
      <LiveSessionScreen streamId={streamId} onEndSession={endStream} />
    </MeetingProvider>
  ) : (
    <JoinScreen onStartStream={startStream} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  portraitVideo: {
    width: '100%',
    height: '100%',
  },
  noVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  noVideoText: {
    color: 'white',
    fontSize: 18,
  },
  joinContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  joinContent: {
    alignItems: 'center',
    padding: 24,
  },
  joinTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: colors.THEME_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  sessionHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3e4d',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  liveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  endButton: {
    backgroundColor: 'rgba(255,0,0,0.7)',
  },
  controlText: {
    color: 'white',
    fontWeight: 'bold',
  },
  joinOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  streamId: {
    color: 'white',
    fontSize: 16,
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: '#ff3e4d',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  participantsOverlay: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
  },
  participantsTitle: {
    color: 'white',
    fontSize: 12,
    marginBottom: 5,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 150,
  },
  participantBadge: {
    borderRadius: 15,
    // backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  participantName: {
    color: 'white',
    fontWeight: 'bold',
  },
  moreBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  moreText: {
    color: 'white',
    fontSize: 12,
  },
});

export default CoachBroadcaster;
