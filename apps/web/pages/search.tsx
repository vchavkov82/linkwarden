import { useLinks } from "@linkwarden/router/links";
import useLocalSettingsStore from "@/store/localSettings";
import MainLayout from "@/layouts/MainLayout";
import {
  LinkIncludingShortenedCollectionAndTags,
  Sort,
  ViewMode,
} from "@linkwarden/types/global";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LinkListOptions from "@/components/LinkListOptions";
import getServerSideProps from "@/lib/client/getServerSideProps";
import { useTranslation } from "next-i18next";
import Links from "@/components/LinkViews/Links";
import { NextPageWithLayout } from "./_app";

const Page: NextPageWithLayout = () => {
  const { t } = useTranslation();
  const {
    settings: { show },
  } = useLocalSettingsStore();

  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem("viewMode") as ViewMode) || ViewMode.List
  );

  const [sortBy, setSortBy] = useState<Sort>(
    Number(localStorage.getItem("sortBy")) ?? Sort.DateNewestFirst
  );

  const [editMode, setEditMode] = useState(false);
  const [activeLink, setActiveLink] =
    useState<LinkIncludingShortenedCollectionAndTags | null>(null);

  useEffect(() => {
    if (editMode) return setEditMode(false);
  }, [editMode, router]);

  const searchQuery = router.query.q
    ? decodeURIComponent(router.query.q as string)
    : undefined;

  const { links, data } = useLinks({
    sort: sortBy,
    searchQueryString: searchQuery,
    omitMedia: !show.image,
  });

  return (
    <div className="p-3 flex flex-col gap-5 w-full h-full">
      <LinkListOptions
        t={t}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        editMode={editMode}
        setEditMode={setEditMode}
        links={links}
      >
        <PageHeader icon={"bi-search"} title={t("search_results")} />
      </LinkListOptions>

      {!data.isLoading && links && !links[0] && <p>{t("nothing_found")}</p>}
      <Links
        editMode={editMode}
        links={links}
        layout={viewMode}
        useData={data}
      />
    </div>
  );
};

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

export default Page;

export { getServerSideProps };
