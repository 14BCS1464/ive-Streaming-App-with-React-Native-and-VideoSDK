import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const PremiumMembershipModal = ({visible, onClose, onBuyNow}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Premium Membership Required</Text>
          <Text style={styles.modalText}>
            Please buy a premium membership to watch their live performance.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buyButton]}
              onPress={onBuyNow}>
              <Text style={styles.buttonText}>Buy Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: windowWidth * 0.85, // 85% of screen width
    maxWidth: 400, // Maximum width for larger screens
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22, // Better readability
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: '45%',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default PremiumMembershipModal;
