import ChatScreen from '../../src/screens/ChatScreen';
import { useLocalSearchParams } from 'expo-router';

export default function Page() { 
    const { id } = useLocalSearchParams();
    return <ChatScreen conversationId={id as string} />; 
}
