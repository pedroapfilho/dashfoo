"use client";

import { useStaticSearch } from "fumadocs-core/search/client/orama-static";
import type { SharedProps } from "fumadocs-ui/components/dialog/search";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import type { ReactNode } from "react";

const DocsSearchDialog = (props: SharedProps): ReactNode => {
  const { data, isLoading, onSearchChange, search } = useStaticSearch();

  return (
    <SearchDialog isLoading={isLoading} onSearchChange={onSearchChange} search={search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={data ? data.items : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
};

export { DocsSearchDialog };
