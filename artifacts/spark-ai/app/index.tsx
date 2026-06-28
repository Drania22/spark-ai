import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootIndex() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#212121" }}>
        <ActivityIndicator color="#4285F4" size="large" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(home)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
