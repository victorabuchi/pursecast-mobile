import { StyleSheet, View } from 'react-native';
import Calculator from './Calculator';
import NoteWindow from './NoteWindow';

// The floating tools sit over every screen without blocking what is under them.
export default function ToolsHost() {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Calculator />
      <NoteWindow />
    </View>
  );
}
