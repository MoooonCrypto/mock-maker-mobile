import { useState } from 'react';
import { Redirect } from 'expo-router';
import { useEditorStore } from '@/stores/useEditorStore';

export default function HomeScreen() {
  const reset = useEditorStore((s) => s.reset);
  const [editorId] = useState(() => {
    reset();
    return Date.now().toString();
  });

  return <Redirect href={`/editor/${editorId}`} />;
}
