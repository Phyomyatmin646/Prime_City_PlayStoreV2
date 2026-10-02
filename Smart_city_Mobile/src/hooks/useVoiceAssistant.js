import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { showPrimeAlert } from '../services/primeAlert';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { sendVoiceMessage } from '../services/chatService';

const audioRecorderPlayer = new AudioRecorderPlayer();
audioRecorderPlayer.setSubscriptionDuration(0.1);

export default function useVoiceAssistant({
  onVoiceResponse,
  onError,
} = {}) {
  const [listening, setListening] = useState(false);
  const voiceAvailable = true;
  const [voiceError, setVoiceError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioRecorderPlayer.stopRecorder().catch(() => {});
      audioRecorderPlayer.stopPlayer().catch(() => {});
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        if (
          grants['android.permission.RECORD_AUDIO'] ===
          PermissionsAndroid.RESULTS.GRANTED
        ) {
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const startListening = useCallback(async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      showPrimeAlert('Permission Denied', 'Please grant microphone access to use voice chat.');
      return;
    }

    try {
      if (isPlaying) {
        await audioRecorderPlayer.stopPlayer();
        if (mountedRef.current) setIsPlaying(false);
      }

      const path = Platform.select({
        ios: 'temp_record.m4a',
        android: `${RNFS.CachesDirectoryPath}/temp_record.mp4`,
      });

      await audioRecorderPlayer.startRecorder(path);
      if (mountedRef.current) {
        setListening(true);
        setVoiceError('');
      }
    } catch (err) {
      if (mountedRef.current) {
        setVoiceError(err.message);
        setListening(false);
      }
    }
  }, [isPlaying]);

  const stopListening = useCallback(async () => {
    try {
      const resultPath = await audioRecorderPlayer.stopRecorder();
      if (mountedRef.current) setListening(false);

      // Read the recorded file and convert to base64
      const base64 = await RNFS.readFile(resultPath, 'base64');
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

      try {
        const res = await sendVoiceMessage({ audioBase64: base64, mimeType });
        
        if (onVoiceResponse && mountedRef.current) {
          onVoiceResponse(res);
        }

        // Play the AI response
        if (res.audioBase64) {
          await playBase64Audio(res.audioBase64, res.audioMimeType);
        }
      } catch (apiErr) {
        if (onError && mountedRef.current) onError(apiErr.message);
      }
    } catch (err) {
      if (mountedRef.current) {
        setListening(false);
        setVoiceError(err.message);
      }
    }
  }, [onVoiceResponse, onError]);

  const playBase64Audio = async (base64String, mimeType = 'audio/wav') => {
    try {
      const ext = mimeType === 'audio/mp3' ? 'mp3' : 'wav';
      const path = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/ai_response.${ext}`,
        android: `${RNFS.CachesDirectoryPath}/ai_response.${ext}`,
      });

      await RNFS.writeFile(path, base64String, 'base64');

      await audioRecorderPlayer.startPlayer(path);
      if (mountedRef.current) setIsPlaying(true);

      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration || e.currentPosition < 0) {
          audioRecorderPlayer.stopPlayer();
          if (mountedRef.current) setIsPlaying(false);
          audioRecorderPlayer.removePlayBackListener();
        }
      });
    } catch (err) {
      console.warn('Playback error', err);
      if (mountedRef.current) setIsPlaying(false);
    }
  };

  const stopSpeaking = useCallback(async () => {
    try {
      if (isPlaying) {
        await audioRecorderPlayer.stopPlayer();
        if (mountedRef.current) setIsPlaying(false);
      }
    } catch (e) {}
  }, [isPlaying]);

  return {
    listening,
    voiceAvailable,
    voiceError,
    startListening,
    stopListening,
    stopSpeaking,
    isPlaying,
  };
}
