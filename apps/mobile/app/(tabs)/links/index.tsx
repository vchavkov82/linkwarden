import { useLinks } from "@linkwarden/router/links";
import { View, StyleSheet, Platform } from "react-native";
import useAuthStore from "@/store/auth";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import Links from "@/components/Links";

export default function LinksScreen() {
  const { auth } = useAuthStore();
  const { search } = useLocalSearchParams<{ search?: string }>();

  const { links, data, omitMedia } = useLinks(
    {
      sort: 0,
      searchQueryString: decodeURIComponent(search ?? ""),
      omitMedia: true,
    },
    auth
  );

  return (
    <View
      style={styles.container}
      className="h-full bg-base-100"
      collapsable={false}
      collapsableChildren={false}
    >
      <Links links={links} data={data} omitMedia={omitMedia} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: Platform.select({
    ios: {
      paddingBottom: 83,
    },
    default: {},
  }),
});
