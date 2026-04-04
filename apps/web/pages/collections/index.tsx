import CollectionCard from "@/components/CollectionCard";
import { ReactElement, useMemo, useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { useSession } from "next-auth/react";
import SortDropdown from "@/components/SortDropdown";
import { Sort } from "@linkwarden/types/global";
import NewCollectionModal from "@/components/ModalContent/NewCollectionModal";
import PageHeader from "@/components/PageHeader";
import getServerSideProps from "@/lib/client/getServerSideProps";
import { useTranslation } from "next-i18next";
import { useCollections } from "@linkwarden/router/collections";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NextPageWithLayout } from "../_app";
import { useCollectionsLayout } from "@/hooks/useCollectionsLayout";
import CollectionsViewToggle from "@/components/CollectionsViewToggle";

const Page: NextPageWithLayout = () => {
  const { t } = useTranslation();
  const { data: collections = [], isLoading } = useCollections();
  const [sortBy, setSortBy] = useState<Sort>(Sort.DateNewestFirst);
  const [collectionsLayout, setCollectionsLayout] = useCollectionsLayout();

  const { data } = useSession();

  const sortKey: Sort =
    typeof sortBy === "string" ? (Number(sortBy) as Sort) : sortBy;

  const compare = useMemo(() => {
    switch (sortKey) {
      case Sort.NameAZ:
        return (a: any, b: any) => a.name.localeCompare(b.name);
      case Sort.NameZA:
        return (a: any, b: any) => b.name.localeCompare(a.name);
      case Sort.DateOldestFirst:
        return (a: any, b: any) =>
          new Date(a.createdAt as string).getTime() -
          new Date(b.createdAt as string).getTime();
      case Sort.DateNewestFirst:
      default:
        return (a: any, b: any) =>
          new Date(b.createdAt as string).getTime() -
          new Date(a.createdAt as string).getTime();
    }
  }, [sortKey]);

  const sortedCollections = useMemo(
    () => [...collections].sort(compare),
    [collections, compare]
  );

  const [newCollectionModal, setNewCollectionModal] = useState(false);

  return (
    <div className="p-3 flex flex-col gap-5 w-full h-full">
      <div className="flex justify-between">
        <div className="flex items-center gap-3">
          <PageHeader
            icon={"bi-folder"}
            title={t("collections")}
            description={t("collections_you_own")}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNewCollectionModal(true)}
                >
                  <i className="bi-plus-lg text-xl text-neutral"></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t("new_collection")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex gap-3 justify-end items-center">
          <CollectionsViewToggle
            layout={collectionsLayout}
            setLayout={setCollectionsLayout}
          />
          <div className="relative mt-2">
            <SortDropdown sortBy={sortBy} setSort={setSortBy} t={t} />
          </div>
        </div>
      </div>

      {!isLoading && collections && !collections[0] ? (
        <div
          style={{ flex: "1 1 auto" }}
          className="flex flex-col gap-2 justify-center h-full w-full mx-auto p-10"
        >
          <p className="text-center text-xl">
            {t("create_your_first_collection")}
          </p>
          <p className="text-center mx-auto max-w-96 w-fit text-neutral text-sm">
            {t("create_your_first_collection_desc")}
          </p>
          <Button
            className="mx-auto mt-5"
            variant={"accent"}
            onClick={() => setNewCollectionModal(true)}
          >
            <i className="bi-plus-lg text-xl mr-2" />
            {t("new_collection")}
          </Button>
        </div>
      ) : collectionsLayout === "list" ? (
        <div className="flex flex-col gap-1 w-full max-w-4xl">
          {sortedCollections
            .filter((e) => e.ownerId === data?.user.id && e.parentId === null)
            .map((e) => (
              <CollectionCard key={e.id} collection={e} variant="list" />
            ))}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 py-3 rounded-md border border-dashed border-neutral-content hover:bg-base-200/80 dark:hover:bg-base-200/40 duration-200 text-neutral"
            onClick={() => setNewCollectionModal(true)}
          >
            <i className="bi-plus-lg text-primary text-xl" />
            <span className="text-sm font-medium">{t("new_collection")}</span>
          </button>
        </div>
      ) : (
        <div className="grid 2xl:grid-cols-4 xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3">
          {sortedCollections
            .filter((e) => e.ownerId === data?.user.id && e.parentId === null)
            .map((e) => (
              <CollectionCard key={e.id} collection={e} />
            ))}

          <div
            className="card card-compact shadow-md hover:shadow-none duration-200 border border-neutral-content p-5 bg-base-200 self-stretch min-h-[12rem] rounded-xl cursor-pointer flex flex-col gap-4 justify-center items-center group"
            onClick={() => setNewCollectionModal(true)}
          >
            <p className="group-hover:opacity-0 duration-100">
              {t("new_collection")}
            </p>
            <i className="bi-plus-lg text-5xl group-hover:text-7xl group-hover:-mt-10 text-primary drop-shadow duration-100"></i>
          </div>
        </div>
      )}

      {sortedCollections.filter((e) => e.ownerId !== data?.user.id)[0] && (
        <>
          <PageHeader
            icon={"bi-folder"}
            title={t("other_collections")}
            description={t("other_collections_desc")}
          />

          <div
            className={
              collectionsLayout === "list"
                ? "flex flex-col gap-1 w-full max-w-4xl"
                : "grid 2xl:grid-cols-4 xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5"
            }
          >
            {sortedCollections
              .filter((e) => e.ownerId !== data?.user.id)
              .map((e) => (
                <CollectionCard
                  key={e.id}
                  collection={e}
                  variant={collectionsLayout === "list" ? "list" : "card"}
                />
              ))}
          </div>
        </>
      )}
      {newCollectionModal && (
        <NewCollectionModal onClose={() => setNewCollectionModal(false)} />
      )}
    </div>
  );
};

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

export default Page;

export { getServerSideProps };
