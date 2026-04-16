import {
  View,
  FlatList,
  Text,
  ActivityIndicator,
  ViewToken,
} from "react-native";
import LinkListing from "@/components/LinkListing";
import React, { useCallback, useMemo, useState } from "react";
import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types";
import Spinner from "@/components/ui/Spinner";
import { rawTheme, ThemeName } from "@/lib/colors";
import { useColorScheme } from "nativewind";
import {
  LinkPreviewThumbContext,
  type LinkPreviewThumbContextValue,
} from "./LinkPreviewThumbContext";

const RenderItem = React.memo(
  ({ item }: { item: LinkIncludingShortenedCollectionAndTags }) => {
    return <LinkListing link={item} />;
  }
);

type Props = {
  links: LinkIncludingShortenedCollectionAndTags[];
  data: any;
  omitMedia?: boolean;
};

export default function Links({ links, data, omitMedia }: Props) {
  const { colorScheme } = useColorScheme();
  const [promptedRefetch, setPromptedRefetch] = useState(false);
  const [thumbReadyIds, setThumbReadyIds] = useState(() => new Set<number>());

  const isArchiveThumbReady = useCallback(
    (linkId: number) => thumbReadyIds.has(linkId),
    [thumbReadyIds]
  );

  const previewThumbContext = useMemo<LinkPreviewThumbContextValue>(
    () => ({
      deferArchiveThumbnails: true,
      isArchiveThumbReady,
    }),
    [isArchiveThumbReady]
  );

  return data.isLoading ? (
    <View className="flex justify-center h-screen items-center">
      <ActivityIndicator size="large" />
      <Text className="text-base mt-2.5 text-neutral">Loading...</Text>
    </View>
  ) : (
    <LinkPreviewThumbContext.Provider value={previewThumbContext}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={() => <></>}
        data={links || []}
        refreshControl={
          <Spinner
            refreshing={data.isRefetching && promptedRefetch}
            onRefresh={async () => {
              setPromptedRefetch(true);
              await data.refetch();
              setPromptedRefetch(false);
            }}
            progressBackgroundColor={
              rawTheme[colorScheme as ThemeName]["base-200"]
            }
            colors={[rawTheme[colorScheme as ThemeName]["base-content"]]}
          />
        }
        refreshing={data.isRefetching && promptedRefetch}
        initialNumToRender={4}
        keyExtractor={(item) => item.id?.toString() || ""}
        renderItem={({ item }) => (
          <RenderItem item={item} key={item.id?.toString()} />
        )}
        onEndReached={() => data.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => (
          <View className="bg-neutral-content h-px" />
        )}
        ListEmptyComponent={
          <View className="flex justify-center py-10 items-center">
            <Text className="text-center text-xl text-neutral">
              Nothing found...
            </Text>
          </View>
        }
        onViewableItemsChanged={({
          viewableItems,
        }: {
          viewableItems: ViewToken[];
        }) => {
          setThumbReadyIds((prev) => {
            const next = new Set(prev);
            let changed = false;
            for (const v of viewableItems) {
              const id = (v.item as LinkIncludingShortenedCollectionAndTags).id;
              if (id != null && !next.has(id)) {
                next.add(id);
                changed = true;
              }
            }
            return changed ? next : prev;
          });

          if (omitMedia) return;

          const viewableLinks = viewableItems.map(
            (e) => e.item
          ) as LinkIncludingShortenedCollectionAndTags[];

          if (
            !data.isRefetching &&
            viewableLinks.some((e) => e.id && !e.preview)
          )
            data.refetch();
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
    </LinkPreviewThumbContext.Provider>
  );
}
