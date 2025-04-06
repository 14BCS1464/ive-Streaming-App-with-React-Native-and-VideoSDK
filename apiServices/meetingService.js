import firestore from "@react-native-firebase/firestore";

export const addMeetingToFirebase = async (meetingData) => {
  try {
    const meetingRef = await firestore()
      .collection("meetings")
      .add({
        meetingId: meetingData,
        title: meetingData.title || "Coaching Session",
        startTime: firestore.FieldValue.serverTimestamp(),
        coachName: meetingData.coachName || "Coach",
        isLive: true,
        participants: [],
        status: "active",
      });
    return meetingRef.id;
  } catch (error) {
    console.error("Error adding meeting: ", error);
    throw error;
  }
};

export const endMeetingInFirebase = async (meetingId) => {
  try {
    const querySnapshot = await firestore()
      .collection("meetings")
      .where("meeting met", "==", meetingId)
      .get();

    if (!querySnapshot.empty) {
      const docId = querySnapshot.docs[0].id;
      await firestore().collection("meetings").doc(docId).update({
        endTime: firestore.FieldValue.serverTimestamp(),
        isLive: false,
        status: "ended",
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error ending meeting: ", error);
    throw error;
  }
};

export const getActiveMeetings = async () => {
  try {
    const snapshot = await firestore()
      .collection("meetings")
      .where("isLive", "==", true)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting active meetings: ", error);
    throw error;
  }
};

export const addParticipantToMeeting = async (meetingId, participant) => {
  try {
    const querySnapshot = await firestore()
      .collection("meetings")
      .where("meetingId", "==", meetingId)
      .get();

    if (!querySnapshot.empty) {
      const docId = querySnapshot.docs[0].id;
      await firestore()
        .collection("meetings")
        .doc(docId)
        .update({
          participants: firestore.FieldValue.arrayUnion(participant),
        });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding participant: ", error);
    throw error;
  }
};
